#!/usr/bin/env node

/**
 * Migration script for Ocotillo plant to Sanity.
 * 
 * This script:
 * 1. Loads local Ocotillo plant data
 * 2. Finds or creates the plant document in Sanity (slug: "ocotillo")
 * 3. Uploads all local images to Sanity as image assets
 * 4. Populates the document with canonical fields:
 *    - heroImage (image ref)
 *    - gallery (array of image refs, each with stable deterministic _key)
 *    - detailSections (array with required title/key/alt/description/image ref, each with stable _key)
 *    - about (string)
 *    - scientificName (string)
 *    - title (string)
 *    - quickIdChecklist, seasonalNotes, uses, ethicsAndDisclaimers, wildlifeValue, interestingFacts
 * 
 * Hardening features:
 * - Never writes asset._id, always uses asset: { _ref: "...", _type: "reference" }
 * - Every array item has a stable deterministic _key derived from filename
 * - detailSections[].title is never blank (fallback: local title -> key -> cleaned filename)
 * - Idempotent: re-running updates the same doc by slug
 * 
 * Safe to run multiple times (idempotent).
 * Does NOT use galleryItems (deprecated).
 * Does NOT modify sortOrder.
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'
import {readFileSync} from 'fs'
import {ocotillo} from '../lib/plant-data/ocotillo'

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

const SLUG = 'ocotillo'
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
 * HARDENED: Never uses asset._id, always uses asset: { _ref: "...", _type: "reference" }
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
 * Derives a stable deterministic key from an image path.
 * Used for both gallery and detailSections array items.
 * HARDENED: Always returns a deterministic key based on filename.
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
 * HARDENED: Ensures titles are never blank.
 * Prefers local title, then key, then cleaned filename (Title Case).
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

/**
 * Derives a non-empty description for detailSections with fallback logic.
 * HARDENED: Ensures descriptions are never blank.
 * Prefers local description, then derives from title/alt, then from filename.
 */
function deriveDetailSectionDescription(
  section: { description?: string; title?: string; alt?: string; src: string },
  plantName: string
): string {
  // Prefer local description if present and non-empty
  if (section.description && section.description.trim()) {
    return section.description.trim()
  }
  
  // Fall back to title or alt to create a descriptive sentence
  const titleOrAlt = (section.title && section.title.trim()) || (section.alt && section.alt.trim())
  if (titleOrAlt) {
    // Create a simple descriptive sentence from the title/alt
    // If title/alt already contains the plant name, use it as-is with a period
    // Otherwise, combine plant name with the title/alt
    const lowerTitle = titleOrAlt.toLowerCase()
    const lowerPlantName = plantName.toLowerCase()
    if (lowerTitle.includes(lowerPlantName)) {
      return `${titleOrAlt}.`
    }
    return `${plantName} ${titleOrAlt.toLowerCase()}.`
  }
  
  // Final fallback: derive from filename
  const basename = section.src.split('/').pop()?.replace(/\.[^.]+$/, '') || 'image'
  const cleanedName = basename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim()
  
  // Create a simple description from filename
  // Handle common patterns like "ocotillo-branches" -> "Ocotillo branches."
  if (cleanedName.toLowerCase().startsWith(plantName.toLowerCase())) {
    return `${cleanedName}.`
  }
  return `${plantName} ${cleanedName.toLowerCase()}.`
}

