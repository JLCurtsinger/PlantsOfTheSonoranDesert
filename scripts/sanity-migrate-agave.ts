#!/usr/bin/env node

/**
 * Migration script for Agave plant to Sanity.
 * 
 * This script:
 * 1. Finds or creates the plant document in Sanity (slug: "agave")
 * 2. Uploads hero image (lakeside-agave.jpeg) to Sanity as image asset
 * 3. Populates the document with:
 *    - title: "Agave"
 *    - slug.current: "agave"
 *    - scientificName: "Agave spp."
 *    - about: short intro for agaves in the Sonoran Desert
 *    - heroImage (image ref)
 *    - Empty arrays for gallery and detailSections
 *    - Empty optional text fields (seasonalNotes, uses, etc.) that pass validation
 * 
 * Hardening features:
 * - Never writes asset._id, always uses asset: { _ref: "...", _type: "reference" }
 * - Idempotent: re-running updates the same doc by slug
 * - Fails loudly if hero image file is missing
 * 
 * Safe to run multiple times (idempotent).
 * Does NOT modify sortOrder.
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'
import {readFileSync, existsSync} from 'fs'

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

const SLUG = 'agave'
const PUBLIC_DIR = resolve(process.cwd(), 'public')
const HERO_IMAGE_PATH = 'images/agave/lakeside-agave.jpeg'
const HERO_IMAGE_FULL_PATH = resolve(PUBLIC_DIR, HERO_IMAGE_PATH)

// About text for Agave in the Sonoran Desert
const ABOUT_TEXT = `Agaves are iconic succulents of the Sonoran Desert, known for their dramatic rosette forms and spiky leaves. These slow-growing perennials can live for decades, with many species flowering only once at the end of their life cycle. Agaves have been used by desert peoples for millennia for food, fiber, and medicine, and they provide important habitat and food sources for wildlife.`

/**
 * Uploads an image file to Sanity and returns the asset reference.
 */
