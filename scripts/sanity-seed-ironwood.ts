#!/usr/bin/env node

/**
 * Seed script for Ironwood plant in Sanity.
 * 
 * This script:
 * 1. Creates a new plant document in Sanity (slug: "ironwood")
 * 2. Populates minimal required fields:
 *    - title: "Desert Ironwood"
 *    - slug: "ironwood"
 *    - scientificName: "Olneya tesota"
 *    - about: "TODO" (placeholder for content to be added later)
 * 
 * Safe to run multiple times (idempotent).
 * Does NOT upload images - those should be added via Sanity Studio.
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'

// Load environment variables from .env.local
config({path: resolve(process.cwd(), '.env.local')})

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'drx93rd4'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'
const token = process.env.SANITY_API_WRITE_TOKEN

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

const SLUG = 'ironwood'
const COMMON_NAME = 'Desert Ironwood'
const SCIENTIFIC_NAME = 'Olneya tesota'

async function main() {
  console.log(`\n🌵 Seeding Ironwood plant in Sanity`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}`)
  console.log(`   Slug: ${SLUG}\n`)

  // Find or create plant document
  console.log(`🔍 Finding plant document in Sanity...`)
  let plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
    }`,
    {slug: SLUG}
  )

  if (!plant) {
    console.log(`   📝 Creating new plant document...`)
    // Create new document with minimal required fields
    plant = await client.create({
      _type: 'plant',
      title: COMMON_NAME,
      slug: {
        _type: 'slug',
        current: SLUG,
      },
      scientificName: SCIENTIFIC_NAME,
      about: 'TODO', // Placeholder for content to be added later
    })
    console.log(`   ✅ Created plant document (ID: ${plant._id})`)
    console.log(`   📝 Title: ${COMMON_NAME}`)
    console.log(`   📝 Scientific Name: ${SCIENTIFIC_NAME}`)
    console.log(`   📝 Slug: ${SLUG}`)
    console.log(`\n✨ Seed complete!`)
    console.log(`   You can now add images and content via Sanity Studio.`)
  } else {
    console.log(`   ✅ Found existing plant document (ID: ${plant._id})`)
    console.log(`   📝 Title: ${plant.title}`)
    console.log(`   📝 Slug: ${plant.slug}`)
    console.log(`\n✨ Plant already exists - no changes made.`)
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

