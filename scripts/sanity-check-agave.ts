#!/usr/bin/env node

/**
 * Diagnostic script to check if Agave document exists in Sanity (draft and published)
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

if (!projectId || !dataset) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET in .env.local')
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
  console.log(`\n🔍 Checking Agave document in Sanity`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}`)
  console.log(`   API Version: ${apiVersion}\n`)

  // Query for published documents (exclude drafts)
  console.log('📄 Querying published documents...')
  const published = await client.fetch(
    `*[_type == "plant" && slug.current == "agave" && !(_id match "drafts.*")]{
      _id,
      _type,
      _rev,
      _updatedAt,
      title,
      slug,
      heroImage{
        asset{
          _ref,
          _type
        }
      }
    }`
  )

  console.log(`   Found ${published.length} published document(s):`)
  published.forEach((doc: any) => {
    console.log(`   - ID: ${doc._id}`)
    console.log(`     Title: ${doc.title}`)
    console.log(`     Slug: ${doc.slug?.current || 'N/A'}`)
    console.log(`     Hero Image Ref: ${doc.heroImage?.asset?._ref || 'MISSING'}`)
    console.log(`     Updated: ${doc._updatedAt || 'N/A'}`)
  })

  // Query for draft documents
  console.log('\n📄 Querying draft documents...')
  const drafts = await client.fetch(
    `*[_id match "drafts.*" && _type=="plant" && slug.current=="agave"]{
      _id,
      _type,
      _rev,
      _updatedAt,
      title,
      slug,
      heroImage{
        asset{
          _ref,
          _type
        }
      }
    }`
  )

  console.log(`   Found ${drafts.length} draft document(s):`)
  drafts.forEach((doc: any) => {
    console.log(`   - ID: ${doc._id}`)
    console.log(`     Title: ${doc.title}`)
    console.log(`     Slug: ${doc.slug?.current || 'N/A'}`)
    console.log(`     Hero Image Ref: ${doc.heroImage?.asset?._ref || 'MISSING'}`)
    console.log(`     Updated: ${doc._updatedAt || 'N/A'}`)
  })

  // Query all documents (raw perspective)
  console.log('\n📄 Querying all documents (raw perspective)...')
  const all = await client.fetch(
    `*[_type == "plant" && slug.current == "agave"]{
      _id,
      _type,
      _rev,
      _updatedAt,
      title,
      slug,
      heroImage{
        asset{
          _ref,
          _type
        }
      }
    }`,
    {},
    {perspective: 'raw'}
  )

  console.log(`   Found ${all.length} document(s) in raw perspective:`)
  all.forEach((doc: any) => {
    const isDraft = doc._id.startsWith('drafts.')
    console.log(`   - ID: ${doc._id} ${isDraft ? '(DRAFT)' : '(PUBLISHED)'}`)
    console.log(`     Title: ${doc.title}`)
    console.log(`     Slug: ${doc.slug?.current || 'N/A'}`)
    console.log(`     Hero Image Ref: ${doc.heroImage?.asset?._ref || 'MISSING'}`)
    console.log(`     Updated: ${doc._updatedAt || 'N/A'}`)
  })

  console.log('\n✅ Diagnostic complete\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

