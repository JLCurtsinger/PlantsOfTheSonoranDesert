#!/usr/bin/env node

/**
 * Fix draft plant document image asset references by converting _id to _ref.
 * 
 * This script fixes cases where galleryItems[].image.asset or detailSections[].image.asset
 * have _id but missing _ref in draft documents, which causes Sanity Studio validation errors.
 * 
 * Only targets draft documents (drafts.*) - does not modify published documents.
 * Fixes both galleryItems[] and detailSections[] arrays.
 * 
 * Usage:
 *   npm run sanity:fix-draft-image-asset-refs -- --id 40b13a31-0413-463a-b6b0-5728385a182e
 *   npm run sanity:fix-draft-image-asset-refs -- --slug saguaro-cactus
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
  perspective: 'drafts', // IMPORTANT: allow reading drafts. (use 'raw' if drafts still not visible)
})

console.log(`\n🔧 Sanity client: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} perspective=drafts\n`)

/**
 * Checks if an image asset needs fixing.
 * Returns true if asset has _id but missing _ref.
 */
function needsFix(image: any): boolean {
  if (!image || !image.asset) return false
  
  // If asset has _id but no _ref, it needs fixing
  if (image.asset._id && !image.asset._ref) {
    return true
  }
  
  return false
}

/**
 * Fixes an image asset by converting _id to _ref.
 * Preserves crop and hotspot if present.
 */
function fixImageAsset(image: any): any {
  if (!image || !image.asset) {
    return image
  }
  
  // If already has _ref, return as-is
  if (image.asset._ref) {
    return image
  }
  
  // If has _id but no _ref, convert it
  if (image.asset._id && !image.asset._ref) {
    const fixedImage: any = {
      ...image,
      asset: {
        _type: 'reference',
        _ref: image.asset._id,
      },
    }
    
    // Preserve crop and hotspot if present
    if (image.crop) {
      fixedImage.crop = image.crop
    }
    if (image.hotspot) {
      fixedImage.hotspot = image.hotspot
    }
    
    return fixedImage
  }
  
  return image
}

/**
 * Verifies that an asset reference is valid (has _ref starting with "image-").
 */
