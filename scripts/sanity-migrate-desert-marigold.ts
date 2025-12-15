#!/usr/bin/env node

/**
 * Migration script for Desert Marigold plant to Sanity.
 * 
 * This script:
 * 1. Loads local Desert Marigold plant data
 * 2. Finds or creates the plant document in Sanity (slug: "desert-marigold")
 * 3. Uploads all local images to Sanity as image assets (or reuses existing)
 * 4. Populates the document with canonical fields:
 *    - heroImage (image ref)
 *    - gallery (array of image refs, excluding hero)
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
import {readFileSync, existsSync} from 'fs'
import {desertMarigold} from '../lib/plant-data/desert-marigold'

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

const SLUG = 'desert-marigold'
const PUBLIC_DIR = resolve(process.cwd(), 'public')

/**
 * Derives a stable key from an image path for arrays.
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
 * Prefers local description, then short factual sentence from title/alt, then cleaned filename sentence.
 */
function deriveDetailSectionDescription(
  section: { description?: string; alt?: string; title?: string; src: string },
  title: string
): string {
  // Prefer local description if present and non-empty
  if (section.description && section.description.trim()) {
    return section.description.trim()
  }
  
  // Fall back to short factual sentence from title/alt
  if (section.alt && section.alt.trim()) {
    return section.alt.trim()
  }
  
  // Final fallback: cleaned filename sentence
  const basename = section.src.split('/').pop()?.replace(/\.[^.]+$/, '') || 'image'
  const sentence = basename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim()
  return `${sentence} of the desert marigold plant.`
}

/**
 * Uploads an image file to Sanity and returns the asset reference.
 * Skips upload if file doesn't exist locally.
 */
