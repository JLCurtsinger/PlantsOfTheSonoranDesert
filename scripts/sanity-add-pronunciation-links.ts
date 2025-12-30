#!/usr/bin/env node

/**
 * Script to add pronunciation links to the "About this plant" content for:
 * - Agave
 * - Creosote (Creosote Bush)
 * - Palo Verde
 * 
 * Adds inline pronunciation notes with links to talklikealocal.org
 * Links open in a new tab (handled by parseDescriptionWithLinks function)
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

// Plant updates configuration
const PLANT_UPDATES = [
  {
    slug: 'agave',
    plantName: 'Agave',
    pronunciation: 'uh-GAH-vay',
    pronunciationLink: 'https://talklikealocal.org#term-agave',
    currentAbout: 'Agaves are iconic succulents of the Sonoran Desert, known for their dramatic rosette forms and spiky leaves. These slow-growing perennials can live for decades, with many species flowering only once at the end of their life cycle. Agaves have been used by desert peoples for millennia for food, fiber, and medicine, and they provide important habitat and food sources for wildlife.',
  },
  {
    slug: 'creosote-bush',
    plantName: 'Creosote',
    pronunciation: 'kree-uh-soht',
    pronunciationLink: 'https://talklikealocal.org#term-creosote',
    currentAbout: 'Creosote bush is one of the most common and resilient shrubs in the Sonoran Desert. It\'s known for its distinctive \'desert rain\' smell after storms and for surviving extreme heat and drought. This evergreen shrub features small, waxy leaves; yellow five-petaled flowers; and fuzzy white seed heads later in the season, often forming wide, rounded mounds. It thrives in desert flats, bajadas, and open scrub across the Sonoran Desert, preferring full sun and well-drained soils. Often blooms after rainfall, commonly in spring and sometimes again after summer monsoons. Creosote has a long history of traditional use, especially as an herbal preparation. It can be irritating or unsafe if misused, so this site treats it as an educational reference rather than a guide for ingestion. A keystone desert plant that provides cover and micro-habitat for insects and small wildlife.',
  },
  {
    slug: 'palo-verde',
    plantName: 'Palo Verde',
    pronunciation: 'PAH-loh VER-day',
    pronunciationLink: 'https://talklikealocal.org#term-palo-verde',
    currentAbout: 'Palo verdes are distinctive desert trees and shrubs known for their green, photosynthetic bark—a remarkable adaptation that allows them to continue producing energy even when their small leaves drop during drought. These drought-deciduous plants are well-adapted to arid conditions, with multiple palo verde species occurring throughout the Sonoran Desert. They produce clusters of bright yellow, pea-like flowers in spring, followed by bean-like seed pods. The appearance of palo verdes can vary by species and environmental conditions, with some growing as small trees and others as larger shrubs. Their green bark is one of their most distinctive features, making them easily recognizable even when leafless. Palo verdes play an important role in desert ecosystems, providing food and shelter for wildlife, and their flowers are an important nectar source for pollinators during spring blooms.',
  },
]

/**
 * Adds pronunciation note to the first occurrence of the plant name in the about text.
 * Uses markdown-style links: [text](url)
 * Handles both singular and plural forms.
 */
function addPronunciationNote(
  aboutText: string,
  plantName: string,
  pronunciation: string,
  pronunciationLink: string
): string {
  // Escape special regex characters
  const escapedName = plantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  
  // Try to match plural form first (plant name + 's' or 'es' at word boundary)
  // Then try singular form followed by space/punctuation (not 's')
  const pluralRegex = new RegExp(`(${escapedName}s|${escapedName}es)\\b`, 'i')
  const singularRegex = new RegExp(`(${escapedName})(?![a-z])`, 'i')
  
  let match = aboutText.match(pluralRegex)
  let isPlural = true
  
  if (!match) {
    // Try singular form
    match = aboutText.match(singularRegex)
    isPlural = false
  }
  
  if (!match) {
    console.warn(`   ⚠️  Warning: Could not find "${plantName}" in about text`)
    return aboutText
  }
  
  const index = match.index!
  const beforeMatch = aboutText.substring(0, index)
  const matchedText = match[1]
  const afterMatch = aboutText.substring(index + matchedText.length)
  
  // Insert pronunciation note in parentheses after the plant name
  // Format: Plant Name (pronounced [pronunciation](link))
  const updatedText = `${beforeMatch}${matchedText} (pronounced [${pronunciation}](${pronunciationLink}))${afterMatch}`
  
  return updatedText
}

async function updatePlant(update: typeof PLANT_UPDATES[0]) {
  console.log(`\n🌵 Updating ${update.plantName} (slug: ${update.slug})...`)
  
  // Fetch current plant document
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      title,
      "slug": slug.current,
      about
    }`,
    {slug: update.slug}
  )
  
  if (!plant) {
    console.error(`   ❌ Plant not found in Sanity (slug: ${update.slug})`)
    return false
  }
  
  console.log(`   ✅ Found plant document (ID: ${plant._id})`)
  
  // Get current about text (use fetched value if different from expected)
  let currentAbout = plant.about || update.currentAbout
  
  // Check if pronunciation link already exists - if so, verify it's correctly placed
  if (currentAbout.includes(update.pronunciationLink)) {
    // Check if the insertion is incorrect (pronunciation note before 's' in plural)
    const incorrectPattern = new RegExp(`${update.plantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(pronounced.*?\\)s`, 'i')
    if (incorrectPattern.test(currentAbout)) {
      console.log(`   🔧 Found incorrectly placed pronunciation note, fixing...`)
      // Remove the incorrect pronunciation note
      currentAbout = currentAbout.replace(
        new RegExp(`(${update.plantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*\\(pronounced.*?\\)(s)`, 'i'),
        '$1$2'
      )
      // Now it will be re-added correctly below
    } else {
      console.log(`   ℹ️  Pronunciation link already exists and is correctly placed, skipping...`)
      return true
    }
  }
  
  // Add pronunciation note
  const updatedAbout = addPronunciationNote(
    currentAbout,
    update.plantName,
    update.pronunciation,
    update.pronunciationLink
  )
  
  // Update the document
  console.log(`   💾 Updating about field...`)
  await client
    .patch(plant._id)
    .set({about: updatedAbout})
    .commit()
  
  console.log(`   ✅ Successfully updated ${update.plantName}`)
  
  // Verify update
  const verification = await client.fetch(
    `*[_type == "plant" && _id == $id][0]{about}`,
    {id: plant._id}
  )
  
  if (verification.about === updatedAbout) {
    console.log(`   ✅ Verification passed`)
    return true
  } else {
    console.error(`   ❌ Verification failed`)
    return false
  }
}

async function main() {
  console.log(`\n🔗 Adding pronunciation links to plant descriptions`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}\n`)
  
  const results = await Promise.all(
    PLANT_UPDATES.map(update => updatePlant(update))
  )
  
  const successCount = results.filter(Boolean).length
  const totalCount = PLANT_UPDATES.length
  
  console.log(`\n✨ Update complete!`)
  console.log(`   Successfully updated: ${successCount}/${totalCount} plants`)
  
  if (successCount < totalCount) {
    console.error(`\n❌ Some updates failed`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

