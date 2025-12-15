#!/usr/bin/env node

/**
 * Repair malformed image assets and clear galleryItems/detailSections.
 * 
 * This script:
 * 1. Repairs malformed image assets (converts _id to _ref in asset fields)
 * 2. Removes galleryItems and detailSections fields (to stop validation errors)
 * 3. Works on both published and draft documents
 * 4. Optionally discards the draft document
 * 
 * Usage:
 *   npm run sanity:repair-plant -- --slug saguaro-cactus
 *   npm run sanity:repair-plant -- --slug saguaro-cactus --discard-draft
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

/**
 * Repair a single image asset field
 * If asset has _id but no _ref, convert it to proper reference format
 */
function repairAsset(asset: any): any {
  if (!asset) return asset
  
  // If it already has _ref and _type, return as-is (preserve crop/hotspot if present)
  if (asset._ref && asset._type === 'reference') {
    return asset
  }
  
  // If it has _ref but missing _type, add _type
  if (asset._ref && asset._type !== 'reference') {
    return {
      _type: 'reference',
      _ref: asset._ref,
    }
  }
  
  // If it has _id but no _ref, convert to reference format
  if (asset._id && !asset._ref) {
    return {
      _type: 'reference',
      _ref: asset._id,
    }
  }
  
  // If it has _ref but no _type, add _type
  if (asset._ref && !asset._type) {
    return {
      _type: 'reference',
      _ref: asset._ref,
    }
  }
  
  // Otherwise return as-is
  return asset
}

/**
 * Repair image field (image.asset)
 */
function repairImage(image: any): any {
  if (!image) return image
  
  if (image.asset) {
    return {
      ...image,
      asset: repairAsset(image.asset),
    }
  }
  
  return image
}

/**
 * Repair all image fields in a document
 */
function repairDocumentImages(doc: any): any {
  const repaired: any = {}
  
  // Repair heroImage
  if (doc.heroImage) {
    repaired.heroImage = repairImage(doc.heroImage)
  }
  
  // Repair gallery array
  if (doc.gallery && Array.isArray(doc.gallery)) {
    repaired.gallery = doc.gallery.map(repairImage)
  }
  
  // Repair galleryItems
  if (doc.galleryItems && Array.isArray(doc.galleryItems)) {
    repaired.galleryItems = doc.galleryItems.map((item: any) => {
      if (item.image) {
        return {
          ...item,
          image: repairImage(item.image),
        }
      }
      return item
    })
  }
  
  // Repair detailSections
  if (doc.detailSections && Array.isArray(doc.detailSections)) {
    repaired.detailSections = doc.detailSections.map((section: any) => {
      if (section.image) {
        return {
          ...section,
          image: repairImage(section.image),
        }
      }
      return section
    })
  }
  
  return repaired
}

