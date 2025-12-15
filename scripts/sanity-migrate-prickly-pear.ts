#!/usr/bin/env node

/**
 * Migration script for Prickly Pear plant to Sanity.
 * 
 * This script:
 * 1. Loads local Prickly Pear plant data
 * 2. Finds or creates the plant document in Sanity (slug: "prickly-pear")
 * 3. Uploads all local images to Sanity as image assets
 * 4. Populates the document with canonical fields:
 *    - heroImage (image ref)
 *    - gallery (array of image refs)
 *    - detailSections (array with title/key/alt/description/image ref)
 *    - about (string)
 *    - scientificName (string)
 *    - title (string)
 *    - quickIdChecklist, seasonalNotes, uses, ethicsAndDisclaimers, wildlifeValue, interestingFacts
 * 
 * Safe to run multiple times (idempotent).
 * Does NOT use galleryItems (deprecated).
 * Does NOT modify sortOrder.
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'
import {readFileSync} from 'fs'
import {pricklyPear} from '../lib/plant-data/prickly-pear'

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

const SLUG = 'prickly-pear'
const PUBLIC_DIR = resolve(process.cwd(), 'public')

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
                   imagePath.endsWith('.png') ? 'image/png' : 'image/webp',
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
 */
function createImageRef(assetId: string, key?: string) {
  const ref: {
    _type: 'image'
    asset: {
      _type: 'reference'
      _ref: string
    }
    _key?: string
  } = {
    _type: 'image' as const,
    asset: {
      _type: 'reference' as const,
      _ref: assetId,
    },
  }
  if (key) {
    ref._key = key
  }
  return ref
}

/**
 * Derives a stable key from an image path for detailSections.
 */
function deriveKeyFromPath(imagePath: string): string {
  const basename = imagePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown'
  // Convert kebab-case to camelCase, remove special chars
  return basename
    .replace(/[-_]([a-z])/gi, (_, letter) => letter.toUpperCase())
    .replace(/[-_]/g, '')
}

/**
 * Derives a non-empty title for detailSections with fallback logic.
 * Prefers local title, then key, then cleaned filename (Title Case).
 * This ensures titles are never blank, preventing validation errors.
 */
function deriveDetailSectionTitle(
  section: { title?: string; src: string },
  key?: string
): string {
  // Prefer local title if present and non-empty
  if (section.title && section.title.trim()) {
    return section.title.trim()
  }
  
  // Fall back to key if provided
  if (key && key.trim()) {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }
  
  // Final fallback: cleaned filename (no extension, replace hyphens with spaces, Title Case)
  const basename = section.src.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Untitled'
  return basename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim()
}

