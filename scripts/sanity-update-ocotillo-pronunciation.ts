#!/usr/bin/env node

/**
 * Update Ocotillo "About this plant" content to add pronunciation link.
 * Adds inline pronunciation note with link to talklikealocal.org
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

const SLUG = 'ocotillo'

async function main() {
  console.log(`\n🌵 Updating Ocotillo pronunciation in Sanity`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}`)
  console.log(`   Slug: ${SLUG}\n`)

  // Find the document
  console.log(`🔍 Finding plant document...`)
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _rev,
      title,
      "slug": slug.current,
      about
    }`,
    {slug: SLUG}
  )

  if (!plant) {
    console.error(`❌ Plant document not found with slug: ${SLUG}`)
    process.exit(1)
  }

  console.log(`✅ Found document:`)
  console.log(`   _id: ${plant._id}`)
  console.log(`   _rev: ${plant._rev}`)
  console.log(`   title: ${plant.title}`)
  console.log(`   slug: ${plant.slug}\n`)

  // Prepare the updated content with pronunciation link
  // Format: [link text](url) will be parsed by the component
  const updatedAbout = 'The ocotillo (pronounced [oh-kuh-TEE-oh](https://talklikealocal.org#term-ocotillo)) is a unique desert shrub with long, spiny, wand-like stems that can reach up to 20 feet tall. After rainfall, it quickly produces small green leaves along the stems, which it sheds during dry periods. In spring, it produces clusters of bright red tubular flowers at the tips of its stems.'

  // Update the document
  console.log(`💾 Updating about field...`)
  
  const updated = await client
    .patch(plant._id)
    .set({
      about: updatedAbout,
    })
    .commit()

  console.log(`✅ Document updated successfully\n`)

  // Fetch and display the updated field
  console.log(`🔍 Verifying updated content...`)
  const verification = await client.fetch(
    `*[_type == "plant" && _id == $id][0]{
      _id,
      _rev,
      about
    }`,
    {id: plant._id}
  )

  console.log(`\n✅ Updated Document:`)
  console.log(`   _id: ${verification._id}`)
  console.log(`   _rev: ${verification._rev}`)
  console.log(`\n📋 Updated about field:\n`)
  console.log(`   ${verification.about}`)
  console.log(`\n✨ Update complete!`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

