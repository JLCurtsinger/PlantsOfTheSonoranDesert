#!/usr/bin/env node

/**
 * Migration script to fix image references in galleryItems and detailSections.
 * 
 * This script fixes cases where image fields were written as document references
 * instead of Sanity image objects. It converts references to proper image objects.
 * 
 * Usage:
 *   npm run sanity:migrate-image-references -- --slug saguaro-cactus
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
 * Checks if an image field needs migration.
 * Main issue: image.asset has _id but no _ref (dereferenced asset object)
 */
function needsMigration(image: any): boolean {
  if (!image) return false
  
  // If it's a direct reference (wrong format - image should be object, not reference)
  if (image._type === 'reference' && image._ref) return true
  
  // CRITICAL: If asset exists and has _id but no _ref, it's broken (dereferenced)
  if (image.asset && image.asset._id && !image.asset._ref) {
    return true
  }
  
  // If it's already a proper image object with asset._ref, no migration needed
  if (image._type === 'image' && image.asset?._ref) {
    return false
  }
  
  // If it has asset but missing _type: 'image', fix it
  if (image.asset && image._type !== 'image') {
    return true
  }
  
  return false
}

/**
 * Converts a broken or malformed image to a proper image object
 * Preserves crop and hotspot if present
 */
async function convertToImageObject(image: any): Promise<any | null> {
  if (!image) return null
  
  // If it's already a proper image object with _ref, return as-is
  if (image._type === 'image' && image.asset?._ref) {
    return image
  }
  
  // Extract asset reference
  let assetRef: string | null = null
  
  // Case 1: Asset has _id but no _ref (dereferenced - this is the broken state)
  if (image.asset?._id && !image.asset._ref) {
    assetRef = image.asset._id
  }
  // Case 2: Asset already has _ref
  else if (image.asset?._ref) {
    assetRef = image.asset._ref
  }
  // Case 3: Direct reference (wrong format)
  else if (image._type === 'reference' && image._ref) {
    assetRef = image._ref
  }
  // Case 4: String reference
  else if (typeof image === 'string') {
    assetRef = image
  }
  
  if (!assetRef) {
    console.warn(`   ⚠️  Could not extract asset reference`)
    return null
  }
  
  // Verify the asset exists
  try {
    const asset = await client.fetch(`*[_id == $id][0]{_id, _type}`, {id: assetRef})
    if (!asset) {
      console.warn(`   ⚠️  Asset with ID ${assetRef} not found`)
      return null
    }
  } catch (error) {
    console.warn(`   ⚠️  Error verifying asset ${assetRef}:`, error)
    return null
  }
  
  // Build proper image object with reference
  const fixedImage: any = {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: assetRef,
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

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:migrate-image-references -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Migrating image references for plant: ${slug}`)

  // Fetch the plant document from Sanity
  // Fetch all image fields: heroImage, gallery[], galleryItems[].image, detailSections[].image
  console.log(`\n🔍 Fetching plant document from Sanity...`)
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage,
      gallery[],
      galleryItems[]{
        _key,
        key,
        image,
        title,
        description,
        alt
      },
      detailSections[]{
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
    console.error(`❌ Plant document with slug "${slug}" not found in Sanity`)
    process.exit(1)
  }

  if (plant._type !== 'plant') {
    console.error(`❌ Document is not a plant (type: ${plant._type})`)
    process.exit(1)
  }

  console.log(`✅ Found plant in Sanity: ${plant.title} (ID: ${plant._id})`)

  // Process heroImage
  let heroImageFixed = false
  let fixedHeroImage: any = null
  if (needsMigration(plant.heroImage)) {
    console.log(`   🔧 Fixing heroImage`)
    fixedHeroImage = await convertToImageObject(plant.heroImage)
    if (fixedHeroImage) {
      heroImageFixed = true
    } else {
      console.warn(`   ⚠️  Could not convert heroImage, keeping original`)
      fixedHeroImage = plant.heroImage
    }
  } else {
    fixedHeroImage = plant.heroImage
  }

  // Process deprecated gallery[] (keep untouched but fix broken references)
  const existingGallery = plant.gallery || []
  let galleryFixed = 0
  const fixedGallery = await Promise.all(
    existingGallery.map(async (image: any, index: number) => {
      if (needsMigration(image)) {
        console.log(`   🔧 Fixing gallery[${index}]`)
        const fixedImage = await convertToImageObject(image)
        if (fixedImage) {
          galleryFixed++
          return fixedImage
        } else {
          console.warn(`   ⚠️  Could not convert gallery[${index}], keeping original`)
          return image
        }
      }
      return image
    })
  )

  // Process galleryItems
  const existingGalleryItems = plant.galleryItems || []
  let galleryItemsFixed = 0
  const fixedGalleryItems = await Promise.all(
    existingGalleryItems.map(async (item: any, index: number) => {
      if (needsMigration(item.image)) {
        console.log(`   🔧 Fixing galleryItems[${index}] image`)
        if (item.title) {
          console.log(`      Title: "${item.title}"`)
        }
        const fixedImage = await convertToImageObject(item.image)
        if (fixedImage) {
          galleryItemsFixed++
          return {
            ...item,
            image: fixedImage,
          }
        } else {
          console.warn(`   ⚠️  Could not convert galleryItems[${index}] image, keeping original`)
          return item
        }
      }
      return item
    })
  )

  // Process detailSections
  const existingDetailSections = plant.detailSections || []
  let detailSectionsFixed = 0
  const fixedDetailSections = await Promise.all(
    existingDetailSections.map(async (item: any, index: number) => {
      if (needsMigration(item.image)) {
        console.log(`   🔧 Fixing detailSections[${index}] image`)
        if (item.title) {
          console.log(`      Title: "${item.title}"`)
        }
        const fixedImage = await convertToImageObject(item.image)
        if (fixedImage) {
          detailSectionsFixed++
          return {
            ...item,
            image: fixedImage,
          }
        } else {
          console.warn(`   ⚠️  Could not convert detailSections[${index}] image, keeping original`)
          return item
        }
      }
      return item
    })
  )

  // Check if any fixes are needed
  if (!heroImageFixed && galleryFixed === 0 && galleryItemsFixed === 0 && detailSectionsFixed === 0) {
    console.log(`\n✅ No migration needed - all images are already in correct format`)
    return
  }

  console.log(`\n📊 Summary:`)
  if (heroImageFixed) {
    console.log(`   heroImage: fixed`)
  }
  if (galleryFixed > 0) {
    console.log(`   gallery[]: ${existingGallery.length} items, ${galleryFixed} fixed`)
  }
  console.log(`   galleryItems: ${existingGalleryItems.length} items, ${galleryItemsFixed} fixed`)
  console.log(`   detailSections: ${existingDetailSections.length} items, ${detailSectionsFixed} fixed`)

  // Patch the document
  console.log('\n💾 Updating Sanity document...')
  
  const patch = client.patch(plant._id)
  
  // Patch heroImage if fixed
  if (heroImageFixed) {
    console.log(`   ✅ Patching heroImage`)
    patch.set({heroImage: fixedHeroImage})
  }
  
  // Patch gallery[] if any items were fixed (but keep it untouched otherwise)
  if (galleryFixed > 0) {
    console.log(`   ✅ Patching gallery[] with ${fixedGallery.length} items (${galleryFixed} fixed)`)
    patch.set({gallery: fixedGallery})
  }
  
  // Only patch galleryItems if we have items
  if (fixedGalleryItems.length > 0) {
    console.log(`   ✅ Patching galleryItems with ${fixedGalleryItems.length} items`)
    patch.set({galleryItems: fixedGalleryItems})
  } else if (existingGalleryItems.length === 0) {
    console.log(`   ⚠️  galleryItems is empty, skipping patch`)
  }
  
  if (fixedDetailSections.length > 0) {
    console.log(`   ✅ Patching detailSections with ${fixedDetailSections.length} items`)
    patch.set({detailSections: fixedDetailSections})
  } else if (existingDetailSections.length === 0) {
    console.log(`   ⚠️  detailSections is empty, skipping patch`)
  }
  
  await patch.commit()

  console.log('✅ Document updated successfully')
  console.log('\n✨ Migration complete!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
