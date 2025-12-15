#!/usr/bin/env node

/**
 * Update Creosote Bush text fields in Sanity.
 * Replaces filler text with real content.
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

const SLUG = 'creosote-bush'

async function main() {
  console.log(`\n🌵 Updating Creosote Bush content in Sanity`)
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
      "slug": slug.current
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

  // Prepare the content
  const quickIdChecklist = [
    'Evergreen desert shrub with small, resinous, glossy leaves that often smell strongly after rain',
    'Leaves are paired, with two small leaflets joined at the base, giving a distinctive "split leaf" look up close',
    'Small yellow flowers with five petals appear after moisture, most commonly in spring, with additional bloom possible later',
    'Fruit forms as fuzzy, white, ball-like seed pods',
    'Usually forms rounded, open shrubs across flats, bajadas, and washes, often in large stands'
  ]

  const seasonalNotes = 'Creosote bush can flower in spring and may also flower again in summer or fall when moisture is available. After rain, the leaves often deepen in color and release a strong desert "smell of rain" scent. In very dry periods, the plant conserves water by slowing growth and may look more sparse until the next rainfall cycle.'

  const uses = 'Creosote bush is primarily valued today as an ecological and landscape plant. It is extremely drought tolerant, thrives in full sun and well-drained soils, and is commonly used in native desert landscaping for low-water structure and habitat. It is also a dominant shrub in many desert ecosystems and is important for stabilizing soils and supporting desert plant communities.'

  const ethicsAndDisclaimers = 'This site is for education only and is not medical advice. Creosote bush is sometimes sold as "chaparral" in herbal products, and oral use has been associated with serious liver injury in case reports. Do not self-treat with chaparral or creosote preparations. Do not harvest from protected areas, and do not remove wild plants. If you want this species at home, use nursery-grown plants. Always follow local regulations and practice low-impact observation.'

  const wildlifeValue = 'Creosote bush flowers provide nectar and pollen for many desert pollinators, including native bees. The shrub also provides cover and shade used by small animals and birds, especially in hot conditions. Its presence can support broader desert biodiversity by acting as a long-lived, stable structure in the landscape.'

  const interestingFacts = [
    'The scent many people associate with desert rain is strongly linked to creosote\'s resinous leaves after rainfall.',
    'Creosote is one of the most widespread and dominant shrubs across the Sonoran, Mojave, and Chihuahuan Deserts.',
    'It can flower outside of spring when conditions are right, especially after rain events.',
    'The fuzzy seed pods are a distinctive clue after the yellow flowers fade.',
    'The plant\'s common name is about the smell, not because it is related to the industrial wood preservative called creosote.'
  ]

  // Update the document
  console.log(`💾 Updating text fields...`)
  
  const updated = await client
    .patch(plant._id)
    .set({
      quickIdChecklist,
      seasonalNotes,
      uses,
      ethicsAndDisclaimers,
      wildlifeValue,
      interestingFacts,
    })
    .commit()

  console.log(`✅ Document updated successfully\n`)

  // Fetch and display the updated fields
  console.log(`🔍 Verifying updated content...`)
  const verification = await client.fetch(
    `*[_type == "plant" && _id == $id][0]{
      _id,
      _rev,
      quickIdChecklist,
      seasonalNotes,
      uses,
      ethicsAndDisclaimers,
      wildlifeValue,
      interestingFacts
    }`,
    {id: plant._id}
  )

  console.log(`\n✅ Updated Document:`)
  console.log(`   _id: ${verification._id}`)
  console.log(`   _rev: ${verification._rev}`)
  console.log(`\n📋 Updated Fields:\n`)

  console.log(`quickIdChecklist (${verification.quickIdChecklist?.length || 0} items):`)
  verification.quickIdChecklist?.forEach((item: string, i: number) => {
    console.log(`   ${i + 1}. ${item}`)
  })

  console.log(`\nseasonalNotes:`)
  console.log(`   ${verification.seasonalNotes}`)

  console.log(`\nuses:`)
  console.log(`   ${verification.uses}`)

  console.log(`\nethicsAndDisclaimers:`)
  console.log(`   ${verification.ethicsAndDisclaimers}`)

  console.log(`\nwildlifeValue:`)
  console.log(`   ${verification.wildlifeValue}`)

  console.log(`\ninterestingFacts (${verification.interestingFacts?.length || 0} items):`)
  verification.interestingFacts?.forEach((item: string, i: number) => {
    console.log(`   ${i + 1}. ${item}`)
  })

  console.log(`\n✨ Update complete!`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})







