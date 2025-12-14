#!/usr/bin/env node

/**
 * Repair missing _type fields on array items in galleryItems and detailSections.
 * Also fixes image asset references.
 * 
 * This script:
 * 1. Adds _type: 'galleryItem' to all galleryItems array items
 * 2. Adds _type: 'detailSection' to all detailSections array items
 * 3. Fixes image asset refs (converts _id to _ref format)
 * 4. Works on both published and draft documents
 * 
 * Usage:
 *   npm run sanity:repair-plant-array-item-types -- --id 40b13a31-0413-463a-b6b0-5728385a182e
 *   npm run sanity:repair-plant-array-item-types -- --slug saguaro-cactus
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
      ...(asset.crop && {crop: asset.crop}),
      ...(asset.hotspot && {hotspot: asset.hotspot}),
    }
  }
  
  // If it has _id but no _ref, convert to reference format
  if (asset._id && !asset._ref) {
    return {
      _type: 'reference',
      _ref: asset._id,
      ...(asset.crop && {crop: asset.crop}),
      ...(asset.hotspot && {hotspot: asset.hotspot}),
    }
  }
  
  // If it has _ref but no _type, add _type
  if (asset._ref && !asset._type) {
    return {
      _type: 'reference',
      _ref: asset._ref,
      ...(asset.crop && {crop: asset.crop}),
      ...(asset.hotspot && {hotspot: asset.hotspot}),
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
 * Repair galleryItems array: add _type and fix image assets
 */
function repairGalleryItems(items: any[]): any[] {
  if (!Array.isArray(items)) return items
  
  return items.map(item => {
    const repaired: any = {
      ...item,
      _type: 'galleryItem', // Always set _type
    }
    
    // Fix image asset if present
    if (item.image) {
      repaired.image = repairImage(item.image)
    }
    
    return repaired
  })
}

/**
 * Repair detailSections array: add _type and fix image assets
 */
function repairDetailSections(sections: any[]): any[] {
  if (!Array.isArray(sections)) return sections
  
  return sections.map(section => {
    const repaired: any = {
      ...section,
      _type: 'detailSection', // Always set _type
    }
    
    // Fix image asset if present
    if (section.image) {
      repaired.image = repairImage(section.image)
    }
    
    return repaired
  })
}