async function uploadImage(imagePath: string): Promise<string> {
  const fullPath = resolve(PUBLIC_DIR, imagePath.replace(/^\//, ''))
  
  try {
    const buffer = readFileSync(fullPath)
    const filename = imagePath.split('/').pop() || 'image'
    
    console.log(`   📤 Uploading: ${imagePath}`)
    
    const asset = await client.assets.upload('image', buffer, {
      filename,
      contentType: imagePath.endsWith('.webp') ? 'image/webp' : 
                   imagePath.endsWith('.jpeg') || imagePath.endsWith('.jpg') ? 'image/jpeg' :
                   imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg',
    })
    
    console.log(`   ✅ Uploaded: ${filename} (asset ID: ${asset._id})`)
    return asset._id
  } catch (error: any) {
    console.error(`   ❌ Failed to upload ${imagePath}:`, error.message)
    throw error
  }
}

/**
 * Creates an image reference object for Sanity.
 * HARDENED: Never uses asset._id, always uses asset: { _ref: "...", _type: "reference" }
 */
function createImageRef(assetId: string) {
  return {
    _type: 'image' as const,
    asset: {
      _type: 'reference' as const,
      _ref: assetId,
    },
  }
}

async function main() {
  console.log(`\n🌵 Migrating Agave to Sanity`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}`)
  console.log(`   Slug: ${SLUG}\n`)

  // Check if hero image file exists
  if (!existsSync(HERO_IMAGE_FULL_PATH)) {
    console.error(`\n❌ Hero image file not found at expected path:`)
    console.error(`   ${HERO_IMAGE_FULL_PATH}`)
    console.error(`\n   Please add the file at:`)
    console.error(`   /public/images/agave/lakeside-agave.jpeg`)
    console.error(`   and rerun this script.\n`)
    process.exit(1)
  }

  console.log(`✅ Hero image file found: ${HERO_IMAGE_PATH}`)

  // Find or create plant document
  console.log(`\n🔍 Finding plant document in Sanity...`)
  let plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage
    }`,
    {slug: SLUG}
  )

  if (!plant) {
    console.log(`   📝 Creating new plant document...`)
    // Create new document with minimal required fields
    plant = await client.create({
      _type: 'plant',
      title: 'Agave',
      slug: {
        _type: 'slug',
        current: SLUG,
      },
      scientificName: 'Agave spp.',
      about: ABOUT_TEXT,
    })
    console.log(`   ✅ Created plant document (ID: ${plant._id})`)
  } else {
    console.log(`   ✅ Found existing plant document (ID: ${plant._id})`)
  }

  // Upload hero image
  console.log(`\n📤 Uploading hero image...`)
  let heroAssetId: string
  
  try {
    heroAssetId = await uploadImage(HERO_IMAGE_PATH)
  } catch (error) {
    console.error(`\n❌ Failed to upload hero image`)
    process.exit(1)
  }

  // Create hero image reference
  const heroImageRef = createImageRef(heroAssetId)

  // Update the document
  console.log(`\n💾 Updating Sanity document...`)
  
  await client
    .patch(plant._id)
    .set({
      title: 'Agave',
      scientificName: 'Agave spp.',
      about: ABOUT_TEXT,
      heroImage: heroImageRef,
      // Empty arrays for gallery and detailSections
      gallery: [],
      detailSections: [],
      // Empty optional fields that pass validation (undefined or empty arrays)
      quickIdChecklist: undefined,
      seasonalNotes: undefined,
      uses: undefined,
      ethicsAndDisclaimers: undefined,
      wildlifeValue: undefined,
      interestingFacts: undefined,
      // Do not set sortOrder
      sortOrder: undefined,
    })
    .commit()

  console.log('✅ Document updated successfully')

  // Verification: re-fetch and verify
  console.log(`\n🔍 Verifying document...`)
  const verification = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _rev,
      _updatedAt,
      title,
      "slug": slug.current,
      scientificName,
      about,
      heroImage{
        asset{
          _ref,
          _type
        }
      },
      "galleryCount": count(coalesce(gallery, [])),
      "detailSectionsCount": count(coalesce(detailSections, [])),
      "hasQuickIdChecklist": defined(quickIdChecklist) && count(coalesce(quickIdChecklist, [])) > 0,
      "hasSeasonalNotes": defined(seasonalNotes),
      "hasUses": defined(uses),
      "hasEthicsAndDisclaimers": defined(ethicsAndDisclaimers),
      "hasWildlifeValue": defined(wildlifeValue),
      "hasInterestingFacts": defined(interestingFacts) && count(coalesce(interestingFacts, [])) > 0,
      "hasSortOrder": defined(sortOrder)
    }`,
    {slug: SLUG}
  )

  if (!verification) {
    console.error(`❌ Could not re-fetch document for verification`)
    process.exit(1)
  }

  console.log(`\n✅ Verification Results:`)
  console.log(`   _id: ${verification._id}`)
  console.log(`   title: ${verification.title}`)
  console.log(`   slug: ${verification.slug}`)
  console.log(`   scientificName: ${verification.scientificName}`)
  console.log(`   heroImage.asset._ref: ${verification.heroImage?.asset?._ref || 'MISSING'}`)
  console.log(`   heroImage.asset._type: ${verification.heroImage?.asset?._type || 'MISSING'}`)
  console.log(`   gallery: ${verification.galleryCount} items (should be 0)`)
  console.log(`   detailSections: ${verification.detailSectionsCount} items (should be 0)`)
  console.log(`   quickIdChecklist: ${verification.hasQuickIdChecklist ? 'set' : 'not set'}`)
  console.log(`   seasonalNotes: ${verification.hasSeasonalNotes ? 'set' : 'not set'}`)
  console.log(`   uses: ${verification.hasUses ? 'set' : 'not set'}`)
  console.log(`   ethicsAndDisclaimers: ${verification.hasEthicsAndDisclaimers ? 'set' : 'not set'}`)
  console.log(`   wildlifeValue: ${verification.hasWildlifeValue ? 'set' : 'not set'}`)
  console.log(`   interestingFacts: ${verification.hasInterestingFacts ? 'set' : 'not set'}`)
  console.log(`   sortOrder: ${verification.hasSortOrder ? 'set' : 'not set (correct)'}`)

  // Validate hero image reference
  if (!verification.heroImage?.asset?._ref) {
    console.error(`\n❌ heroImage.asset._ref is missing!`)
    process.exit(1)
  }

  if (verification.heroImage?.asset?._type !== 'reference') {
    console.error(`\n❌ heroImage.asset._type is not "reference"!`)
    process.exit(1)
  }

  if (!verification.heroImage.asset._ref.startsWith('image-')) {
    console.error(`\n❌ heroImage.asset._ref does not start with "image-": ${verification.heroImage.asset._ref}`)
    process.exit(1)
  }

  if (verification.galleryCount !== 0) {
    console.warn(`\n⚠️  WARNING: gallery is not empty (${verification.galleryCount} items)`)
  }

  if (verification.detailSectionsCount !== 0) {
    console.warn(`\n⚠️  WARNING: detailSections is not empty (${verification.detailSectionsCount} items)`)
  }

  if (verification.hasSortOrder) {
    console.warn(`\n⚠️  WARNING: sortOrder is set (should not be set)`)
  }

  console.log(`\n✨ Migration complete!`)
  console.log(`   Hero image uploaded: ${HERO_IMAGE_PATH}`)
  console.log(`   Asset ID: ${heroAssetId}`)
  console.log(`   Asset ref: ${verification.heroImage.asset._ref}`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

