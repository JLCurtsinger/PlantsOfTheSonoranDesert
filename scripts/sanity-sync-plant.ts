#!/usr/bin/env node

/**
 * Sync script to populate galleryItems and detailSections in Sanity
 * from local plant data files using key-based matching.
 * 
 * This script:
 * 1. Reads local plant data by slug
 * 2. Derives stable keys from image paths
 * 3. Maps local captions to Sanity image assets
 * 4. Patches Sanity documents with galleryItems and detailSections
 * 
 * Usage:
 *   npm run sanity:sync-plant -- --slug saguaro-cactus
 * 
 * Safe to run multiple times (idempotent).
 * 
 * IMPORTANT: This script never patches the deprecated gallery field and
 * never sets galleryItems or detailSections to empty arrays.
 */

/**
 * Validates that a Sanity image reference has a valid asset reference.
 * Returns true if image?.asset?._ref OR image?.asset?._id exists.
 */
function isValidSanityImage(image: any): boolean {
  return !!(image?.asset?._ref || image?.asset?._id)
}

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'
import type {Plant} from '../lib/plant-types'

// Import plant data modules
import {saguaroCactus} from '../lib/plant-data/saguaro-cactus'
import {pricklyPear} from '../lib/plant-data/prickly-pear'
import {paloVerde} from '../lib/plant-data/palo-verde'
import {ocotillo} from '../lib/plant-data/ocotillo'
import {barrelCactus} from '../lib/plant-data/barrel-cactus'
import {desertMarigold} from '../lib/plant-data/desert-marigold'
import {creosoteBush} from '../lib/plant-data/creosote-bush'

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
 * Normalizes a filename for matching by:
 * - lowercasing
 * - removing extension
 * - stripping all non-alphanumeric characters (remove -, _, spaces)
 * 
 * Examples:
 * - "adult-saguaro.webp" -> "adultsaguaro"
 * - "adultSaguaro.webp" -> "adultsaguaro"
 * - "baby_saguaro.jpg" -> "babysaguaro"
 */