async function repairDocument(docId: string, doc: any, isDraft: boolean): Promise<void> {
  const label = isDraft ? 'DRAFT' : 'PUBLISHED'
  console.log(`\n🔧 Repairing ${label} document: ${docId}`)
  
  const patch = client.patch(docId)
  let hasChanges = false
  let galleryItemsFixed = 0
  let detailSectionsFixed = 0
  let imageAssetsFixed = 0
  
  // Repair galleryItems
  if (doc.galleryItems && Array.isArray(doc.galleryItems)) {
    const repaired = repairGalleryItems(doc.galleryItems)
    
    // Count items that needed fixing
    galleryItemsFixed = repaired.filter((item: any, idx: number) => {
      const original = doc.galleryItems[idx]
      return !original._type || original._type !== 'galleryItem' || 
             JSON.stringify(item.image) !== JSON.stringify(original.image)
    }).length
    
    if (galleryItemsFixed > 0 || JSON.stringify(repaired) !== JSON.stringify(doc.galleryItems)) {
      console.log(`  ✅ Repairing galleryItems: ${galleryItemsFixed} items fixed`)
      patch.set({galleryItems: repaired})
      hasChanges = true
      
      // Count image asset fixes
      repaired.forEach((item: any) => {
        if (item.image?.asset?._ref && !doc.galleryItems.find((orig: any) => 
          orig.image?.asset?._ref === item.image.asset._ref && 
          orig.image?.asset?._type === 'reference'
        )) {
          imageAssetsFixed++
        }
      })
    }
  }
  
  // Repair detailSections
  if (doc.detailSections && Array.isArray(doc.detailSections)) {
    const repaired = repairDetailSections(doc.detailSections)
    
    // Count items that needed fixing
    detailSectionsFixed = repaired.filter((section: any, idx: number) => {
      const original = doc.detailSections[idx]
      return !original._type || original._type !== 'detailSection' || 
             JSON.stringify(section.image) !== JSON.stringify(original.image)
    }).length
    
    if (detailSectionsFixed > 0 || JSON.stringify(repaired) !== JSON.stringify(doc.detailSections)) {
      console.log(`  ✅ Repairing detailSections: ${detailSectionsFixed} items fixed`)
      patch.set({detailSections: repaired})
      hasChanges = true
      
      // Count image asset fixes
      repaired.forEach((section: any) => {
        if (section.image?.asset?._ref && !doc.detailSections.find((orig: any) => 
          orig.image?.asset?._ref === section.image.asset._ref && 
          orig.image?.asset?._type === 'reference'
        )) {
          imageAssetsFixed++
        }
      })
    }
  }
  
  if (hasChanges) {
    await patch.commit()
    console.log(`  ✅ ${label} document repaired`)
    console.log(`     - galleryItems fixed: ${galleryItemsFixed}`)
    console.log(`     - detailSections fixed: ${detailSectionsFixed}`)
    console.log(`     - image assets fixed: ${imageAssetsFixed}`)
  } else {
    console.log(`  ℹ️  No changes needed for ${label} document`)
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const idIndex = args.indexOf('--id')
  const slugIndex = args.indexOf('--slug')
  
  let baseId: string | null = null
  let slug: string | null = null
  
  if (idIndex !== -1 && args[idIndex + 1]) {
    baseId = args[idIndex + 1]
  } else if (slugIndex !== -1 && args[slugIndex + 1]) {
    slug = args[slugIndex + 1]
  } else {
    console.error('❌ Missing --id or --slug argument')
    console.error('   Usage: npm run sanity:repair-plant-array-item-types -- --id <baseId>')
    console.error('   Usage: npm run sanity:repair-plant-array-item-types -- --slug <slug>')
    process.exit(1)
  }
  
  console.log(`\n🔧 Repairing plant array item types`)
  if (baseId) {
    console.log(`   ID: ${baseId}`)
  } else if (slug) {
    console.log(`   Slug: ${slug}`)
  }

  // Fetch the published plant document
  let published: any = null
  
  if (baseId) {
    console.log(`\n📄 Fetching published document (${baseId})...`)
    published = await client.fetch(
      `*[_type == "plant" && _id == $id && !(_id in path("drafts.**"))][0]{
        _id,
        _type,
        title,
        "slug": slug.current,
        galleryItems,
        detailSections
      }`,
      {id: baseId}
    )
  } else if (slug) {
    console.log(`\n📄 Fetching published document (slug: ${slug})...`)
    published = await client.fetch(
      `*[_type == "plant" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
        _id,
        _type,
        title,
        "slug": slug.current,
        galleryItems,
        detailSections
      }`,
      {slug}
    )
  }

  if (!published) {
    console.error(`❌ Published plant document not found`)
    process.exit(1)
  }

  baseId = published._id
  console.log(`✅ Found published: ${published.title} (ID: ${baseId})`)

  // Fetch the draft document
  const draftId = `drafts.${baseId}`
  console.log(`\n📄 Fetching draft document (${draftId})...`)
  const draft = await client.fetch(
    `*[_id == $draftId][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
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
  if (!baseId) {
    console.error(`❌ Cannot repair: baseId is null`)
    process.exit(1)
  }
  await repairDocument(baseId, published, false)

  // Repair draft document if it exists
  if (draft) {
    await repairDocument(draftId, draft, true)
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
      detailSections
    }`,
    {id: baseId}
  )
  
  console.log(`\n📋 Published document (${publishedAfter._id}):`)
  
  let publishedHasIssues = false
  
  // Verify galleryItems
  if (publishedAfter.galleryItems && Array.isArray(publishedAfter.galleryItems)) {
    const missingType = publishedAfter.galleryItems.filter((item: any) => item._type !== 'galleryItem')
    if (missingType.length > 0) {
      console.log(`  ⚠️  ${missingType.length} galleryItems missing _type: 'galleryItem'`)
      publishedHasIssues = true
    } else {
      console.log(`  ✅ All ${publishedAfter.galleryItems.length} galleryItems have _type: 'galleryItem'`)
    }
    
    // Check image assets
    const badAssets = publishedAfter.galleryItems.filter((item: any) => 
      item.image?.asset?._id && !item.image.asset._ref
    )
    if (badAssets.length > 0) {
      console.log(`  ⚠️  ${badAssets.length} galleryItems have image assets with _id but no _ref`)
      publishedHasIssues = true
    } else {
      console.log(`  ✅ All galleryItems image assets have proper _ref format`)
    }
  } else {
    console.log(`  ℹ️  No galleryItems`)
  }
  
  // Verify detailSections
  if (publishedAfter.detailSections && Array.isArray(publishedAfter.detailSections)) {
    const missingType = publishedAfter.detailSections.filter((section: any) => section._type !== 'detailSection')
    if (missingType.length > 0) {
      console.log(`  ⚠️  ${missingType.length} detailSections missing _type: 'detailSection'`)
      publishedHasIssues = true
    } else {
      console.log(`  ✅ All ${publishedAfter.detailSections.length} detailSections have _type: 'detailSection'`)
    }
    
    // Check image assets
    const badAssets = publishedAfter.detailSections.filter((section: any) => 
      section.image?.asset?._id && !section.image.asset._ref
    )
    if (badAssets.length > 0) {
      console.log(`  ⚠️  ${badAssets.length} detailSections have image assets with _id but no _ref`)
      publishedHasIssues = true
    } else {
      console.log(`  ✅ All detailSections image assets have proper _ref format`)
    }
  } else {
    console.log(`  ℹ️  No detailSections`)
  }
  
  // Re-fetch draft if it exists
  if (draft) {
    const draftAfter = await client.fetch(
      `*[_id == $id][0]{
        _id,
        galleryItems,
        detailSections
      }`,
      {id: draftId}
    )
    
    if (draftAfter) {
      console.log(`\n📋 Draft document (${draftAfter._id}):`)
      
      let draftHasIssues = false
      
      // Verify galleryItems
      if (draftAfter.galleryItems && Array.isArray(draftAfter.galleryItems)) {
        const missingType = draftAfter.galleryItems.filter((item: any) => item._type !== 'galleryItem')
        if (missingType.length > 0) {
          console.log(`  ⚠️  ${missingType.length} galleryItems missing _type: 'galleryItem'`)
          draftHasIssues = true
        } else {
          console.log(`  ✅ All ${draftAfter.galleryItems.length} galleryItems have _type: 'galleryItem'`)
        }
        
        // Check image assets
        const badAssets = draftAfter.galleryItems.filter((item: any) => 
          item.image?.asset?._id && !item.image.asset._ref
        )
        if (badAssets.length > 0) {
          console.log(`  ⚠️  ${badAssets.length} galleryItems have image assets with _id but no _ref`)
          draftHasIssues = true
        } else {
          console.log(`  ✅ All galleryItems image assets have proper _ref format`)
        }
      } else {
        console.log(`  ℹ️  No galleryItems`)
      }
      
      // Verify detailSections
      if (draftAfter.detailSections && Array.isArray(draftAfter.detailSections)) {
        const missingType = draftAfter.detailSections.filter((section: any) => section._type !== 'detailSection')
        if (missingType.length > 0) {
          console.log(`  ⚠️  ${missingType.length} detailSections missing _type: 'detailSection'`)
          draftHasIssues = true
        } else {
          console.log(`  ✅ All ${draftAfter.detailSections.length} detailSections have _type: 'detailSection'`)
        }
        
        // Check image assets
        const badAssets = draftAfter.detailSections.filter((section: any) => 
          section.image?.asset?._id && !section.image.asset._ref
        )
        if (badAssets.length > 0) {
          console.log(`  ⚠️  ${badAssets.length} detailSections have image assets with _id but no _ref`)
          draftHasIssues = true
        } else {
          console.log(`  ✅ All detailSections image assets have proper _ref format`)
        }
      } else {
        console.log(`  ℹ️  No detailSections`)
      }
      
      if (!draftHasIssues) {
        console.log(`  ✅ Draft document is fully repaired`)
      }
    }
  } else {
    console.log(`\n📋 Draft document: does not exist`)
  }
  
  if (!publishedHasIssues) {
    console.log(`\n✨ Repair complete!`)
    console.log(`   Sanity Studio should now allow editing and publishing.\n`)
  } else {
    console.log(`\n⚠️  Some issues remain. Please review the output above.\n`)
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})


