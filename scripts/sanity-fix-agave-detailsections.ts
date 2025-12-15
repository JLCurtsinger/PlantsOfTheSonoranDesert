#!/usr/bin/env node

/**
 * Fix Agave plant document's detailSections[] entries that have missing image.asset._ref.
 * 
 * For each broken entry:
 * - If it was meant to point at the hero image (lakeside-agave.jpeg), set its image.asset to the hero image asset _ref
 * - Otherwise, remove the broken detailSections[] item entirely
 * 
 * Usage:
 *   npm run sanity:fix-agave-detailsections
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

async function main() {
  console.log(`\n🔍 Fetching Agave plant document...`)

  // Step 1: Query the plant document with detailSections
  const plant = await client.fetch(
    `*[_type=="plant" && slug.current==$slug][0]{
      _id,
      title,
      "slug": slug.current,
      heroImage{
        asset{
          _ref,
          _id
        }
      },
      detailSections[]{
        _key,
        _type,
        title,
        alt,
        description,
        image{
          crop,
          hotspot,
          asset{
            _ref,
            _id
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

  console.log(`✅ Found plant: ${plant.title} (ID: ${plant._id})`)

  // Step 2: Get hero image asset reference
  const heroImageAssetRef = plant.heroImage?.asset?._ref
  if (!heroImageAssetRef) {
    console.error('❌ Hero image asset reference is missing. Cannot fix broken entries.')
    process.exit(1)
  }

  console.log(`\n🔧 Hero image asset ref: ${heroImageAssetRef}`)

  // Step 3: Identify broken entries and build fixed array
  const detailSections = plant.detailSections || []
  console.log(`\n📋 Found ${detailSections.length} detailSections entries`)

  const fixedDetailSections: Array<any> = []
  let brokenCount = 0
  let fixedCount = 0
  let removedCount = 0

  // Helper function to clean asset reference (remove _id if present)
  const cleanAssetRef = (asset: any): any => {
    if (!asset || !asset._ref) return asset
    return {
      _type: 'reference',
      _ref: asset._ref,
    }
  }

  // Helper function to clean image object
  const cleanImage = (image: any): any => {
    if (!image) return image
    const cleaned: any = {
      _type: 'image',
      asset: cleanAssetRef(image.asset),
    }
    if (image.crop) cleaned.crop = image.crop
    if (image.hotspot) cleaned.hotspot = image.hotspot
    return cleaned
  }

  detailSections.forEach((section: any) => {
    const assetRef = section?.image?.asset?._ref
    
    if (!assetRef) {
      brokenCount++
      console.log(`\n   ❌ Broken entry: _key=${section._key || '(none)'}, title="${section.title || '(no title)'}"`)
      
      // If it has a title, fix it by pointing to hero image
      // Otherwise, remove it
      if (section.title && section.title.trim()) {
        console.log(`   → Fixing: Setting image.asset to hero image asset ref`)
        
        // Build image object, preserving crop and hotspot if present, but only _ref in asset
        const fixedImage: any = {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: heroImageAssetRef,
          },
        }
        
        // Preserve crop and hotspot if present
        if (section.image?.crop) {
          fixedImage.crop = section.image.crop
        }
        if (section.image?.hotspot) {
          fixedImage.hotspot = section.image.hotspot
        }
        
        // Build the fixed section
        const fixedSection: any = {
          _type: section._type || 'detailSection',
          title: section.title,
          alt: section.alt,
          description: section.description,
          image: fixedImage,
        }
        
        // Only include _key if it exists
        if (section._key) {
          fixedSection._key = section._key
        }
        
        fixedDetailSections.push(fixedSection)
        fixedCount++
      } else {
        console.log(`   → Removing: Entry has no title, removing entirely`)
        removedCount++
      }
    } else {
      // Good entry - clean it to remove any _id from asset reference
      const cleanedSection: any = {
        _type: section._type || 'detailSection',
        title: section.title,
        alt: section.alt,
        description: section.description,
        image: cleanImage(section.image),
      }
      
      // Only include _key if it exists
      if (section._key) {
        cleanedSection._key = section._key
      }
      
      fixedDetailSections.push(cleanedSection)
    }
  })

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Good entries: ${detailSections.length - brokenCount}`)
  console.log(`   ❌ Broken entries: ${brokenCount}`)
  console.log(`   🔧 Fixed entries: ${fixedCount}`)
  console.log(`   🗑️  Removed entries: ${removedCount}`)

  if (brokenCount === 0) {
    console.log('\n✨ No broken entries found. Nothing to fix!')
    return
  }

  console.log(`\n📝 Fixed detailSections will have ${fixedDetailSections.length} entries (was ${detailSections.length})`)

  // Step 5: Update the document
  console.log(`\n💾 Updating document...`)
  await client
    .patch(plant._id)
    .set({detailSections: fixedDetailSections})
    .commit()

  console.log('✅ Document updated successfully')

  // Step 6: Verify the fix
  console.log('\n🔍 Verifying update...')
  const verification = await client.fetch(
    `*[_type=="plant" && slug.current==$slug][0]{
      "badDetail": count(coalesce(detailSections, [])[!defined(image.asset._ref)]),
      "goodDetail": count(coalesce(detailSections, [])[defined(image.asset._ref)]),
      "missingTitles": count(coalesce(detailSections, [])[!defined(title) || title == ""]),
      "missingDescriptions": count(coalesce(detailSections, [])[!defined(description) || description == ""])
    }`,
    {slug: SLUG}
  )

  console.log(`\n✅ Verification:`)
  console.log(`   badDetail: ${verification.badDetail} (must be 0)`)
  console.log(`   goodDetail: ${verification.goodDetail}`)
  console.log(`   missingTitles: ${verification.missingTitles}`)
  console.log(`   missingDescriptions: ${verification.missingDescriptions}`)

  if (verification.badDetail === 0) {
    console.log('\n✨ Fix verified successfully!')
  } else {
    console.error(`\n❌ Verification failed: badDetail is ${verification.badDetail}, expected 0`)
    process.exit(1)
  }

  console.log('\n✨ Done!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