function normalizeName(filename: string): string {
  // Remove extension
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  // Lowercase and remove all non-alphanumeric characters
  return withoutExt.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Derives a stable key from a local image path.
 * Extracts the basename without extension (e.g., "adultSaguaro" from "/images/saguaro/adultSaguaro.webp")
 * Converts kebab-case to camelCase (e.g., "saguaro-bloom" -> "saguaroBloom")
 */
function deriveKeyFromPath(imagePath: string, slug: string): string {
  // Extract filename without extension
  const match = imagePath.match(/\/([^/]+)\.(webp|jpg|jpeg|png)$/i)
  if (match && match[1]) {
    const basename = match[1]
    // Convert kebab-case or snake_case to camelCase
    return basename
      .replace(/[-_]([a-z])/gi, (_, letter) => letter.toUpperCase())
      .replace(/[-_]/g, '')
  }
  // Fallback: use slug-scoped index-based key
  // This should rarely be needed if paths are well-formed
  const index = imagePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown'
  return `${slug}-${index}`
}

/**
 * Extracts basename from a local image path (without extension).
 */
function getBasenameFromPath(imagePath: string): string {
  const match = imagePath.match(/\/([^/]+)\.(webp|jpg|jpeg|png)$/i)
  if (match && match[1]) {
    return match[1]
  }
  return imagePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown'
}

/**
 * Loads local plant data by slug.
 */
function loadLocalPlant(slug: string): Plant | null {
  // Map slug to plant data module
  const plantMap: Record<string, Plant> = {
    'saguaro-cactus': saguaroCactus,
    'prickly-pear': pricklyPear,
    'palo-verde': paloVerde,
    'ocotillo': ocotillo,
    'barrel-cactus': barrelCactus,
    'desert-marigold': desertMarigold,
    'creosote-bush': creosoteBush,
  }
  
  return plantMap[slug] || null
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:sync-plant -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Syncing plant: ${slug}`)

  // Load local plant data
  const localPlant = loadLocalPlant(slug)
  if (!localPlant) {
    console.error(`❌ Local plant data not found for slug: ${slug}`)
    console.error('   Please add the plant to the loadLocalPlant function')
    process.exit(1)
  }

  console.log(`✅ Loaded local plant: ${localPlant.commonName}`)

  // Fetch the plant document from Sanity
  // IMPORTANT: Keep image objects intact (with asset._ref), use projections for filename metadata
  console.log(`\n🔍 Fetching plant document from Sanity...`)
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage{
        ...,
        "originalFilename": asset->originalFilename,
        "assetId": asset->_id
      },
      gallery[]{
        ...,
        "originalFilename": asset->originalFilename,
        "assetId": asset->_id
      },
      galleryItems[]{
        _key,
        key,
        image{
          ...,
          "originalFilename": asset->originalFilename,
          "assetId": asset->_id
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
          "originalFilename": asset->originalFilename,
          "assetId": asset->_id
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

  // Check existing gallery and heroImage
  const existingGallery = plant.gallery || []
  const heroImage = plant.heroImage
  
  console.log(`📸 Found ${existingGallery.length} images in deprecated gallery field`)
  console.log(`📸 Hero image: ${heroImage ? 'present' : 'missing'}`)

  if (existingGallery.length === 0) {
    console.error('❌ No images found in deprecated gallery field')
    console.error('   Please upload images to the gallery field in Sanity Studio first')
    process.exit(1)
  }

  // Build a combined filename map from BOTH heroImage and deprecated gallery[]
  // Use projected originalFilename for matching, but keep original image objects intact
  const combinedImageMap = new Map<string, any>() // normalized filename -> image object
  const sanityFilenames: string[] = []
  
  // Map hero image by normalized filename
  if (heroImage?.originalFilename) {
    const normalized = normalizeName(heroImage.originalFilename)
    combinedImageMap.set(normalized, heroImage)
    sanityFilenames.push(heroImage.originalFilename)
    console.log(`   📸 Mapped hero image: ${heroImage.originalFilename} (normalized: ${normalized})`)
  }
  
  // Map gallery images by normalized filename
  for (const galleryImage of existingGallery) {
    if (galleryImage?.originalFilename) {
      const normalized = normalizeName(galleryImage.originalFilename)
      combinedImageMap.set(normalized, galleryImage)
      sanityFilenames.push(galleryImage.originalFilename)
      console.log(`   📸 Mapped gallery image: ${galleryImage.originalFilename} (normalized: ${normalized})`)
    } else {
      console.warn(`   ⚠️  Gallery image missing originalFilename projection`)
    }
  }
  
  console.log(`📋 Built combined filename map: ${combinedImageMap.size} images (hero + gallery)`)

  // Prepare galleryItems from local data, matching by filename
  const localGalleryDetails = localPlant.galleryDetails || []
  const galleryItems: Array<{
    _key: string  // Mandatory Sanity array item key
    key: string   // Our custom key field
    image: any
    title?: string
    description?: string
    alt: string
  }> = []
  
  let matchedByFilename = 0
  let matchedByIndex = 0
  let skippedInvalid = 0
  
  for (const item of localGalleryDetails) {
    const localBasename = getBasenameFromPath(item.src)
    const normalizedLocal = normalizeName(localBasename)
    
    // Matching priority for galleryItems:
    // a) hero image filename match (from combined map)
    // b) gallery filename match (from combined map)
    // c) index fallback (last resort)
    let matchedImage: any = null
    let matchMethod: 'hero' | 'gallery' | 'index' | 'none' = 'none'
    let matchedSanityFilename: string | null = null
    
    // Check combined map (includes both hero and gallery)
    if (combinedImageMap.has(normalizedLocal)) {
      matchedImage = combinedImageMap.get(normalizedLocal)
      matchedByFilename++
      matchedSanityFilename = matchedImage?.originalFilename || null
      
      // Determine if it was hero or gallery based on which map it came from
      if (heroImage && matchedImage === heroImage) {
        matchMethod = 'hero'
        console.log(`   ✅ Matched: "${item.title || localBasename}"`)
        console.log(`      Local: ${localBasename} (normalized: ${normalizedLocal})`)
        console.log(`      Sanity: ${matchedSanityFilename}`)
        console.log(`      Method: hero image filename match`)
      } else {
        matchMethod = 'gallery'
        console.log(`   ✅ Matched: "${item.title || localBasename}"`)
        console.log(`      Local: ${localBasename} (normalized: ${normalizedLocal})`)
        console.log(`      Sanity: ${matchedSanityFilename}`)
        console.log(`      Method: gallery filename match`)
      }
    } else {
      // Fallback to index-based matching ONLY if filename matching fails
      const index = galleryItems.length
      if (index < existingGallery.length) {
        matchedImage = existingGallery[index]
        matchedByIndex++
        matchMethod = 'index'
        matchedSanityFilename = matchedImage?.originalFilename || null
        console.warn(`   ⚠️  Matched by INDEX (filename match failed): "${item.title || localBasename}"`)
        console.warn(`      Local: ${localBasename} (normalized: ${normalizedLocal})`)
        console.warn(`      Sanity: ${matchedSanityFilename || 'unknown'}`)
        console.warn(`      Method: index fallback (position ${index})`)
        console.warn(`      Available Sanity filenames: ${sanityFilenames.join(', ')}`)
        if (heroImage?.originalFilename) {
          console.warn(`      Hero image: ${heroImage.originalFilename}`)
        }
      } else {
        console.warn(`   ❌ No match: "${item.title || localBasename}"`)
        console.warn(`      Local: ${localBasename} (normalized: ${normalizedLocal})`)
        console.warn(`      Available Sanity filenames: ${sanityFilenames.join(', ')}`)
        if (heroImage?.originalFilename) {
          console.warn(`      Hero image: ${heroImage.originalFilename}`)
        }
        console.warn(`      Skipping - no match and index out of range`)
        continue
      }
    }
    
    // Build proper image object for patching
    // Ensure asset is a reference object, not a dereferenced object
    let imageToPatch: any
    
    if (matchedImage?.assetId) {
      // Rebuild image object with proper asset reference
      imageToPatch = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: matchedImage.assetId,
        },
      }
      // Preserve crop and hotspot if present
      if (matchedImage.crop) {
        imageToPatch.crop = matchedImage.crop
      }
      if (matchedImage.hotspot) {
        imageToPatch.hotspot = matchedImage.hotspot
      }
    } else if (matchedImage?.asset?._ref) {
      // Already has proper reference structure, use as-is but ensure _type
      imageToPatch = {
        ...matchedImage,
        _type: matchedImage._type || 'image',
      }
    } else if (matchedImage?.asset?._id) {
      // Has _id but no _ref, convert to reference
      imageToPatch = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: matchedImage.asset._id,
        },
      }
      if (matchedImage.crop) imageToPatch.crop = matchedImage.crop
      if (matchedImage.hotspot) imageToPatch.hotspot = matchedImage.hotspot
    } else {
      skippedInvalid++
      console.warn(`   ❌ Invalid image ref: "${item.title || localBasename}"`)
      console.warn(`      Skipping - matched image has no valid asset reference`)
      continue
    }
    
    const key = deriveKeyFromPath(item.src, slug)
    const _key = key // Use the same key for _key (Sanity's internal array key)
    
    galleryItems.push({
      _key, // Mandatory Sanity array item key
      key,   // Our custom key field
      image: imageToPatch,
      title: item.title,
      description: item.description,
      alt: item.alt || `${localPlant.commonName} - ${item.title || `Photo ${galleryItems.length + 1}`}`,
    })
  }

  console.log(`📝 Prepared ${galleryItems.length} galleryItems:`)
  console.log(`   ✅ ${matchedByFilename} matched by filename (hero + gallery)`)
  if (matchedByIndex > 0) {
    console.log(`   ⚠️  ${matchedByIndex} matched by index (fallback)`)
  }
  if (skippedInvalid > 0) {
    console.log(`   ⚠️  ${skippedInvalid} skipped due to invalid image reference`)
  }

  // Prepare detailSections from local data
  // Match local detail section images to Sanity assets by filename
  const localDetailSections = localPlant.detailSections || []
  const detailSections: Array<{
    _key: string  // Mandatory Sanity array item key
    key: string   // Our custom key field
    image: any
    title: string
    description: string
    alt: string
  }> = []
  
  const skippedSections: string[] = []
  let matchedDetailSections = 0
  let skippedInvalidDetailSections = 0

  for (const section of localDetailSections) {
    const localBasename = getBasenameFromPath(section.src)
    const normalizedLocal = normalizeName(localBasename)
    
    let matchedImage: any = null
    let matchMethod: 'hero' | 'gallery' | 'none' = 'none'
    let matchedSanityFilename: string | null = null
    
    // Use combined map (includes both hero and gallery)
    if (combinedImageMap.has(normalizedLocal)) {
      matchedImage = combinedImageMap.get(normalizedLocal)
      matchedDetailSections++
      matchedSanityFilename = matchedImage?.originalFilename || null
      
      // Determine if it was hero or gallery
      if (heroImage && matchedImage === heroImage) {
        matchMethod = 'hero'
        console.log(`   ✅ Matched detail section: "${section.title}"`)
        console.log(`      Local: ${localBasename} (normalized: ${normalizedLocal})`)
        console.log(`      Sanity: ${matchedSanityFilename}`)
        console.log(`      Method: hero image match`)
      } else {
        matchMethod = 'gallery'
        console.log(`   ✅ Matched detail section: "${section.title}"`)
        console.log(`      Local: ${localBasename} (normalized: ${normalizedLocal})`)
        console.log(`      Sanity: ${matchedSanityFilename}`)
        console.log(`      Method: gallery image match`)
      }
    }
    
    if (!matchedImage) {
      // Log warning but don't include this section
      skippedSections.push(`${section.title} (basename: ${localBasename})`)
      console.warn(`   ❌ No match for detail section: "${section.title}"`)
      console.warn(`      Local: ${section.src}, basename: ${localBasename} (normalized: ${normalizedLocal})`)
      console.warn(`      Available Sanity filenames: ${sanityFilenames.join(', ')}`)
      continue
    }
    
    // Build proper image object for patching
    let imageToPatch: any
    
    if (matchedImage?.assetId) {
      // Rebuild image object with proper asset reference
      imageToPatch = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: matchedImage.assetId,
        },
      }
      // Preserve crop and hotspot if present
      if (matchedImage.crop) {
        imageToPatch.crop = matchedImage.crop
      }
      if (matchedImage.hotspot) {
        imageToPatch.hotspot = matchedImage.hotspot
      }
    } else if (matchedImage?.asset?._ref) {
      // Already has proper reference structure, use as-is but ensure _type
      imageToPatch = {
        ...matchedImage,
        _type: matchedImage._type || 'image',
      }
    } else if (matchedImage?.asset?._id) {
      // Has _id but no _ref, convert to reference
      imageToPatch = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: matchedImage.asset._id,
        },
      }
      if (matchedImage.crop) imageToPatch.crop = matchedImage.crop
      if (matchedImage.hotspot) imageToPatch.hotspot = matchedImage.hotspot
    } else {
      skippedInvalidDetailSections++
      console.warn(`   ❌ Invalid image ref for detail section: "${section.title}"`)
      console.warn(`      Skipping - matched image has no valid asset reference`)
      continue
    }
    
    const key = deriveKeyFromPath(section.src, slug)
    const _key = key // Use the same key for _key (Sanity's internal array key)
    
    detailSections.push({
      _key, // Mandatory Sanity array item key
      key,   // Our custom key field
      image: imageToPatch,
      title: section.title,
      description: section.description,
      alt: section.alt || `${localPlant.commonName} - ${section.title}`,
    })
  }

  console.log(`📝 Prepared ${detailSections.length} detailSections:`)
  console.log(`   ✅ ${matchedDetailSections} matched by filename`)
  if (skippedSections.length > 0) {
    console.warn(`   ⚠️  Skipped ${skippedSections.length} detail sections (could not match images):`)
    skippedSections.forEach(s => console.warn(`   - ${s}`))
  }
  if (skippedInvalidDetailSections > 0) {
    console.log(`   ⚠️  ${skippedInvalidDetailSections} skipped due to invalid image reference`)
  }

  // Patch the document
  // IMPORTANT: Never patch the deprecated gallery field
  // Only patch galleryItems/detailSections if they have valid entries
  console.log('\n💾 Updating Sanity document...')
  
  const patch = client.patch(plant._id)
  
  // Only patch galleryItems if we have valid items
  if (galleryItems.length > 0) {
    console.log(`   ✅ Patching galleryItems with ${galleryItems.length} items`)
    patch.setIfMissing({galleryItems: []}).set({galleryItems})
  } else {
    console.log(`   ⚠️  Skipping galleryItems patch (no valid items to set)`)
  }
  
  // Only patch detailSections if we have valid items
  if (detailSections.length > 0) {
    console.log(`   ✅ Patching detailSections with ${detailSections.length} items`)
    patch.setIfMissing({detailSections: []}).set({detailSections})
  } else {
    console.log(`   ⚠️  Skipping detailSections patch (no valid items to set)`)
  }
  
  await patch.commit()

  console.log('✅ Document updated successfully')

  // Re-fetch to verify image asset references are correct
  console.log('\n🔍 Verifying update...')
  const updated = await client.fetch(
    `*[_id == $id][0]{
      galleryItems[]{
        _key,
        key,
        title,
        image{
          asset{
            _ref,
            _id
          }
        }
      },
      detailSections[]{
        _key,
        key,
        title,
        image{
          asset{
            _ref,
            _id
          }
        }
      }
    }`,
    {id: plant._id}
  )

  console.log(`\n✅ Verification:`)
  console.log(`   galleryItems: ${updated.galleryItems?.length || 0} items`)
  
  let galleryItemsValid = 0
  let galleryItemsInvalid = 0
  if (updated.galleryItems && updated.galleryItems.length > 0) {
    updated.galleryItems.forEach((item: any, i: number) => {
      const hasValidRef = item.image?.asset?._ref || item.image?.asset?._id
      if (hasValidRef) {
        galleryItemsValid++
        console.log(`   [${i + 1}] ✅ key: "${item.key}", title: "${item.title || '(no title)'}" - asset._ref: ${item.image.asset._ref || item.image.asset._id}`)
      } else {
        galleryItemsInvalid++
        console.log(`   [${i + 1}] ❌ key: "${item.key}", title: "${item.title || '(no title)'}" - MISSING asset._ref`)
      }
    })
  }
  
  console.log(`   detailSections: ${updated.detailSections?.length || 0} items`)
  
  let detailSectionsValid = 0
  let detailSectionsInvalid = 0
  if (updated.detailSections && updated.detailSections.length > 0) {
    updated.detailSections.forEach((item: any, i: number) => {
      const hasValidRef = item.image?.asset?._ref || item.image?.asset?._id
      if (hasValidRef) {
        detailSectionsValid++
        console.log(`   [${i + 1}] ✅ key: "${item.key}", title: "${item.title}" - asset._ref: ${item.image.asset._ref || item.image.asset._id}`)
      } else {
        detailSectionsInvalid++
        console.log(`   [${i + 1}] ❌ key: "${item.key}", title: "${item.title}" - MISSING asset._ref`)
      }
    })
  }
  
  console.log(`\n📊 Asset Reference Verification:`)
  console.log(`   galleryItems: ${galleryItemsValid} valid, ${galleryItemsInvalid} invalid`)
  console.log(`   detailSections: ${detailSectionsValid} valid, ${detailSectionsInvalid} invalid`)
  
  if (galleryItemsInvalid > 0 || detailSectionsInvalid > 0) {
    console.warn(`\n⚠️  WARNING: Some image assets are missing _ref references!`)
    console.warn(`   Run: npm run sanity:migrate-image-references -- --slug ${slug}`)
  } else {
    console.log(`\n✅ All image assets have valid _ref references!`)
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Gallery items: ${matchedByFilename} matched by filename (hero + gallery), ${matchedByIndex} by index`)
  if (skippedInvalid > 0) {
    console.log(`   Gallery items: ${skippedInvalid} skipped due to invalid image refs`)
  }
  console.log(`   Detail sections: ${matchedDetailSections} matched, ${skippedSections.length} skipped (no match)`)
  if (skippedInvalidDetailSections > 0) {
    console.log(`   Detail sections: ${skippedInvalidDetailSections} skipped due to invalid image refs`)
  }
  console.log(`   Final counts: ${galleryItems.length} galleryItems, ${detailSections.length} detailSections`)

  console.log('\n✨ Sync complete!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
