#!/usr/bin/env node

/**
 * Link Agave plant detailSections to gallery items via galleryKey.
 * 
 * This script:
 * 1. Finds the Agave plant by slug "agave"
 * 2. Reads gallery[] items with _key and asset._ref
 * 3. Reads detailSections[] items with _key, title, description, image.asset._ref
 * 4. For each gallery item, finds the best matching detailSection by comparing asset._ref
 * 5. Sets detailSection.galleryKey = galleryItem._key for the chosen match
 * 
 * Matching strategy:
 * - Match by asset._ref
 * - If multiple detailSections match the same asset, prefer:
 *   1. Most specific title (not just "Agave")
 *   2. One with non-empty description
 * 
 * Does not create new images, upload, duplicate hero, or reorder arrays.
 * 
 * Usage:
 *   npm run sanity:link-agave-gallery-keys
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'

// Load environment variables from .env.local
config({path: resolve(process.cwd(), '.env.local')})

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local')
  process.exit(1)
}

if (!dataset) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_DATASET in .env.local')
  process.exit(1)
}

if (!token) {
  console.error('❌ Missing SANITY_API_WRITE_TOKEN in .env.local')
  console.error('   Please add your write token to .env.local')
  process.exit(1)
}

// Create Sanity client with write token
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token,
})

const SLUG = 'agave'

/**
 * Scores a detailSection for matching priority:
 * - Higher score = better match
 * - Specific titles (not just "Agave") get higher score
 * - Non-empty descriptions get bonus points
 */
function scoreDetailSection(section: any): number {
  let score = 0
  
  // Prefer specific titles (not just the plant name)
  const title = (section.title || '').toLowerCase()
  if (title !== 'agave' && title.trim().length > 0) {
    score += 10
  }
  
  // Prefer sections with descriptions
  if (section.description && section.description.trim().length > 0) {
    score += 5
  }
  
  return score
}

