#!/usr/bin/env node

/**
 * One-time script to populate galleryItems and detailSections
 * for the Saguaro plant document in Sanity.
 * 
 * Safe to run multiple times (idempotent).
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'
import {saguaroCactus} from '../lib/plant-data/saguaro-cactus'

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

const SLUG = 'saguaro-cactus'

async function main() {
  console.log(`\n🔍 Fetching plant document with slug: ${SLUG}...`)

  // Fetch the plant document
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      gallery,
      galleryItems,
      detailSections
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

  // Check existing gallery
  const existingGallery = plant.gallery || []
  console.log(`📸 Found ${existingGallery.length} images in deprecated gallery field`)

  if (existingGallery.length === 0) {
    console.error('❌ No images found in deprecated gallery field')
    console.error('   Please upload images to the gallery field in Sanity Studio first')
    process.exit(1)
  }

  // Check if already populated (idempotency check)
  const hasGalleryItems = plant.galleryItems && plant.galleryItems.length > 0
  const hasDetailSections = plant.detailSections && plant.detailSections.length > 0

  if (hasGalleryItems && hasDetailSections) {
    console.log('⚠️  galleryItems and detailSections already populated')
    console.log(`   galleryItems: ${plant.galleryItems.length} items`)
    console.log(`   detailSections: ${plant.detailSections.length} items`)
    console.log('   Replacing with new data...')
  }

  // Prepare galleryItems from local data
  const galleryDetails = saguaroCactus.galleryDetails || []
  const galleryItems = galleryDetails
    .slice(0, Math.min(galleryDetails.length, existingGallery.length))
    .map((item, index) => {
      // Use the existing Sanity image reference from deprecated gallery
      const galleryImage = existingGallery[index]
      
      if (!galleryImage) {
        throw new Error(`Missing gallery image at index ${index}`)
      }

      // Build the gallery item object
      const galleryItem: any = {
        image: galleryImage, // This is the Sanity image reference object
      }
      
      if (item.title) {
        galleryItem.title = item.title
      }
      
      if (item.description) {
        galleryItem.description = item.description
      }
      
      galleryItem.alt = item.alt || `${saguaroCactus.commonName} - ${item.title || `Photo ${index + 1}`}`

      return galleryItem
    })

  console.log(`📝 Prepared ${galleryItems.length} galleryItems`)

  // Prepare detailSections from local data
  // Note: Schema requires image field, so we'll reuse gallery images
  const localDetailSections = saguaroCactus.detailSections || []
  const detailSections = localDetailSections.map((section, index) => {
    // Cycle through gallery images if we have more sections than images
    const imageIndex = index % existingGallery.length
    const galleryImage = existingGallery[imageIndex]

    if (!galleryImage) {
      throw new Error(`Missing gallery image at index ${imageIndex}`)
    }

    return {
      image: galleryImage, // Required by schema - Sanity image reference
      title: section.title,
      description: section.description,
      alt: section.alt || `${saguaroCactus.commonName} - ${section.title}`,
    }
  })

  console.log(`📝 Prepared ${detailSections.length} detailSections`)

  // Patch the document
  console.log('\n💾 Updating Sanity document...')
  
  await client
    .patch(plant._id)
    .set({
      galleryItems,
      detailSections,
    })
    .commit()

  console.log('✅ Document updated successfully')

  // Re-fetch to confirm
  console.log('\n🔍 Verifying update...')
  const updated = await client.fetch(
    `*[_id == $id][0]{
      galleryItems,
      detailSections
    }`,
    {id: plant._id}
  )

  console.log(`\n✅ Verification:`)
  console.log(`   galleryItems: ${updated.galleryItems?.length || 0} items`)
  if (updated.galleryItems && updated.galleryItems.length > 0) {
    const first = updated.galleryItems[0]
    console.log(`   First galleryItem: "${first.title || '(no title)'}"`)
  }
  console.log(`   detailSections: ${updated.detailSections?.length || 0} items`)
  if (updated.detailSections && updated.detailSections.length > 0) {
    const first = updated.detailSections[0]
    console.log(`   First detailSection: "${first.title}"`)
  }

  console.log('\n✨ Done!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
