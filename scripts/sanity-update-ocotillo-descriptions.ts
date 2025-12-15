#!/usr/bin/env node

/**
 * Update detailSections[].description for Ocotillo plant document.
 * 
 * This script updates only the description fields in detailSections,
 * matching them to the provided descriptions in order.
 * 
 * Usage:
 *   npm run sanity:update-ocotillo-descriptions
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

// Descriptions mapped by title/key
// Map each description to the corresponding section title or key
// Note: Some titles are duplicated, so we use keys for disambiguation
const descriptionMap: Record<string, string> = {
  // Match by title first, then by key for duplicates
  'Ocotillo': 'A mature ocotillo growing in open desert terrain, showing its tall, upright canes emerging from a single base.',
  'Ocotillo branches': 'Close view of ocotillo canes with small leaves emerging after rainfall, highlighting the plant\'s segmented growth pattern.',
  'Ocotillo closeup': 'Detailed look at ocotillo stems and bark texture, showing how leaves sprout directly from the canes.',
  'Ocotillo with leaves': 'An ocotillo fully leafed out following recent rain, giving the plant a dense, green appearance.',
  'Wild ocotillo family': 'A group of ocotillo plants growing naturally across a desert landscape, illustrating their spacing and growth habit.',
  'Dry ocotillo': 'A leafless ocotillo during a dry period, showing the bare canes that allow it to conserve water.',
  'Dry ocotillo closeup': 'Close view of dry ocotillo stems without leaves, emphasizing the plant\'s dormant appearance during drought.',
  'Ocotillo in habitat': 'Ocotillo growing among native desert vegetation, demonstrating its role as vertical structure in the Sonoran Desert ecosystem.',
}

// For duplicate titles, use key-based mapping
// Mapping based on the user's description list order:
// 1. Ocotillo, 2. Ocotillo branches, 3. Ocotillo closeup, 4. Ocotillo with leaves,
// 5. Wild ocotillo family, 6. Dry ocotillo, 7. Dry ocotillo closeup, 8. Ocotillo in habitat
const descriptionByKey: Record<string, string> = {
  'ocotillo': 'A mature ocotillo growing in open desert terrain, showing its tall, upright canes emerging from a single base.',
  'ocotilloBranches': 'Close view of ocotillo canes with small leaves emerging after rainfall, highlighting the plant\'s segmented growth pattern.',
  'ocotilloCloseup': 'Detailed look at ocotillo stems and bark texture, showing how leaves sprout directly from the canes.',
  'ocotilloWithLeaves': 'An ocotillo fully leafed out following recent rain, giving the plant a dense, green appearance.',
  'wildOcotilloFamily': 'A group of ocotillo plants growing naturally across a desert landscape, illustrating their spacing and growth habit.',
  'dryOcotillo2': 'A leafless ocotillo during a dry period, showing the bare canes that allow it to conserve water.',
  'dryOcotillo': 'Close view of dry ocotillo stems without leaves, emphasizing the plant\'s dormant appearance during drought.',
  'ocotillo4': 'Ocotillo growing among native desert vegetation, demonstrating its role as vertical structure in the Sonoran Desert ecosystem.',
}

async function main() {
  const slug = 'ocotillo'
  console.log(`\n🔍 Updating detailSections descriptions for plant: ${slug}\n`)

  // Fetch the published plant document (exclude drafts)
  console.log('📄 Fetching published document...')
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug && !(_id match "drafts.*")][0]{
      _id,
      _rev,
      _type,
      title,
      "slug": slug.current,
      detailSections[]{
        _key,
        key,
        title,
        description,
        image
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
  console.log(`   Current _rev: ${plant._rev}`)

  // Safety check: verify detailSections structure
  if (!plant.detailSections) {
    console.error(`❌ detailSections is missing or null`)
    process.exit(1)
  }

  if (!Array.isArray(plant.detailSections)) {
    console.error(`❌ detailSections is not an array (type: ${typeof plant.detailSections})`)
    process.exit(1)
  }

  const sectionCount = plant.detailSections.length
  console.log(`\n📊 Found ${sectionCount} detailSections`)

  // Display current sections and check for matching descriptions
  console.log(`\n📋 Current detailSections:`)
  const missingDescriptions: Array<{title: string; key: string}> = []
  plant.detailSections.forEach((section: any, index: number) => {
    const title = section.title || section.key || 'untitled'
    const key = section.key || ''
    // Try key first (for duplicates), then title
    const newDescription = descriptionByKey[key] || descriptionMap[title]
    console.log(`   ${index + 1}. Title: "${title}", Key: "${key}"`)
    console.log(`      Current description: ${section.description ? `"${section.description.substring(0, 60)}..."` : '(empty)'}`)
    if (!newDescription) {
      missingDescriptions.push({title, key})
    }
  })

  if (missingDescriptions.length > 0) {
    console.error(`\n❌ Missing descriptions for the following sections:`)
    missingDescriptions.forEach(({title, key}) => console.error(`   - Title: "${title}", Key: "${key}"`))
    process.exit(1)
  }

  // Update descriptions by matching key first, then title
  console.log(`\n🔧 Updating descriptions...`)
  const updatedSections = plant.detailSections.map((section: any, index: number) => {
    const title = section.title || section.key || 'untitled'
    const key = section.key || ''
    // Try key first (for duplicates), then title
    const newDescription = descriptionByKey[key] || descriptionMap[title]
    if (!newDescription) {
      console.error(`   ❌ No description found for: Title "${title}", Key "${key}"`)
      return section // Keep original if no match
    }
    console.log(`   ${index + 1}. ${title} (key: ${key})`)
    console.log(`      New description: "${newDescription.substring(0, 60)}..."`)
    return {
      ...section,
      description: newDescription,
    }
  })

  // Patch the document
  console.log(`\n💾 Updating published document...`)
  try {
    const result = await client
      .patch(plant._id)
      .set({detailSections: updatedSections})
      .commit()
    
    console.log(`✅ Document updated successfully`)
    console.log(`   New _rev: ${result._rev}`)
  } catch (error) {
    console.error(`\n❌ Error updating document:`, error)
    process.exit(1)
  }

  // Verification: re-fetch and verify
  console.log(`\n🔍 Verifying updates...`)
  const verified = await client.fetch(
    `*[_type == "plant" && slug.current == $slug && !(_id match "drafts.*")][0]{
      _id,
      _rev,
      detailSections[]{
        _key,
        key,
        title,
        description
      }
    }`,
    {slug}
  )

  if (!verified) {
    console.error(`❌ Could not re-fetch document for verification`)
    process.exit(1)
  }

  // Verify each description
  console.log(`\n${'='.repeat(60)}`)
  console.log('📋 VERIFICATION SUMMARY')
  console.log(`${'='.repeat(60)}`)
  
  let allValid = true
  verified.detailSections.forEach((section: any, index: number) => {
    const title = section.title || section.key || 'untitled'
    const key = section.key || ''
    // Try key first (for duplicates), then title
    const expected = descriptionByKey[key] || descriptionMap[title]
    const actual = section.description
    const matches = actual === expected
    const status = matches ? '✅' : '❌'
    
    console.log(`${status} Section ${index + 1}: ${title} (key: ${key})`)
    if (!matches) {
      console.log(`   Expected: "${expected}"`)
      console.log(`   Actual: "${actual}"`)
      allValid = false
    } else {
      console.log(`   Description: "${actual.substring(0, 60)}..."`)
    }
  })

  console.log(`\n📊 Summary:`)
  console.log(`   Total sections: ${verified.detailSections.length}`)
  console.log(`   Updated _rev: ${verified._rev}`)
  console.log(`   All descriptions match: ${allValid ? '✅' : '❌'}`)

  if (!allValid) {
    console.error(`\n❌ Verification failed: Some descriptions do not match`)
    process.exit(1)
  }

  console.log(`\n✨ All detailSections descriptions have been updated successfully!\n`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