async function main() {
  console.log(`\n🔍 Linking gallery keys for Agave plant (slug: ${SLUG})...\n`)

  // Fetch the plant document with gallery and detailSections
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      gallery[]{
        _key,
        asset->{
          _id,
          _ref,
          originalFilename
        }
      },
      detailSections[]{
        _key,
        key,
        title,
        description,
        galleryKey,
        image{
          asset->{
            _id,
            _ref
          }
        }
      }
    }`,
    {slug: SLUG}
  )

  if (!plant) {
    console.error(`❌ Plant document with slug "${SLUG}" not found`)
    process.exit(1)
  }

  if (plant._type !== 'plant') {
    console.error(`❌ Document is not a plant (type: ${plant._type})`)
    process.exit(1)
  }

  console.log(`✅ Found plant: ${plant.title} (ID: ${plant._id})`)
  
  const gallery = plant.gallery || []
  const detailSections = plant.detailSections || []
  
  console.log(`📸 Gallery items: ${gallery.length}`)
  console.log(`📝 Detail sections: ${detailSections.length}`)

  // Build a map of asset._ref -> detailSections that use it
  const sectionsByAssetRef = new Map<string, any[]>()
  
  detailSections.forEach((section: any) => {
    const assetRef = section?.image?.asset?._ref || section?.image?.asset?._id
    if (!assetRef) return
    
    if (!sectionsByAssetRef.has(assetRef)) {
      sectionsByAssetRef.set(assetRef, [])
    }
    sectionsByAssetRef.get(assetRef)!.push(section)
  })

  // Build a map of gallery item _key -> best matching detailSection
  const galleryKeyToDetailSection = new Map<string, any>()
  const matchedSections = new Set<string>() // Track which sections have been matched
  
  gallery.forEach((galleryItem: any) => {
    const galleryKey = galleryItem._key
    if (!galleryKey) {
      console.log(`⚠️  Gallery item missing _key, skipping`)
      return
    }
    
    const assetRef = galleryItem?.asset?._ref || galleryItem?.asset?._id
    if (!assetRef) {
      console.log(`⚠️  Gallery item ${galleryKey} missing asset reference, skipping`)
      return
    }
    
    // Find matching detailSections
    const matchingSections = sectionsByAssetRef.get(assetRef) || []
    
    if (matchingSections.length === 0) {
      console.log(`   ⚠️  Gallery item ${galleryKey}: no matching detailSection found`)
      return
    }
    
    // If multiple matches, pick the best one by score
    let bestSection = matchingSections[0]
    let bestScore = scoreDetailSection(bestSection)
    
    for (let i = 1; i < matchingSections.length; i++) {
      const score = scoreDetailSection(matchingSections[i])
      if (score > bestScore) {
        bestSection = matchingSections[i]
        bestScore = score
      }
    }
    
    // Only match if this section hasn't been matched already
    const sectionKey = bestSection._key || bestSection.key
    if (matchedSections.has(sectionKey)) {
      console.log(`   ⚠️  Gallery item ${galleryKey}: best match already linked to another gallery item`)
      return
    }
    
    galleryKeyToDetailSection.set(galleryKey, bestSection)
    matchedSections.add(sectionKey)
    
    console.log(`   ✅ Gallery item ${galleryKey} -> detailSection "${bestSection.title || 'untitled'}"`)
  })

  if (galleryKeyToDetailSection.size === 0) {
    console.log(`\n⚠️  No matches found. Nothing to update.`)
    return
  }

  // Update detailSections with galleryKey
  console.log(`\n🔧 Updating detailSections with galleryKey...`)
  
  const updatedDetailSections = detailSections.map((section: any) => {
    const sectionKey = section._key || section.key
    
    // Find if this section should be linked to a gallery item
    for (const [galleryKey, matchedSection] of galleryKeyToDetailSection.entries()) {
      const matchedSectionKey = matchedSection._key || matchedSection.key
      if (matchedSectionKey === sectionKey) {
        return {
          ...section,
          galleryKey: galleryKey,
        }
      }
    }
    
    // Not matched, return as-is
    return section
  })

  // Patch the document
  console.log(`\n💾 Updating plant document...`)
  try {
    await client
      .patch(plant._id)
      .set({detailSections: updatedDetailSections})
      .commit()
    
    console.log(`✅ Document updated successfully`)
  } catch (error) {
    console.error(`\n❌ Error updating document:`, error)
    process.exit(1)
  }

  // Verification: re-fetch and verify
  console.log(`\n🔍 Verifying links...`)
  const verified = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      gallery[]{
        _key,
        asset->{
          _id,
          originalFilename
        }
      },
      detailSections[]{
        _key,
        title,
        galleryKey,
        image{
          asset->{
            _id
          }
        }
      }
    }`,
    {slug: SLUG}
  )

  if (!verified) {
    console.error(`❌ Could not re-fetch document for verification`)
    process.exit(1)
  }

  // Print verification summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('📋 VERIFICATION SUMMARY')
  console.log(`${'='.repeat(60)}`)
  
  const galleryCount = verified.gallery?.length || 0
  const detailSectionsWithKey = verified.detailSections?.filter((s: any) => s.galleryKey) || []
  const galleryItemsWithoutLink: string[] = []
  
  verified.gallery?.forEach((item: any) => {
    const galleryKey = item._key
    if (!galleryKey) return
    
    const hasLink = verified.detailSections?.some((s: any) => s.galleryKey === galleryKey)
    if (!hasLink) {
      galleryItemsWithoutLink.push(galleryKey)
    }
  })
  
  console.log(`📸 Gallery items: ${galleryCount}`)
  console.log(`🔗 Detail sections with galleryKey: ${detailSectionsWithKey.length}`)
  
  if (galleryItemsWithoutLink.length > 0) {
    console.log(`\n⚠️  Gallery items without linked captions: ${galleryItemsWithoutLink.length}`)
    galleryItemsWithoutLink.forEach(key => {
      console.log(`   - ${key}`)
    })
  } else {
    console.log(`\n✅ All gallery items have linked captions!`)
  }

  console.log(`\n✨ Linking complete!\n`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

