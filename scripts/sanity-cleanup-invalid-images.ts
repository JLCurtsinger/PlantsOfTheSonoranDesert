#!/usr/bin/env node

/**
 * Cleanup script to remove invalid image references from galleryItems and detailSections.
 * 
 * This script:
 * 1. Fetches a plant document by slug
 * 2. Filters galleryItems to only those with valid images
 * 3. Filters detailSections to only those with valid images
 * 4. Patches the document ONLY if filtered arrays have items (never wipes)
 * 
 * Usage:
 *   npm run sanity:cleanup-invalid-images -- --slug saguaro-cactus
 * 
 * Safe to run multiple times (idempotent).
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
 * Validates that a Sanity image reference has a valid asset reference.
 * Returns true if image?.asset?._ref OR image?.asset?._id exists.
 */
function isValidSanityImage(image: any): boolean {
  return !!(image?.asset?._ref || image?.asset?._id)
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:cleanup-invalid-images -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Cleaning up invalid images for plant: ${slug}`)

  // Fetch the plant document from Sanity
  console.log(`\n🔍 Fetching plant document from Sanity...`)
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      galleryItems[]{
        _key,
        key,
        image{
          ...,
          asset->{
            _id,
            _ref
          }
        },
        title,
        description,
        alt
      },
      detailSections[]{
        _key,
        key,
        image{
          ...,
          asset->{
            _id,
            _ref
          }
        },
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

  // Filter galleryItems - preserve _key when filtering
  const existingGalleryItems = plant.galleryItems || []
  const validGalleryItems = existingGalleryItems
    .filter((item: any) => isValidSanityImage(item?.image))
    .map((item: any) => ({
      // Preserve _key if it exists, otherwise use key field as _key
      _key: item._key || item.key,
      key: item.key,
      image: item.image,
      title: item.title,
      description: item.description,
      alt: item.alt,
    }))
  const invalidGalleryCount = existingGalleryItems.length - validGalleryItems.length

  console.log(`\n📸 GalleryItems:`)
  console.log(`   Existing: ${existingGalleryItems.length}`)
  console.log(`   Valid: ${validGalleryItems.length}`)
  if (invalidGalleryCount > 0) {
    console.log(`   Invalid (will be removed): ${invalidGalleryCount}`)
  }

  // Filter detailSections - preserve _key when filtering
  const existingDetailSections = plant.detailSections || []
  const validDetailSections = existingDetailSections
    .filter((section: any) => isValidSanityImage(section?.image))
    .map((section: any) => ({
      // Preserve _key if it exists, otherwise use key field as _key
      _key: section._key || section.key,
      key: section.key,
      image: section.image,
      title: section.title,
      description: section.description,
      alt: section.alt,
    }))
  const invalidDetailCount = existingDetailSections.length - validDetailSections.length

  console.log(`\n📸 DetailSections:`)
  console.log(`   Existing: ${existingDetailSections.length}`)
  console.log(`   Valid: ${validDetailSections.length}`)
  if (invalidDetailCount > 0) {
    console.log(`   Invalid (will be removed): ${invalidDetailCount}`)
  }

  // Check if cleanup is needed
  const needsCleanup = 
    invalidGalleryCount > 0 || 
    invalidDetailCount > 0 ||
    (existingGalleryItems.length === 0 && validGalleryItems.length === 0 && existingDetailSections.length === 0 && validDetailSections.length === 0)

  if (!needsCleanup) {
    console.log(`\n✅ No cleanup needed - all images are valid`)
    return
  }

  // Patch the document
  console.log('\n💾 Updating Sanity document...')
  
  const patch = client.patch(plant._id)
  
  // Only patch galleryItems if we have valid items
  if (validGalleryItems.length > 0) {
    console.log(`   ✅ Patching galleryItems with ${validGalleryItems.length} valid items`)
    patch.set({galleryItems: validGalleryItems})
  } else if (invalidGalleryCount > 0) {
    console.log(`   ⚠️  Skipping galleryItems patch (no valid items remaining - will not wipe)`)
  }
  
  // Only patch detailSections if we have valid items
  if (validDetailSections.length > 0) {
    console.log(`   ✅ Patching detailSections with ${validDetailSections.length} valid items`)
    patch.set({detailSections: validDetailSections})
  } else if (invalidDetailCount > 0) {
    console.log(`   ⚠️  Skipping detailSections patch (no valid items remaining - will not wipe)`)
  }
  
  await patch.commit()

  console.log('✅ Document updated successfully')

  // Re-fetch to confirm
  console.log('\n🔍 Verifying update...')
  const updated = await client.fetch(
    `*[_id == $id][0]{
      galleryItems[]{
        _key,
        key,
        title
      },
      detailSections[]{
        _key,
        key,
        title
      }
    }`,
    {id: plant._id}
  )

  console.log(`\n✅ Verification:`)
  console.log(`   galleryItems: ${updated.galleryItems?.length || 0} items`)
  if (updated.galleryItems && updated.galleryItems.length > 0) {
    updated.galleryItems.forEach((item: any, i: number) => {
      console.log(`   [${i + 1}] key: "${item.key}", title: "${item.title || '(no title)'}"`)
    })
  }
  console.log(`   detailSections: ${updated.detailSections?.length || 0} items`)
  if (updated.detailSections && updated.detailSections.length > 0) {
    updated.detailSections.forEach((item: any, i: number) => {
      console.log(`   [${i + 1}] key: "${item.key}", title: "${item.title}"`)
    })
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Removed ${invalidGalleryCount} invalid galleryItems`)
  console.log(`   Removed ${invalidDetailCount} invalid detailSections`)
  console.log(`   Final counts: ${validGalleryItems.length} galleryItems, ${validDetailSections.length} detailSections`)

  console.log('\n✨ Cleanup complete!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