async function main() {
  console.log(`\n🌵 Migrating Prickly Pear to Sanity`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}`)
  console.log(`   Slug: ${SLUG}\n`)

  // Load local plant data
  const localPlant = pricklyPear
  console.log(`✅ Loaded local plant: ${localPlant.commonName}`)

  // Find or create plant document
  console.log(`\n🔍 Finding plant document in Sanity...`)
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
    // Create new document
    plant = await client.create({
      _type: 'plant',
      title: localPlant.commonName,
      slug: {
        _type: 'slug',
        current: SLUG,
      },
      scientificName: localPlant.scientificName,
      about: localPlant.description,
    })
    console.log(`   ✅ Created plant document (ID: ${plant._id})`)
  } else {
    console.log(`   ✅ Found existing plant document (ID: ${plant._id})`)
  }

  // Collect all unique image paths
  const imagePaths = new Set<string>()
  imagePaths.add(localPlant.mainImage)
  
  if (localPlant.galleryImages) {
    localPlant.galleryImages.forEach(img => imagePaths.add(img))
  }
  
  if (localPlant.detailSections) {
    localPlant.detailSections.forEach(section => imagePaths.add(section.src))
  }

  const uniqueImages = Array.from(imagePaths)
  console.log(`\n📸 Found ${uniqueImages.length} unique images to upload`)

  // Upload all images and create a map of path -> asset ID
  const imageMap = new Map<string, string>()
  
  console.log(`\n📤 Uploading images to Sanity...`)
  for (const imagePath of uniqueImages) {
    try {
      const assetId = await uploadImage(imagePath)
      imageMap.set(imagePath, assetId)
    } catch (error) {
      console.error(`   ❌ Skipping ${imagePath} due to upload error`)
      // Continue with other images
    }
  }

  console.log(`\n✅ Uploaded ${imageMap.size} images`)

  // Prepare heroImage reference
  const heroImagePath = localPlant.mainImage
  const heroAssetId = imageMap.get(heroImagePath)
  if (!heroAssetId) {
    throw new Error(`Hero image not found in uploaded images: ${heroImagePath}`)
  }
  const heroImageRef = createImageRef(heroAssetId)

  // Prepare gallery array (exclude hero image)
  const galleryPaths = localPlant.galleryImages?.filter(path => path !== heroImagePath) || []
  const galleryRefs = galleryPaths
    .map(path => {
      const assetId = imageMap.get(path)
      if (!assetId) {
        console.warn(`   ⚠️  Gallery image not found: ${path}`)
        return null
      }
      const key = deriveKeyFromPath(path)
      return createImageRef(assetId, key)
    })
    .filter((ref): ref is NonNullable<typeof ref> => ref !== null)

  console.log(`\n📝 Prepared gallery with ${galleryRefs.length} images`)

  // Prepare detailSections
  const detailSectionsRefs = (localPlant.detailSections || []).map(section => {
    const assetId = imageMap.get(section.src)
    if (!assetId) {
      throw new Error(`Detail section image not found: ${section.src}`)
    }
    
    const key = deriveKeyFromPath(section.src)
    const title = deriveDetailSectionTitle(section, key)
    
    return {
      _type: 'detailSection' as const,
      _key: key,
      key: key,
      image: createImageRef(assetId),
      title: title,
      description: section.description,
      alt: section.alt || title,
    }
  })

  console.log(`📝 Prepared ${detailSectionsRefs.length} detail sections`)

  // Prepare text fields
  const quickIdChecklist = localPlant.quickId || []
  const seasonalNotes = typeof localPlant.seasonalNotes === 'string' 
    ? localPlant.seasonalNotes 
    : Array.isArray(localPlant.seasonalNotes) 
      ? localPlant.seasonalNotes.join('\n') 
      : ''
  const uses = typeof localPlant.uses === 'string'
    ? localPlant.uses
    : Array.isArray(localPlant.uses)
      ? localPlant.uses.join('\n')
      : ''
  const ethicsAndDisclaimers = typeof localPlant.ethicsAndDisclaimers === 'string'
    ? localPlant.ethicsAndDisclaimers
    : Array.isArray(localPlant.ethicsAndDisclaimers)
      ? localPlant.ethicsAndDisclaimers.join('\n')
      : ''
  const wildlifeValue = typeof localPlant.wildlifeValue === 'string'
    ? localPlant.wildlifeValue
    : Array.isArray(localPlant.wildlifeValue)
      ? localPlant.wildlifeValue.join('\n')
      : ''
  const interestingFacts = localPlant.interestingFacts || []

  // Check current state before update
  console.log(`\n🔍 Checking current document state...`)
  const beforeState = await client.fetch(
    `*[_type=="plant" && slug.current=="prickly-pear"][0]{
      "galleryMissingKeys": count(coalesce(gallery, [])[!defined(_key)]),
      "detailSectionsMissingKeys": count(coalesce(detailSections, [])[!defined(_key)]),
      "galleryCount": count(coalesce(gallery, [])),
      "detailSectionsCount": count(coalesce(detailSections, []))
    }`
  )
  console.log(`   Before update:`)
  console.log(`     Gallery items: ${beforeState.galleryCount || 0} (missing keys: ${beforeState.galleryMissingKeys || 0})`)
  console.log(`     Detail sections: ${beforeState.detailSectionsCount || 0} (missing keys: ${beforeState.detailSectionsMissingKeys || 0})`)

  // Update the document
  console.log(`\n💾 Updating Sanity document...`)
  
  await client
    .patch(plant._id)
    .set({
      title: localPlant.commonName,
      scientificName: localPlant.scientificName,
      about: localPlant.description,
      heroImage: heroImageRef,
      gallery: galleryRefs,
      detailSections: detailSectionsRefs,
      quickIdChecklist: quickIdChecklist.length > 0 ? quickIdChecklist : undefined,
      seasonalNotes: seasonalNotes || undefined,
      uses: uses || undefined,
      ethicsAndDisclaimers: ethicsAndDisclaimers || undefined,
      wildlifeValue: wildlifeValue || undefined,
      interestingFacts: interestingFacts.length > 0 ? interestingFacts : undefined,
    })
    .commit()

  console.log('✅ Document updated successfully')

  // Verify with the query from requirements
  console.log(`\n🔍 Verifying document...`)
  const verification = await client.fetch(
    `*[_type=="plant" && slug.current=="prickly-pear"][0]{
      _id,_rev,_updatedAt,title,"slug":slug.current,
      "badGallery": count(coalesce(gallery, [])[defined(asset._id)]),
      "goodGallery": count(coalesce(gallery, [])[defined(asset._ref)]),
      "badDetail": count(coalesce(detailSections, [])[defined(image.asset._id)]),
      "goodDetail": count(coalesce(detailSections, [])[defined(image.asset._ref)]),
      "galleryMissingKeys": count(coalesce(gallery, [])[!defined(_key)]),
      "detailSectionsMissingKeys": count(coalesce(detailSections, [])[!defined(_key)])
    }`
  )

  console.log(`\n✅ Verification Results:`)
  console.log(`   _id: ${verification._id}`)
  console.log(`   title: ${verification.title}`)
  console.log(`   slug: ${verification.slug}`)
  console.log(`   badGallery: ${verification.badGallery} (should be 0)`)
  console.log(`   goodGallery: ${verification.goodGallery} (should be >0)`)
  console.log(`   badDetail: ${verification.badDetail} (should be 0)`)
  console.log(`   goodDetail: ${verification.goodDetail} (should be >0)`)
  console.log(`   galleryMissingKeys: ${verification.galleryMissingKeys} (should be 0)`)
  console.log(`   detailSectionsMissingKeys: ${verification.detailSectionsMissingKeys} (should be 0)`)
  
  if (verification.badGallery > 0 || verification.badDetail > 0) {
    console.warn(`\n⚠️  WARNING: Some image references use _id instead of _ref!`)
    process.exit(1)
  }
  
  if (verification.goodGallery === 0 && verification.goodDetail === 0) {
    console.warn(`\n⚠️  WARNING: No valid image references found!`)
    process.exit(1)
  }
  
  if (verification.galleryMissingKeys > 0 || verification.detailSectionsMissingKeys > 0) {
    console.warn(`\n⚠️  WARNING: Some array items are missing _key values!`)
    console.warn(`   galleryMissingKeys: ${verification.galleryMissingKeys}`)
    console.warn(`   detailSectionsMissingKeys: ${verification.detailSectionsMissingKeys}`)
    process.exit(1)
  }

  console.log(`\n✨ Migration complete!`)
  console.log(`   Assets uploaded: ${imageMap.size}`)
  console.log(`   Gallery images: ${galleryRefs.length}`)
  console.log(`   Detail sections: ${detailSectionsRefs.length}`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