async function main() {
  console.log(`\n🌵 Migrating Ocotillo to Sanity`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}`)
  console.log(`   Slug: ${SLUG}\n`)

  // Load local plant data
  const localPlant = ocotillo
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

  // Fetch existing document to extract existing asset IDs
  console.log(`\n🔍 Fetching existing image asset IDs from document...`)
  const existingDoc = await client.fetch(
    `*[_type == "plant" && _id == $id][0]{
      heroImage,
      gallery,
      detailSections
    }`,
    {id: plant._id}
  )

  // Create a map of _key -> asset ID from existing detailSections
  const existingAssetMap = new Map<string, string>()
  if (existingDoc?.detailSections) {
    for (const section of existingDoc.detailSections) {
      if (section._key && section.image?.asset?._ref) {
        existingAssetMap.set(section._key, section.image.asset._ref)
      }
    }
  }
  // Also check gallery for asset IDs
  if (existingDoc?.gallery) {
    for (const img of existingDoc.gallery) {
      if (img._key && img.asset?._ref) {
        existingAssetMap.set(img._key, img.asset._ref)
      }
    }
  }
  // Check heroImage
  if (existingDoc?.heroImage?.asset?._ref) {
    const heroKey = deriveKeyFromPath(localPlant.mainImage)
    existingAssetMap.set(heroKey, existingDoc.heroImage.asset._ref)
  }

  console.log(`   ✅ Found ${existingAssetMap.size} existing asset IDs`)

  // Collect all unique image paths
  const imagePaths = new Set<string>()
  imagePaths.add(localPlant.mainImage)
  
  if (localPlant.galleryImages) {
    localPlant.galleryImages.forEach(img => imagePaths.add(img))
  }
  
  // detailSections maps to detailSections
  if (localPlant.detailSections) {
    localPlant.detailSections.forEach(section => imagePaths.add(section.src))
  }

  const uniqueImages = Array.from(imagePaths)
  console.log(`\n📸 Found ${uniqueImages.length} unique images to process`)

  // Upload all images and create a map of path -> asset ID
  // If upload fails, try to use existing asset ID from document
  const imageMap = new Map<string, string>()
  let uploadedCount = 0
  let reusedCount = 0
  
  console.log(`\n📤 Uploading images to Sanity...`)
  for (const imagePath of uniqueImages) {
    try {
      const assetId = await uploadImage(imagePath)
      imageMap.set(imagePath, assetId)
      uploadedCount++
    } catch (error) {
      // If upload fails, try to use existing asset ID
      const key = deriveKeyFromPath(imagePath)
      const existingAssetId = existingAssetMap.get(key)
      if (existingAssetId) {
        console.log(`   ⚠️  Using existing asset ID for ${imagePath}`)
        imageMap.set(imagePath, existingAssetId)
        reusedCount++
      } else {
        console.error(`   ❌ Skipping ${imagePath} - not found locally and no existing asset ID`)
        // Continue with other images
      }
    }
  }

  console.log(`\n✅ Processed ${imageMap.size} images (${uploadedCount} uploaded, ${reusedCount} reused)`)

  // Prepare heroImage reference
  const heroImagePath = localPlant.mainImage
  const heroAssetId = imageMap.get(heroImagePath)
  if (!heroAssetId) {
    throw new Error(`Hero image not found in uploaded images: ${heroImagePath}`)
  }
  const heroImageRef = createImageRef(heroAssetId)

  // Prepare gallery array (exclude hero image)
  // HARDENED: Each gallery item must have a stable deterministic _key
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

  console.log(`\n📝 Prepared gallery with ${galleryRefs.length} images (all with _key)`)

  // Prepare detailSections
  // HARDENED: Each detailSection must have _key, title (never blank), and description (never blank)
  const detailSectionsRefs = (localPlant.detailSections || []).map(section => {
    const assetId = imageMap.get(section.src)
    if (!assetId) {
      throw new Error(`Detail section image not found: ${section.src}`)
    }
    
    const key = deriveKeyFromPath(section.src)
    const title = deriveDetailSectionTitle(section, key)
    const description = deriveDetailSectionDescription(section, localPlant.commonName)
    
    // Validate title is never blank
    if (!title || title.trim() === '') {
      throw new Error(`Detail section title is blank for image: ${section.src}`)
    }
    
    // Validate description is never blank
    if (!description || description.trim() === '') {
      throw new Error(`Detail section description is blank for image: ${section.src}`)
    }
    
    return {
      _type: 'detailSection' as const,
      _key: key,
      key: key,
      image: createImageRef(assetId),
      title: title,
      description: description,
      alt: section.alt || title,
    }
  })

  console.log(`📝 Prepared ${detailSectionsRefs.length} detail sections (all with _key, title, and description)`)

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
    `*[_type=="plant" && slug.current=="ocotillo"][0]{
      "galleryMissingKeys": count(coalesce(gallery, [])[!defined(_key)]),
      "detailSectionsMissingKeys": count(coalesce(detailSections, [])[!defined(_key)]),
      "detailSectionsMissingTitles": count(coalesce(detailSections, [])[!defined(title) || title == ""]),
      "detailSectionsMissingDescriptions": count(coalesce(detailSections, [])[!defined(description) || description == ""]),
      "galleryCount": count(coalesce(gallery, [])),
      "detailSectionsCount": count(coalesce(detailSections, []))
    }`
  )
  console.log(`   Before update:`)
  console.log(`     Gallery items: ${beforeState?.galleryCount || 0} (missing keys: ${beforeState?.galleryMissingKeys || 0})`)
  console.log(`     Detail sections: ${beforeState?.detailSectionsCount || 0} (missing keys: ${beforeState?.detailSectionsMissingKeys || 0}, missing titles: ${beforeState?.detailSectionsMissingTitles || 0}, missing descriptions: ${beforeState?.detailSectionsMissingDescriptions || 0})`)

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
    `*[_type=="plant" && slug.current=="ocotillo"][0]{
      _id,_rev,_updatedAt,title,"slug":slug.current,
      "missingDetailDescriptions": count(coalesce(detailSections, [])[!defined(description) || description == ""]),
      "badDetail": count(coalesce(detailSections, [])[defined(image.asset._id)]),
      "goodDetail": count(coalesce(detailSections, [])[defined(image.asset._ref)]),
      "badGallery": count(coalesce(gallery, [])[defined(asset._id)]),
      "goodGallery": count(coalesce(gallery, [])[defined(asset._ref)]),
      "missingGalleryKeys": count(coalesce(gallery, [])[!defined(_key)]),
      "missingDetailKeys": count(coalesce(detailSections, [])[!defined(_key)]),
      "missingDetailTitles": count(coalesce(detailSections, [])[!defined(title) || title == ""])
    }`
  )

  console.log(`\n✅ Verification Results:`)
  console.log(`   _id: ${verification._id}`)
  console.log(`   _rev: ${verification._rev}`)
  console.log(`   _updatedAt: ${verification._updatedAt}`)
  console.log(`   title: ${verification.title}`)
  console.log(`   slug: ${verification.slug}`)
  console.log(`   missingDetailDescriptions: ${verification.missingDetailDescriptions} (should be 0)`)
  console.log(`   badDetail: ${verification.badDetail} (should be 0)`)
  console.log(`   goodDetail: ${verification.goodDetail} (should be >0)`)
  console.log(`   badGallery: ${verification.badGallery} (should be 0)`)
  console.log(`   goodGallery: ${verification.goodGallery} (should be >0)`)
  console.log(`   missingGalleryKeys: ${verification.missingGalleryKeys} (should be 0)`)
  console.log(`   missingDetailKeys: ${verification.missingDetailKeys} (should be 0)`)
  console.log(`   missingDetailTitles: ${verification.missingDetailTitles} (should be 0)`)
  
  // Validation checks
  let hasErrors = false
  
  if (verification.missingDetailTitles > 0) {
    console.error(`\n❌ ERROR: Some detail sections are missing titles!`)
    hasErrors = true
  }
  
  if (verification.missingDetailDescriptions > 0) {
    console.error(`\n❌ ERROR: Some detail sections are missing descriptions!`)
    hasErrors = true
  }
  
  if (verification.badGallery > 0 || verification.badDetail > 0) {
    console.error(`\n❌ ERROR: Some image references use _id instead of _ref!`)
    hasErrors = true
  }
  
  if (verification.goodGallery === 0 && verification.goodDetail === 0) {
    console.error(`\n❌ ERROR: No valid image references found!`)
    hasErrors = true
  }
  
  if (verification.missingGalleryKeys > 0 || verification.missingDetailKeys > 0) {
    console.error(`\n❌ ERROR: Some array items are missing _key values!`)
    console.error(`   missingGalleryKeys: ${verification.missingGalleryKeys}`)
    console.error(`   missingDetailKeys: ${verification.missingDetailKeys}`)
    hasErrors = true
  }
  
  if (hasErrors) {
    process.exit(1)
  }

  console.log(`\n✨ Migration complete!`)
  console.log(`   Assets uploaded: ${imageMap.size}`)
  console.log(`   Gallery images: ${galleryRefs.length}`)
  console.log(`   Detail sections: ${detailSectionsRefs.length}`)
  
  // List uploaded images
  console.log(`\n📋 Uploaded Images:`)
  for (const [path, assetId] of imageMap.entries()) {
    const filename = path.split('/').pop()
    console.log(`   - ${filename} (${assetId})`)
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

