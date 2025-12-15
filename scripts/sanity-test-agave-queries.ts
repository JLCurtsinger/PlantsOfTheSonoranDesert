#!/usr/bin/env node

/**
 * Test script to verify Agave appears in queries
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'
import {allPlantsQuery, plantBySlugQuery} from '../lib/sanity/queries'

// Load environment variables from .env.local
config({path: resolve(process.cwd(), '.env.local')})

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'

if (!projectId || !dataset) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET')
  process.exit(1)
}

// Create Sanity client WITHOUT token (read-only, matches app behavior)
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Match development behavior
})

async function main() {
  console.log(`\n🔍 Testing queries for Agave`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}\n`)

  // Test allPlantsQuery
  console.log('📋 Testing allPlantsQuery...')
  const allPlants = await client.fetch(allPlantsQuery)
  console.log(`   Found ${allPlants.length} plants`)
  const agaveInAll = allPlants.find((p: any) => p.slug === 'agave')
  if (agaveInAll) {
    console.log(`   ✅ Agave found in allPlantsQuery:`)
    console.log(`      ID: ${agaveInAll._id}`)
    console.log(`      Title: ${agaveInAll.title}`)
    console.log(`      Has heroImage: ${!!agaveInAll.heroImage}`)
  } else {
    console.log(`   ❌ Agave NOT found in allPlantsQuery`)
    console.log(`   Plant slugs found: ${allPlants.map((p: any) => p.slug).join(', ')}`)
  }

  // Test plantBySlugQuery
  console.log('\n📋 Testing plantBySlugQuery with slug "agave"...')
  const agaveBySlug = await client.fetch(plantBySlugQuery, {slug: 'agave'})
  if (agaveBySlug) {
    console.log(`   ✅ Agave found by slug:`)
    console.log(`      ID: ${agaveBySlug._id}`)
    console.log(`      Title: ${agaveBySlug.title}`)
    console.log(`      Has heroImage: ${!!agaveBySlug.heroImage}`)
    console.log(`      Has about: ${!!agaveBySlug.about}`)
  } else {
    console.log(`   ❌ Agave NOT found by slug`)
  }

  // Test raw query
  console.log('\n📋 Testing raw query (all perspectives)...')
  const rawAgave = await client.fetch(
    `*[_type == "plant" && slug.current == "agave"]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage
    }`,
    {},
    {perspective: 'raw'}
  )
  console.log(`   Found ${rawAgave.length} document(s)`)
  rawAgave.forEach((doc: any) => {
    const isDraft = doc._id.startsWith('drafts.')
    console.log(`   - ${doc._id} ${isDraft ? '(DRAFT)' : '(PUBLISHED)'}`)
    console.log(`     Title: ${doc.title}`)
    console.log(`     Has heroImage: ${!!doc.heroImage}`)
  })

  // Test published-only query (default)
  console.log('\n📋 Testing published-only query (default perspective)...')
  const publishedAgave = await client.fetch(
    `*[_type == "plant" && slug.current == "agave" && !(_id match "drafts.*")]{
      _id,
      title,
      "slug": slug.current,
      heroImage
    }`
  )
  console.log(`   Found ${publishedAgave.length} published document(s)`)
  if (publishedAgave.length > 0) {
    console.log(`   ✅ Agave exists as published document`)
  } else {
    console.log(`   ❌ Agave does NOT exist as published document`)
  }

  console.log('\n✅ Query test complete\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

