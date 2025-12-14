#!/usr/bin/env node

/**
 * Clear invalid galleryItems and detailSections fields from a plant document.
 * 
 * This script removes the derived fields that are causing Studio validation errors,
 * without touching heroImage, gallery[], or any other fields.
 * 
 * Usage:
 *   npm run sanity:clear-derived-fields -- --slug saguaro-cactus
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

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:clear-derived-fields -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Clearing derived fields for plant: ${slug}`)

  // Fetch the plant document from Sanity
  console.log(`\n🔍 Fetching plant document from Sanity...`)
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      galleryItems,
      detailSections
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

  // Check what fields exist
  const hasGalleryItems = plant.galleryItems && plant.galleryItems.length > 0
  const hasDetailSections = plant.detailSections && plant.detailSections.length > 0

  if (!hasGalleryItems && !hasDetailSections) {
    console.log(`\n✅ No derived fields to clear - galleryItems and detailSections are already empty or missing`)
    return
  }

  console.log(`\n📊 Current state:`)
  if (hasGalleryItems) {
    console.log(`   galleryItems: ${plant.galleryItems.length} items (will be removed)`)
  } else {
    console.log(`   galleryItems: empty or missing`)
  }
  if (hasDetailSections) {
    console.log(`   detailSections: ${plant.detailSections.length} items (will be removed)`)
  } else {
    console.log(`   detailSections: empty or missing`)
  }

  // Patch the document - unset only galleryItems and detailSections
  console.log('\n💾 Updating Sanity document...')
  console.log('   ⚠️  This will remove galleryItems and detailSections fields')
  console.log('   ✅ heroImage, gallery[], and all other fields will remain untouched')
  
  const patch = client.patch(plant._id)
  
  // Unset galleryItems if it exists
  if (hasGalleryItems) {
    console.log(`   🗑️  Removing galleryItems field`)
    patch.unset(['galleryItems'])
  }
  
  // Unset detailSections if it exists
  if (hasDetailSections) {
    console.log(`   🗑️  Removing detailSections field`)
    patch.unset(['detailSections'])
  }
  
  await patch.commit()

  console.log('✅ Document updated successfully')
  console.log('\n✨ Derived fields cleared!')
  console.log('   Sanity Studio should no longer show validation errors for these fields.\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
