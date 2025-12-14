#!/usr/bin/env node

/**
 * Fix missing _key fields on galleryItems and detailSections array items.
 * 
 * This script:
 * 1. Fetches a plant document by slug
 * 2. Reads existing galleryItems and detailSections
 * 3. For each item missing _key, sets _key deterministically:
 *    - Prefer item.key if present
 *    - Else derive from image asset originalFilename (normalized)
 *    - Else derive from title (normalized) as last resort
 * 4. Patches the arrays back with the same items + _key
 * 
 * IMPORTANT: Does not change ordering, does not drop items, does not change images.
 * 
 * Usage:
 *   npm run sanity:fix-array-keys -- --slug saguaro-cactus
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

/**
 * Normalizes a string for use as a key by:
 * - lowercasing
 * - removing extension
 * - stripping all non-alphanumeric characters
 */
function normalizeName(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  return withoutExt.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Converts kebab-case or snake_case to camelCase for key generation.
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_]([a-z])/gi, (_, letter) => letter.toUpperCase())
    .replace(/[-_]/g, '')
}

/**
 * Derives a deterministic _key from an item.
 * Priority: item.key > image asset originalFilename > title
 */
function deriveKey(item: any, itemType: 'gallery' | 'detail'): string {
  // 1. Prefer existing key field
  if (item.key && typeof item.key === 'string' && item.key.length > 0) {
    return item.key
  }
  
  // 2. Derive from image asset originalFilename
  if (item.image?.asset?.originalFilename) {
    const filename = item.image.asset.originalFilename
    const basename = filename.replace(/\.[^.]+$/, '')
    return toCamelCase(basename)
  }
  
  // 3. Derive from title as last resort
  if (item.title && typeof item.title === 'string' && item.title.length > 0) {
    const normalized = normalizeName(item.title)
    return toCamelCase(normalized)
  }
  
  // 4. Fallback (should rarely happen)
  console.warn(`   ⚠️  Could not derive key for ${itemType} item, using fallback`)
  return `${itemType}-${Math.random().toString(36).substr(2, 9)}`
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:fix-array-keys -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Fixing array keys for plant: ${slug}`)

  // Fetch the plant document from Sanity
  console.log(`\n🔍 Fetching plant document from Sanity...`)
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      galleryItems[]{
        _key,
        key,
        image{
          ...,
          asset->{
            _id,
            originalFilename
          }
        },
        title,
        description,
        alt
      },
      detailSections[]{
        _key,
        key,
        image{
          ...,
          asset->{
            _id,
            originalFilename
          }
        },
        title,
        description,
        alt
      }
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

  // Process galleryItems
  const existingGalleryItems = plant.galleryItems || []
  let galleryItemsFixed = 0
  const fixedGalleryItems = existingGalleryItems.map((item: any, index: number) => {
    if (item._key) {
      // Already has _key, preserve it
      return item
    }
    
    // Missing _key, derive it
    galleryItemsFixed++
    const derivedKey = deriveKey(item, 'gallery')
    console.log(`   🔑 Adding _key to galleryItems[${index}]: "${derivedKey}"`)
    if (item.title) {
      console.log(`      Title: "${item.title}"`)
    }
    if (item.image?.asset?.originalFilename) {
      console.log(`      Image: ${item.image.asset.originalFilename}`)
    }
    
    return {
      ...item,
      _key: derivedKey,
    }
  })

  // Process detailSections
  const existingDetailSections = plant.detailSections || []
  let detailSectionsFixed = 0
  const fixedDetailSections = existingDetailSections.map((item: any, index: number) => {
    if (item._key) {
      // Already has _key, preserve it
      return item
    }
    
    // Missing _key, derive it
    detailSectionsFixed++
    const derivedKey = deriveKey(item, 'detail')
    console.log(`   🔑 Adding _key to detailSections[${index}]: "${derivedKey}"`)
    if (item.title) {
      console.log(`      Title: "${item.title}"`)
    }
    if (item.image?.asset?.originalFilename) {
      console.log(`      Image: ${item.image.asset.originalFilename}`)
    }
    
    return {
      ...item,
      _key: derivedKey,
    }
  })

  // Check if any fixes are needed
  if (galleryItemsFixed === 0 && detailSectionsFixed === 0) {
    console.log(`\n✅ No fixes needed - all array items already have _key`)
    return
  }

  console.log(`\n📊 Summary:`)
  console.log(`   galleryItems: ${existingGalleryItems.length} items, ${galleryItemsFixed} fixed`)
  console.log(`   detailSections: ${existingDetailSections.length} items, ${detailSectionsFixed} fixed`)

  // Patch the document
  console.log('\n💾 Updating Sanity document...')
  
  const patch = client.patch(plant._id)
  
  // Only patch if arrays have items
  if (fixedGalleryItems.length > 0) {
    console.log(`   ✅ Patching galleryItems with ${fixedGalleryItems.length} items`)
    patch.set({galleryItems: fixedGalleryItems})
  } else if (existingGalleryItems.length === 0) {
    console.log(`   ⚠️  galleryItems is empty, skipping patch`)
  }
  
  if (fixedDetailSections.length > 0) {
    console.log(`   ✅ Patching detailSections with ${fixedDetailSections.length} items`)
    patch.set({detailSections: fixedDetailSections})
  } else if (existingDetailSections.length === 0) {
    console.log(`   ⚠️  detailSections is empty, skipping patch`)
  }
  
  await patch.commit()

  console.log('✅ Document updated successfully')

  // Re-fetch to confirm
  console.log('\n🔍 Verifying update...')
  const updated = await client.fetch(
    `*[_id == $id][0]{
      galleryItems[]{
        _key,
        key,
        title
      },
      detailSections[]{
        _key,
        key,
        title
      }
    }`,
    {id: plant._id}
  )

  console.log(`\n✅ Verification:`)
  console.log(`   galleryItems: ${updated.galleryItems?.length || 0} items`)
  const galleryItemsWithKeys = (updated.galleryItems || []).filter((item: any) => item._key).length
  console.log(`   galleryItems with _key: ${galleryItemsWithKeys}/${updated.galleryItems?.length || 0}`)
  
  console.log(`   detailSections: ${updated.detailSections?.length || 0} items`)
  const detailSectionsWithKeys = (updated.detailSections || []).filter((item: any) => item._key).length
  console.log(`   detailSections with _key: ${detailSectionsWithKeys}/${updated.detailSections?.length || 0}`)

  if (galleryItemsWithKeys === (updated.galleryItems?.length || 0) && 
      detailSectionsWithKeys === (updated.detailSections?.length || 0)) {
    console.log(`\n✨ All array items now have _key!`)
  }

  console.log('\n✨ Fix complete!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