async function uploadImage(imagePath: string): Promise<string | null> {
  const fullPath = resolve(PUBLIC_DIR, imagePath.replace(/^\//, ''))
  
  if (!existsSync(fullPath)) {
    console.log(`   ⚠️  Local file not found: ${imagePath}`)
    return null
  }
  
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
 * Extracts asset reference from an existing Sanity image object.
 * Returns null if not a valid reference.
 */
function extractAssetRef(image: any): string | null {
  if (!image || !image.asset) return null
  
  // Prefer _ref (correct format)
  if (image.asset._ref && typeof image.asset._ref === 'string') {
    return image.asset._ref
  }
  
  // Fallback to _id (needs conversion, but we can use it)
  if (image.asset._id && typeof image.asset._id === 'string') {
    return image.asset._id
  }
  
  return null
}

/**
 * Creates an image reference object for Sanity.
 * Never writes asset._id, always uses asset: { _ref: "...", _type: "reference" }
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

async function main() {
  console.log(`\n🌵 Migrating Desert Marigold to Sanity`)
  console.log(`   Project: ${projectId}`)
  console.log(`   Dataset: ${dataset}`)
  console.log(`   Slug: ${SLUG}\n`)

  // Load local plant data
  const localPlant = desertMarigold
  console.log(`✅ Loaded local plant: ${localPlant.commonName}`)

  // Find or create plant document
  console.log(`\n🔍 Finding plant document in Sanity...`)
  let plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage,
      gallery,
      detailSections
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
  
  // For detailSections, use galleryDetails if detailSections don't exist locally
  const detailSectionsSource = localPlant.detailSections || localPlant.galleryDetails || []
  detailSectionsSource.forEach((section: any) => {
    if (section.src) {
      imagePaths.add(section.src)
    }
  })

  const uniqueImages = Array.from(imagePaths)
  console.log(`\n📸 Found ${uniqueImages.length} unique images to process`)

  // Build map of existing asset refs from current document
  const existingAssetMap = new Map<string, string>()
  
  // Extract from heroImage
  if (plant.heroImage) {
    const assetRef = extractAssetRef(plant.heroImage)
    if (assetRef) {
      existingAssetMap.set(localPlant.mainImage, assetRef)
      console.log(`   ♻️  Found existing heroImage asset: ${assetRef}`)
    }
  }
  
  // Extract from gallery
  if (plant.gallery && Array.isArray(plant.gallery)) {
    plant.gallery.forEach((img: any, index: number) => {
      const assetRef = extractAssetRef(img)
      if (assetRef) {
        // Try to match by index or asset ref
        const matchingPath = uniqueImages.find(path => {
          // This is approximate - we'll refine during upload
          return true
        })
        if (matchingPath) {
          existingAssetMap.set(matchingPath, assetRef)
        }
      }
    })
  }
  
  // Extract from detailSections
  if (plant.detailSections && Array.isArray(plant.detailSections)) {
    plant.detailSections.forEach((section: any) => {
      const assetRef = extractAssetRef(section.image)
      if (assetRef && section.key) {
        // Try to match by key
        const matchingSection = detailSectionsSource.find((s: any) => {
          const key = deriveKeyFromPath(s.src)
          return key === section.key
        })
        if (matchingSection && matchingSection.src) {
          existingAssetMap.set(matchingSection.src, assetRef)
          console.log(`   ♻️  Found existing detailSection asset for key ${section.key}: ${assetRef}`)
        }
      }
    })
  }

  // Upload all images and create a map of path -> asset ID
  const imageMap = new Map<string, string>()
  
  console.log(`\n📤 Processing images...`)
  for (const imagePath of uniqueImages) {
    // Check if we already have an asset ref for this path
    if (existingAssetMap.has(imagePath)) {
      const existingRef = existingAssetMap.get(imagePath)!
      imageMap.set(imagePath, existingRef)
      console.log(`   ♻️  Reusing existing asset: ${imagePath} -> ${existingRef}`)
    } else {
      // Upload new image
      try {
        const assetId = await uploadImage(imagePath)
        if (assetId) {
          imageMap.set(imagePath, assetId)
        }
      } catch (error) {
        console.error(`   ❌ Skipping ${imagePath} due to upload error`)
        // Continue with other images
      }
    }
  }

  console.log(`\n✅ Processed ${imageMap.size} images`)

  // Prepare heroImage reference
  const heroImagePath = localPlant.mainImage
  const heroAssetId = imageMap.get(heroImagePath)
  if (!heroAssetId) {
    throw new Error(`Hero image not found in processed images: ${heroImagePath}`)
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

  // Prepare detailSections from local data
  // Use detailSections if available, otherwise use galleryDetails
  const detailSectionsRefs = detailSectionsSource.map((section: any) => {
    const src = section.src || section.image || section
    if (typeof src !== 'string') {
      throw new Error(`Invalid detail section source: ${JSON.stringify(section)}`)
    }
    
    const assetId = imageMap.get(src)
    if (!assetId) {
      throw new Error(`Detail section image not found: ${src}`)
    }
    
    const key = deriveKeyFromPath(src)
    const title = deriveDetailSectionTitle(section, key)
    const description = deriveDetailSectionDescription(section, title)
    const alt = section.alt || title
    
    return {
      _type: 'detailSection' as const,
      _key: key,
      key: key,
      image: createImageRef(assetId),
      title: title,
      description: description,
      alt: alt,
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
    `*[_type=="plant" && slug.current=="desert-marigold"][0]{
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
    `*[_type=="plant" && slug.current=="desert-marigold"][0]{
      _id,_rev,_updatedAt,title,"slug":slug.current,
      "badGallery": count(coalesce(gallery, [])[defined(asset._id)]),
      "goodGallery": count(coalesce(gallery, [])[defined(asset._ref)]),
      "missingGalleryKeys": count(coalesce(gallery, [])[!defined(_key)]),
      "badDetail": count(coalesce(detailSections, [])[defined(image.asset._id)]),
      "goodDetail": count(coalesce(detailSections, [])[defined(image.asset._ref)]),
      "missingDetailKeys": count(coalesce(detailSections, [])[!defined(_key)]),
      "missingDetailTitles": count(coalesce(detailSections, [])[!defined(title) || title == ""]),
      "missingDetailDescriptions": count(coalesce(detailSections, [])[!defined(description) || description == ""])
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
  console.log(`   missingGalleryKeys: ${verification.missingGalleryKeys} (should be 0)`)
  console.log(`   missingDetailKeys: ${verification.missingDetailKeys} (should be 0)`)
  console.log(`   missingDetailTitles: ${verification.missingDetailTitles} (should be 0)`)
  console.log(`   missingDetailDescriptions: ${verification.missingDetailDescriptions} (should be 0)`)
  
  if (verification.badGallery > 0 || verification.badDetail > 0) {
    console.error(`\n❌ ERROR: Some image references use _id instead of _ref!`)
    process.exit(1)
  }
  
  if (verification.goodGallery === 0 && verification.goodDetail === 0) {
    console.error(`\n❌ ERROR: No valid image references found!`)
    process.exit(1)
  }
  
  if (verification.missingGalleryKeys > 0 || verification.missingDetailKeys > 0) {
    console.error(`\n❌ ERROR: Some array items are missing _key values!`)
    console.error(`   missingGalleryKeys: ${verification.missingGalleryKeys}`)
    console.error(`   missingDetailKeys: ${verification.missingDetailKeys}`)
    process.exit(1)
  }
  
  if (verification.missingDetailTitles > 0 || verification.missingDetailDescriptions > 0) {
    console.error(`\n❌ ERROR: Some detail sections are missing required fields!`)
    console.error(`   missingDetailTitles: ${verification.missingDetailTitles}`)
    console.error(`   missingDetailDescriptions: ${verification.missingDetailDescriptions}`)
    process.exit(1)
  }

  console.log(`\n✨ Migration complete!`)
  console.log(`   Assets processed: ${imageMap.size}`)
  console.log(`   Gallery images: ${galleryRefs.length}`)
  console.log(`   Detail sections: ${detailSectionsRefs.length}`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