function verifyAssetRef(asset: any, arrayName: string, index: number): {valid: boolean; message: string} {
  if (!asset) {
    return {valid: false, message: `${arrayName}[${index}].image.asset is missing`}
  }
  
  if (asset._id && !asset._ref) {
    return {valid: false, message: `${arrayName}[${index}].image.asset has _id but no _ref`}
  }
  
  if (!asset._ref) {
    return {valid: false, message: `${arrayName}[${index}].image.asset._ref is missing`}
  }
  
  if (typeof asset._ref !== 'string') {
    return {valid: false, message: `${arrayName}[${index}].image.asset._ref is not a string`}
  }
  
  if (!asset._ref.startsWith('image-')) {
    return {valid: false, message: `${arrayName}[${index}].image.asset._ref does not start with "image-": ${asset._ref}`}
  }
  
  return {valid: true, message: `${arrayName}[${index}].image.asset._ref exists: ${asset._ref}`}
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const idIndex = args.indexOf('--id')
  const slugIndex = args.indexOf('--slug')
  
  let draftId: string | null = null
  let baseId: string | null = null
  
  if (idIndex !== -1 && args[idIndex + 1]) {
    baseId = args[idIndex + 1]
    draftId = `drafts.${baseId}`
    console.log(`\n🔍 Fixing draft image asset references for plant ID: ${baseId}`)
    console.log(`   Draft ID: ${draftId}\n`)
  } else if (slugIndex !== -1 && args[slugIndex + 1]) {
    const slug = args[slugIndex + 1]
    console.log(`\n🔍 Fixing draft image asset references for plant slug: ${slug}\n`)
    
    // Fetch the published plant document to get the base ID
    console.log('📄 Fetching published document to get base ID...')
    const publishedPlant = await client.fetch(
      `*[_type == "plant" && slug.current == $slug && !(_id match "drafts.*")][0]{
        _id,
        title,
        "slug": slug.current
      }`,
      {slug}
    )
    
    if (!publishedPlant) {
      console.error(`❌ Published plant document with slug "${slug}" not found`)
      process.exit(1)
    }
    
    baseId = publishedPlant._id
    draftId = `drafts.${baseId}`
    console.log(`✅ Found published plant: ${publishedPlant.title} (ID: ${baseId})`)
    console.log(`   Draft ID: ${draftId}\n`)
  } else {
    console.error('❌ Missing --id or --slug argument')
    console.error('   Usage: npm run sanity:fix-draft-image-asset-refs -- --id <baseId>')
    console.error('   Usage: npm run sanity:fix-draft-image-asset-refs -- --slug <slug>')
    process.exit(1)
  }
  
  if (!draftId) {
    console.error('❌ Could not determine draft ID')
    process.exit(1)
  }
  
  // Fetch the draft plant document
  console.log('📄 Fetching draft document...')
  const draft = await client.fetch(
    `*[_id == $id][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      galleryItems[]{
        _key,
        key,
        image,
        title
      },
      detailSections[]{
        _key,
        key,
        image,
        title
      }
    }`,
    {id: draftId}
  )
  
  if (!draft) {
    console.error(`❌ Draft document with ID "${draftId}" not found`)
    console.error('   The draft document does not exist. Exiting without error.')
    process.exit(0)
  }
  
  if (draft._type !== 'plant') {
    console.error(`❌ Document is not a plant (type: ${draft._type})`)
    process.exit(1)
  }
  
  console.log(`✅ Found draft plant: ${draft.title || 'Untitled'} (ID: ${draft._id})`)
  
  // Check which items need fixing in galleryItems
  const galleryItemsNeedingFix: number[] = []
  if (draft.galleryItems && Array.isArray(draft.galleryItems)) {
    draft.galleryItems.forEach((item: any, index: number) => {
      if (item.image && needsFix(item.image)) {
        galleryItemsNeedingFix.push(index)
      }
    })
  }
  
  // Check which items need fixing in detailSections
  const detailSectionsNeedingFix: number[] = []
  if (draft.detailSections && Array.isArray(draft.detailSections)) {
    draft.detailSections.forEach((item: any, index: number) => {
      if (item.image && needsFix(item.image)) {
        detailSectionsNeedingFix.push(index)
      }
    })
  }
  
  // Print summary before committing
  console.log(`\n${'='.repeat(60)}`)
  console.log('📋 PRE-COMMIT SUMMARY')
  console.log(`${'='.repeat(60)}`)
  console.log(`Draft document ID: ${draft._id}`)
  console.log(`\ngalleryItems:`)
  console.log(`   Total items: ${draft.galleryItems?.length || 0}`)
  console.log(`   Items needing fix: ${galleryItemsNeedingFix.length}`)
  
  if (galleryItemsNeedingFix.length > 0) {
    galleryItemsNeedingFix.forEach((index) => {
      const item = draft.galleryItems[index]
      const assetId = item.image?.asset?._id
      console.log(`   [${index}] ${item.title || item.key || 'untitled'} (asset._id: ${assetId})`)
    })
  }
  
  console.log(`\ndetailSections:`)
  console.log(`   Total items: ${draft.detailSections?.length || 0}`)
  console.log(`   Items needing fix: ${detailSectionsNeedingFix.length}`)
  
  if (detailSectionsNeedingFix.length > 0) {
    detailSectionsNeedingFix.forEach((index) => {
      const item = draft.detailSections[index]
      const assetId = item.image?.asset?._id
      console.log(`   [${index}] ${item.title || item.key || 'untitled'} (asset._id: ${assetId})`)
    })
  }
  
  const totalNeedingFix = galleryItemsNeedingFix.length + detailSectionsNeedingFix.length
  
  if (totalNeedingFix === 0) {
    console.log(`\n✅ No fixes needed - all image asset references are valid`)
    return
  }
  
  console.log(`\n${'='.repeat(60)}`)
  
  // Fix the items
  console.log(`\n🔧 Fixing image asset references...`)
  
  let fixedGalleryItems = draft.galleryItems
  if (draft.galleryItems && Array.isArray(draft.galleryItems) && galleryItemsNeedingFix.length > 0) {
    fixedGalleryItems = draft.galleryItems.map((item: any, index: number) => {
      if (galleryItemsNeedingFix.includes(index)) {
        const fixedImage = fixImageAsset(item.image)
        return {
          ...item,
          image: fixedImage,
        }
      }
      return item
    })
  }
  
  let fixedDetailSections = draft.detailSections
  if (draft.detailSections && Array.isArray(draft.detailSections) && detailSectionsNeedingFix.length > 0) {
    fixedDetailSections = draft.detailSections.map((item: any, index: number) => {
      if (detailSectionsNeedingFix.includes(index)) {
        const fixedImage = fixImageAsset(item.image)
        return {
          ...item,
          image: fixedImage,
        }
      }
      return item
    })
  }
  
  // Build patch operations
  const patch = client.patch(draft._id)
  
  if (galleryItemsNeedingFix.length > 0) {
    patch.set({galleryItems: fixedGalleryItems})
  }
  
  if (detailSectionsNeedingFix.length > 0) {
    patch.set({detailSections: fixedDetailSections})
  }
  
  // Commit the patch
  console.log(`\n💾 Updating draft document...`)
  try {
    await patch.commit()
    console.log(`✅ Draft document updated successfully`)
  } catch (error) {
    console.error(`\n❌ Error updating draft document:`, error)
    process.exit(1)
  }
  
  // Verification: re-fetch and verify
  console.log(`\n🔍 Verifying fixes...`)
  const verified = await client.fetch(
    `*[_id == $id][0]{
      _id,
      galleryItems[]{
        _key,
        image{
          asset
        }
      },
      detailSections[]{
        _key,
        image{
          asset
        }
      }
    }`,
    {id: draftId}
  )
  
  if (!verified) {
    console.error(`❌ Could not re-fetch draft document for verification`)
    process.exit(1)
  }
  
  // Verify each galleryItems[].image.asset
  const verificationResults: Array<{arrayName: string; index: number; valid: boolean; message: string}> = []
  
  if (verified.galleryItems && Array.isArray(verified.galleryItems)) {
    verified.galleryItems.forEach((item: any, index: number) => {
      const result = verifyAssetRef(item.image?.asset, 'galleryItems', index)
      verificationResults.push({arrayName: 'galleryItems', index, ...result})
    })
  }
  
  if (verified.detailSections && Array.isArray(verified.detailSections)) {
    verified.detailSections.forEach((item: any, index: number) => {
      const result = verifyAssetRef(item.image?.asset, 'detailSections', index)
      verificationResults.push({arrayName: 'detailSections', index, ...result})
    })
  }
  
  // Check for any remaining _id occurrences
  const remainingIdIssues: string[] = []
  if (verified.galleryItems && Array.isArray(verified.galleryItems)) {
    verified.galleryItems.forEach((item: any, index: number) => {
      if (item.image?.asset?._id && !item.image?.asset?._ref) {
        remainingIdIssues.push(`galleryItems[${index}].image.asset still has _id without _ref`)
      }
    })
  }
  
  if (verified.detailSections && Array.isArray(verified.detailSections)) {
    verified.detailSections.forEach((item: any, index: number) => {
      if (item.image?.asset?._id && !item.image?.asset?._ref) {
        remainingIdIssues.push(`detailSections[${index}].image.asset still has _id without _ref`)
      }
    })
  }
  
  // Print verification summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('📋 VERIFICATION SUMMARY')
  console.log(`${'='.repeat(60)}`)
  
  const validCount = verificationResults.filter(r => r.valid).length
  const invalidCount = verificationResults.filter(r => !r.valid).length
  
  verificationResults.forEach((result) => {
    const status = result.valid ? '✅' : '❌'
    console.log(`${status} ${result.message}`)
  })
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total items: ${verificationResults.length}`)
  console.log(`   Valid: ${validCount}`)
  console.log(`   Invalid: ${invalidCount}`)
  
  if (remainingIdIssues.length > 0) {
    console.log(`\n❌ Found ${remainingIdIssues.length} items still with _id but no _ref:`)
    remainingIdIssues.forEach((issue) => {
      console.log(`   - ${issue}`)
    })
  }
  
  if (invalidCount > 0 || remainingIdIssues.length > 0) {
    console.error(`\n❌ Verification failed: ${invalidCount} invalid references and ${remainingIdIssues.length} remaining _id issues`)
    process.exit(1)
  }
  
  console.log(`\n✨ All image asset references are now valid!`)
  console.log(`   Zero remaining image.asset._id occurrences in both arrays`)
  console.log(`   All affected assets now have _ref starting with "image-"\n`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