async function repairDocument(docId: string, doc: any, isDraft: boolean): Promise<void> {
  const label = isDraft ? 'DRAFT' : 'PUBLISHED'
  console.log(`\n🔧 Repairing ${label} document: ${docId}`)
  
  const patch = client.patch(docId)
  let hasChanges = false
  
  // Repair image assets
  const repaired = repairDocumentImages(doc)
  
  // Apply asset repairs if needed
  if (repaired.heroImage && repaired.heroImage !== doc.heroImage) {
    console.log(`  ✅ Repairing heroImage.asset`)
    patch.set({heroImage: repaired.heroImage})
    hasChanges = true
  }
  
  if (repaired.gallery && JSON.stringify(repaired.gallery) !== JSON.stringify(doc.gallery)) {
    console.log(`  ✅ Repairing gallery[].asset`)
    patch.set({gallery: repaired.gallery})
    hasChanges = true
  }
  
  if (repaired.galleryItems && JSON.stringify(repaired.galleryItems) !== JSON.stringify(doc.galleryItems)) {
    console.log(`  ✅ Repairing galleryItems[].image.asset`)
    patch.set({galleryItems: repaired.galleryItems})
    hasChanges = true
  }
  
  if (repaired.detailSections && JSON.stringify(repaired.detailSections) !== JSON.stringify(doc.detailSections)) {
    console.log(`  ✅ Repairing detailSections[].image.asset`)
    patch.set({detailSections: repaired.detailSections})
    hasChanges = true
  }
  
  // Unset galleryItems and detailSections
  if (doc.galleryItems) {
    console.log(`  🗑️  Removing galleryItems field`)
    patch.unset(['galleryItems'])
    hasChanges = true
  }
  
  if (doc.detailSections) {
    console.log(`  🗑️  Removing detailSections field`)
    patch.unset(['detailSections'])
    hasChanges = true
  }
  
  if (hasChanges) {
    await patch.commit()
    console.log(`  ✅ ${label} document repaired`)
  } else {
    console.log(`  ℹ️  No changes needed for ${label} document`)
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:repair-plant -- --slug saguaro-cactus')
    console.error('   Usage: npm run sanity:repair-plant -- --slug saguaro-cactus --discard-draft')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  const discardDraft = args.includes('--discard-draft')
  
  console.log(`\n🔧 Repairing plant: ${slug}`)
  if (discardDraft) {
    console.log(`   ⚠️  Will discard draft after repair`)
  }

  // Fetch the published plant document
  console.log(`\n📄 Fetching published document...`)
  const published = await client.fetch(
    `*[_type == "plant" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage,
      gallery,
      galleryItems,
      detailSections
    }`,
    {slug}
  )

  if (!published) {
    console.error(`❌ Published plant document with slug "${slug}" not found`)
    process.exit(1)
  }

  console.log(`✅ Found published: ${published.title} (ID: ${published._id})`)

  // Fetch the draft document
  const draftId = `drafts.${published._id}`
  console.log(`\n📄 Fetching draft document (${draftId})...`)
  const draft = await client.fetch(
    `*[_id == $draftId][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage,
      gallery,
      galleryItems,
      detailSections
    }`,
    {draftId}
  )

  if (draft) {
    console.log(`✅ Found draft: ${draft.title} (ID: ${draft._id})`)
  } else {
    console.log(`ℹ️  No draft document found`)
  }

  // Repair published document
  await repairDocument(published._id, published, false)

  // Repair draft document if it exists
  if (draft) {
    await repairDocument(draft._id, draft, true)
    
    // Optionally discard draft
    if (discardDraft) {
      console.log(`\n🗑️  Discarding draft document...`)
      await client.delete(draft._id)
      console.log(`  ✅ Draft document discarded`)
    }
  }

  // Verification
  console.log(`\n${'='.repeat(60)}`)
  console.log('🔍 VERIFICATION')
  console.log(`${'='.repeat(60)}`)
  
  // Re-fetch published
  const publishedAfter = await client.fetch(
    `*[_id == $id][0]{
      _id,
      galleryItems,
      detailSections,
      heroImage,
      gallery
    }`,
    {id: published._id}
  )
  
  console.log(`\n📋 Published document (${publishedAfter._id}):`)
  console.log(`  galleryItems: ${publishedAfter.galleryItems ? 'PRESENT' : 'removed'}`)
  console.log(`  detailSections: ${publishedAfter.detailSections ? 'PRESENT' : 'removed'}`)
  
  // Check asset shapes
  let publishedHasIssues = false
  if (publishedAfter.heroImage?.asset) {
    const asset = publishedAfter.heroImage.asset
    if (asset._id && !asset._ref) {
      console.log(`  ⚠️  heroImage.asset still has _id without _ref`)
      publishedHasIssues = true
    }
  }
  if (publishedAfter.gallery && Array.isArray(publishedAfter.gallery)) {
    for (const img of publishedAfter.gallery) {
      if (img?.asset?._id && !img.asset._ref) {
        console.log(`  ⚠️  gallery[].asset still has _id without _ref`)
        publishedHasIssues = true
        break
      }
    }
  }
  if (!publishedHasIssues) {
    console.log(`  ✅ All image assets have proper _ref format`)
  }
  
  // Re-fetch draft if it wasn't discarded
  if (draft && !discardDraft) {
    const draftAfter = await client.fetch(
      `*[_id == $id][0]{
        _id,
        galleryItems,
        detailSections,
        heroImage,
        gallery
      }`,
      {id: draft._id}
    )
    
    if (draftAfter) {
      console.log(`\n📋 Draft document (${draftAfter._id}):`)
      console.log(`  galleryItems: ${draftAfter.galleryItems ? 'PRESENT' : 'removed'}`)
      console.log(`  detailSections: ${draftAfter.detailSections ? 'PRESENT' : 'removed'}`)
      
      let draftHasIssues = false
      if (draftAfter.heroImage?.asset) {
        const asset = draftAfter.heroImage.asset
        if (asset._id && !asset._ref) {
          console.log(`  ⚠️  heroImage.asset still has _id without _ref`)
          draftHasIssues = true
        }
      }
      if (draftAfter.gallery && Array.isArray(draftAfter.gallery)) {
        for (const img of draftAfter.gallery) {
          if (img?.asset?._id && !img.asset._ref) {
            console.log(`  ⚠️  gallery[].asset still has _id without _ref`)
            draftHasIssues = true
            break
          }
        }
      }
      if (!draftHasIssues) {
        console.log(`  ✅ All image assets have proper _ref format`)
      }
    }
  } else if (discardDraft) {
    console.log(`\n📋 Draft document: DISCARDED`)
  } else {
    console.log(`\n📋 Draft document: does not exist`)
  }

  console.log(`\n✨ Repair complete!`)
  console.log(`   Sanity Studio should now allow publishing.\n`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})







