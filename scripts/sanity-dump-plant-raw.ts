#!/usr/bin/env node

/**
 * Dump raw Sanity document shape for a plant to verify what Studio is validating.
 * 
 * This is a read-only debugging script that fetches the published plant document
 * and prints the raw asset objects without dereferencing them.
 * 
 * Usage:
 *   npm run sanity:dump-plant-raw -- --slug saguaro-cactus
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

// Create Sanity client (read-only, token optional for read operations)
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token, // Optional for read operations, but included if available
})

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:dump-plant-raw -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Fetching raw plant document for: ${slug}\n`)

  // Fetch the published plant document (exclude drafts)
  // Query must NOT dereference assets (no asset->) - just get raw asset objects
  console.log('📄 Fetching published document (read-only)...')
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug && !(_id match "drafts.*")][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage{
        asset,
        crop,
        hotspot
      },
      gallery[]{
        asset,
        crop,
        hotspot
      },
      galleryItems[]{
        _key,
        key,
        image{
          asset,
          crop,
          hotspot
        },
        title,
        description,
        alt
      },
      detailSections[]{
        _key,
        key,
        image{
          asset,
          crop,
          hotspot
        },
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

  console.log(`✅ Found published plant: ${plant.title} (ID: ${plant._id})\n`)

  // Print raw JSON for the specified fields
  console.log(`${'='.repeat(60)}`)
  console.log('📋 RAW ASSET OBJECTS (as stored in Sanity)')
  console.log(`${'='.repeat(60)}\n`)

  // heroImage.asset
  console.log('🖼️  heroImage.asset:')
  console.log(JSON.stringify(plant.heroImage?.asset || null, null, 2))
  console.log()

  // gallery[].asset
  console.log('📸 gallery[].asset:')
  if (plant.gallery && Array.isArray(plant.gallery)) {
    plant.gallery.forEach((item: any, index: number) => {
      console.log(`   gallery[${index}].asset:`)
      console.log(JSON.stringify(item?.asset || null, null, 2))
      console.log()
    })
  } else {
    console.log(JSON.stringify(null, null, 2))
    console.log()
  }

  // galleryItems[].image.asset
  console.log('🖼️  galleryItems[].image.asset:')
  if (plant.galleryItems && Array.isArray(plant.galleryItems)) {
    plant.galleryItems.forEach((item: any, index: number) => {
      console.log(`   galleryItems[${index}].image.asset:`)
      console.log(JSON.stringify(item?.image?.asset || null, null, 2))
      console.log()
    })
  } else {
    console.log(JSON.stringify(null, null, 2))
    console.log()
  }

  // detailSections[].image.asset
  console.log('📋 detailSections[].image.asset:')
  if (plant.detailSections && Array.isArray(plant.detailSections)) {
    plant.detailSections.forEach((item: any, index: number) => {
      console.log(`   detailSections[${index}].image.asset:`)
      console.log(JSON.stringify(item?.image?.asset || null, null, 2))
      console.log()
    })
  } else {
    console.log(JSON.stringify(null, null, 2))
    console.log()
  }

  console.log(`${'='.repeat(60)}`)
  console.log('✨ Raw dump complete (read-only operation)\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

