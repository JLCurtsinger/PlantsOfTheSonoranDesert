#!/usr/bin/env node

/**
 * Fix galleryItems[].image.asset references by converting _id to _ref.
 * 
 * This script fixes cases where galleryItems[].image.asset has _id but missing _ref,
 * which causes Sanity Studio validation errors.
 * 
 * Only fixes galleryItems[].image.asset - does not touch heroImage or gallery[].
 * Only targets published documents (excludes drafts).
 * 
 * Usage:
 *   npm run sanity:fix-galleryitems-asset-refs -- --slug saguaro-cactus
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
 * Checks if a galleryItems[].image.asset needs fixing.
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
    const fixedImage = {
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
function verifyAssetRef(asset: any, index: number): {valid: boolean; message: string} {
  if (!asset) {
    return {valid: false, message: `galleryItems[${index}].image.asset is missing`}
  }
  
  if (!asset._ref) {
    return {valid: false, message: `galleryItems[${index}].image.asset._ref is missing`}
  }
  
  if (typeof asset._ref !== 'string') {
    return {valid: false, message: `galleryItems[${index}].image.asset._ref is not a string`}
  }
  
  if (!asset._ref.startsWith('image-')) {
    return {valid: false, message: `galleryItems[${index}].image.asset._ref does not start with "image-": ${asset._ref}`}
  }
  
  return {valid: true, message: `galleryItems[${index}].image.asset._ref exists: ${asset._ref}`}
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:fix-galleryitems-asset-refs -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Fixing galleryItems[].image.asset references for plant: ${slug}\n`)

  // Fetch the published plant document (exclude drafts)
  // Using standard GROQ pattern to exclude drafts
  console.log('📄 Fetching published document...')
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug && !(_id match "drafts.*")][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      galleryItems[]{
        _key,
        key,
        image,
        title,
        description,
        alt
      }
    }`,
    {slug}
  )

  if (!plant) {
    console.error(`❌ Published plant document with slug "${slug}" not found`)
    process.exit(1)
  }

  if (plant._type !== 'plant') {
    console.error(`❌ Document is not a plant (type: ${plant._type})`)
    process.exit(1)
  }

  console.log(`✅ Found published plant: ${plant.title} (ID: ${plant._id})`)

  // Safety check: verify galleryItems structure
  if (!plant.galleryItems) {
    console.log(`⚠️  galleryItems is missing or null`)
    console.log(`   This script only fixes galleryItems[].image.asset references.`)
    console.log(`   If you need to clear galleryItems, use a separate command.`)
    process.exit(0)
  }

  if (!Array.isArray(plant.galleryItems)) {
    console.error(`❌ galleryItems is not an array (type: ${typeof plant.galleryItems})`)
    console.error(`   Unexpected shape detected. Exiting to prevent data loss.`)
    console.error(`   If you need to clear galleryItems, use a separate command.`)
    process.exit(1)
  }

  console.log(`\n📊 Found ${plant.galleryItems.length} galleryItems`)

  // Check which items need fixing
  const itemsNeedingFix: number[] = []
  plant.galleryItems.forEach((item: any, index: number) => {
    if (item.image && needsFix(item.image)) {
      itemsNeedingFix.push(index)
    }
  })

  if (itemsNeedingFix.length === 0) {
    console.log(`\n✅ No fixes needed - all galleryItems[].image.asset references are valid`)
    return
  }

  console.log(`\n🔧 Found ${itemsNeedingFix.length} galleryItems that need fixing:`)
  itemsNeedingFix.forEach((index) => {
    const item = plant.galleryItems[index]
    const assetId = item.image?.asset?._id
    console.log(`   galleryItems[${index}]: ${item.title || item.key || 'untitled'} (asset._id: ${assetId})`)
  })

  // Fix the items
  console.log(`\n🔧 Fixing galleryItems...`)
  const fixedGalleryItems = plant.galleryItems.map((item: any, index: number) => {
    if (itemsNeedingFix.includes(index)) {
      const fixedImage = fixImageAsset(item.image)
      return {
        ...item,
        image: fixedImage,
      }
    }
    return item
  })

  // Patch the document
  console.log(`\n💾 Updating published document...`)
  try {
    await client
      .patch(plant._id)
      .set({galleryItems: fixedGalleryItems})
      .commit()
    
    console.log(`✅ Document updated successfully`)
  } catch (error) {
    console.error(`\n❌ Error updating document:`, error)
    process.exit(1)
  }

  // Verification: re-fetch and verify
  console.log(`\n🔍 Verifying fixes...`)
  const verified = await client.fetch(
    `*[_type == "plant" && slug.current == $slug && !(_id match "drafts.*")][0]{
      _id,
      galleryItems[]{
        _key,
        image{
          asset
        }
      }
    }`,
    {slug}
  )

  if (!verified) {
    console.error(`❌ Could not re-fetch document for verification`)
    process.exit(1)
  }

  // Verify each galleryItems[].image.asset
  const verificationResults: Array<{index: number; valid: boolean; message: string}> = []
  if (verified.galleryItems && Array.isArray(verified.galleryItems)) {
    verified.galleryItems.forEach((item: any, index: number) => {
      const result = verifyAssetRef(item.image?.asset, index)
      verificationResults.push({index, ...result})
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

  if (invalidCount > 0) {
    console.error(`\n❌ Verification failed: ${invalidCount} items still have invalid asset references`)
    process.exit(1)
  }

  console.log(`\n✨ All galleryItems[].image.asset references are now valid!\n`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
