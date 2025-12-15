#!/usr/bin/env node

/**
 * Update the Agave plant document in Sanity with:
 * 1. Gallery image captions (alt text, and title/description via detailSections)
 * 2. Informational sections (quickIdChecklist, seasonalNotes, uses, etc.)
 * 
 * Only updates the Agave document (slug: "agave").
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

const SLUG = 'agave'

// Gallery image metadata to update
const galleryMetadata = [
  {
    filename: 'mountaintop-agave.jpeg',
    title: 'Mountaintop agave',
    alt: 'Agave growing on a rocky mountain summit',
    description: 'A hardy agave growing on the exposed summit of the Flatiron in the Superstition Mountains. These plants tolerate intense sun, wind, and thin rocky soils at higher elevations.',
  },
  {
    filename: 'IMG_6648.jpeg',
    title: 'Desert agave rosette',
    alt: 'Agave rosette growing in rocky desert soil',
    description: 'A mature agave forming a dense rosette of thick, pointed leaves. The plant stores water in its leaves, allowing it to survive long dry periods in the Sonoran Desert.',
  },
  {
    filename: 'IMG_6478.jpeg',
    title: 'Young agave plant',
    alt: 'Young agave growing among desert vegetation',
    description: 'A younger agave establishing itself among native desert plants. Agaves grow slowly and can take many years to reach maturity.',
  },
]

async function main() {
  console.log(`\n🔍 Fetching Agave plant document (slug: ${SLUG})...`)

  // Fetch the plant document with full gallery and detailSections
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      gallery[]{
        ...,
        asset->{
          _id,
          originalFilename,
          url
        }
      },
      detailSections[]{
        ...,
        image{
          ...,
          asset->{
            _id,
            originalFilename
          }
        }
      },
      quickIdChecklist,
      seasonalNotes,
      uses,
      ethicsAndDisclaimers,
      wildlifeValue,
      interestingFacts
    }`,
    {slug: SLUG}
  )

  if (!plant) {
    console.error(`❌ Plant document with slug "${SLUG}" not found`)
    process.exit(1)
  }

  if (plant._type !== 'plant') {
    console.error(`❌ Document is not a plant (type: ${plant._type})`)
    process.exit(1)
  }

  console.log(`✅ Found plant: ${plant.title} (ID: ${plant._id})`)
  console.log(`📸 Found ${plant.gallery?.length || 0} images in gallery`)

  // Part 1: Update gallery images with alt text and create/update detailSections
  console.log('\n📝 Part 1: Updating gallery image captions...')

  // First, fetch the image assets we need to add to gallery if they're not already there
  const existingGallery = plant.gallery || []
  const assetIdsToAdd: string[] = []

  // Check if we need to add any images to the gallery
  for (const metadata of galleryMetadata) {
    const asset = await client.fetch(
      `*[_type == "sanity.imageAsset" && originalFilename == $filename][0]{
        _id,
        originalFilename
      }`,
      {filename: metadata.filename}
    )

    if (asset) {
      // Check if this asset is already in the gallery
      const alreadyInGallery = existingGallery.some((img: any) => {
        const imgAssetId = img.asset?._id || img.asset?._ref
        return imgAssetId === asset._id
      })

      if (!alreadyInGallery) {
        assetIdsToAdd.push(asset._id)
        console.log(`   📌 Found asset for ${metadata.filename}, will add to gallery`)
      }
    }
  }

  // Build the updated gallery array - start with existing gallery
  let updatedGallery = [...existingGallery]
  const existingDetailSections = plant.detailSections || []

  // Add new images to gallery if needed
  for (const assetId of assetIdsToAdd) {
    const asset = await client.fetch(
      `*[_type == "sanity.imageAsset" && _id == $id][0]{
        _id,
        originalFilename
      }`,
      {id: assetId}
    )

    if (asset) {
      const matchingMetadata = galleryMetadata.find(m => 
        asset.originalFilename.toLowerCase() === m.filename.toLowerCase()
      )

      updatedGallery.push({
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetId,
        },
        ...(matchingMetadata && {alt: matchingMetadata.alt}),
      })
    }
  }

  // Build a map of asset IDs to existing detail sections for quick lookup
  const detailSectionMap = new Map<string, any>()
  existingDetailSections.forEach((section: any) => {
    if (section.image?.asset?._id) {
      detailSectionMap.set(section.image.asset._id, section)
    }
  })

  // Update existing gallery images with alt text (only if missing)
  updatedGallery = updatedGallery.map((img: any, index: number) => {
    const filename = img.asset?.originalFilename
    if (!filename) {
      console.log(`   ⚠️  Gallery image at index ${index} has no filename, skipping`)
      return img
    }

    // Find matching metadata
    const metadata = galleryMetadata.find(m => 
      filename.toLowerCase() === m.filename.toLowerCase() ||
      filename.toLowerCase().includes(m.filename.toLowerCase().replace('.jpeg', ''))
    )

    if (metadata) {
      console.log(`   ✅ Found match: ${filename}`)
      // Update alt text if missing
      if (!img.alt) {
        return {
          ...img,
          alt: metadata.alt,
        }
      } else {
        console.log(`      Alt text already exists, preserving: "${img.alt}"`)
      }
    }

    return img
  })

  // Create/update detailSections for matching gallery images
  const updatedDetailSections: any[] = []
  const processedAssetIds = new Set<string>()

  // First, preserve existing detailSections that don't match our gallery images
  existingDetailSections.forEach((section: any) => {
    const assetId = section.image?.asset?._id
    const filename = section.image?.asset?.originalFilename

    // Check if this section matches one of our gallery images
    const matchesGallery = galleryMetadata.some(m => 
      filename && (
        filename.toLowerCase() === m.filename.toLowerCase() ||
        filename.toLowerCase().includes(m.filename.toLowerCase().replace('.jpeg', ''))
      )
    )

    if (assetId && matchesGallery) {
      // We'll update this below
      processedAssetIds.add(assetId)
    } else {
      // Preserve non-matching detailSections
      updatedDetailSections.push(section)
    }
  })

  // Create/update detailSections for gallery images (including newly added ones)
  // First, we need to resolve all asset references to get filenames
  const galleryWithAssets = await Promise.all(
    updatedGallery.map(async (img: any) => {
      const assetRef = img.asset?._ref || img.asset?._id
      if (!assetRef) return {img, filename: null, assetId: null}

      // Fetch the asset to get its filename
      const asset = await client.fetch(
        `*[_type == "sanity.imageAsset" && _id == $id][0]{
          _id,
          originalFilename
        }`,
        {id: assetRef}
      )

      return {
        img,
        filename: asset?.originalFilename || img.asset?.originalFilename,
        assetId: assetRef,
      }
    })
  )

  galleryWithAssets.forEach(({img, filename, assetId}) => {
    if (!filename || !assetId) return

    const metadata = galleryMetadata.find(m => {
      const metaName = m.filename.toLowerCase().replace(/\.jpeg$/i, '')
      const imgName = filename.toLowerCase().replace(/\.(jpeg|jpg|png|webp)$/i, '')
      return imgName === metaName || imgName.includes(metaName) || metaName.includes(imgName)
    })

    if (metadata) {
      // Check if we already have a detailSection for this image
      const existingSection = detailSectionMap.get(assetId)

      if (existingSection) {
        // Update existing section - only populate missing fields
        updatedDetailSections.push({
          ...existingSection,
          title: existingSection.title || metadata.title,
          description: existingSection.description || metadata.description,
          alt: existingSection.alt || metadata.alt,
        })
        console.log(`   ✅ Updated detailSection for ${filename}`)
      } else {
        // Create new detailSection
        // Generate a key based on filename
        const key = filename.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/\.(jpeg|jpg|png|webp)$/i, '')
        updatedDetailSections.push({
          _type: 'detailSection',
          key: `agave-${key}`,
          image: {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: assetId,
            },
            ...(img.crop && {crop: img.crop}),
            ...(img.hotspot && {hotspot: img.hotspot}),
          },
          title: metadata.title,
          description: metadata.description,
          alt: metadata.alt,
        })
        console.log(`   ✅ Created detailSection for ${filename}`)
      }
    }
  })

  console.log(`   📝 Updated ${updatedGallery.length} gallery images`)
  console.log(`   📝 Prepared ${updatedDetailSections.length} detailSections`)

  // Part 2: Update informational sections
  console.log('\n📝 Part 2: Updating informational sections...')

  const quickIdChecklist = [
    'Thick, fleshy leaves arranged in a symmetrical rosette',
    'Sharp terminal spine at the tip of each leaf',
    'Leaves often have serrated or toothed margins',
    'Typically grows close to the ground until flowering',
    'Common on rocky slopes, desert flats, and hillsides',
  ]

  const seasonalNotes = 'Agaves grow slowly year-round but are most active during warmer months. Many species flower only once after decades of growth, producing a tall flowering stalk before the plant dies. Flowering typically occurs in late spring or summer depending on species and rainfall.'

  const uses = 'Agaves have long been used by Indigenous peoples for food, fiber, and tools. Roasted agave hearts were an important traditional food source, and fibers from the leaves were used to make rope and textiles. This site does not provide harvesting guidance.'

  const ethicsAndDisclaimers = 'Do not remove agaves from the wild or disturb protected plants. Many agave species are slow growing and vulnerable to overharvesting. This site is for educational purposes only and does not provide foraging or medicinal advice.'

  const wildlifeValue = 'Agave flowers provide an important nectar source for bats, birds, and insects. When flowering, agaves can support large numbers of pollinators. Dense rosettes also offer shelter for small desert animals.'

  const interestingFacts = [
    'Many agave species flower only once after 10 to 50 years of growth',
    'The tall flowering stalk can grow several inches per day',
    'After flowering, the main plant dies but often produces pups at its base',
    'Agaves are often confused with cacti but are not closely related',
  ]

  // Prepare the patch
  console.log('\n💾 Updating Sanity document...')

  const patch = client.patch(plant._id)

  // Update gallery with alt text
  patch.set({gallery: updatedGallery})

  // Update detailSections
  patch.set({detailSections: updatedDetailSections})

  // Update informational sections
  patch.set({
    quickIdChecklist,
    seasonalNotes,
    uses,
    ethicsAndDisclaimers,
    wildlifeValue,
    interestingFacts,
  })

  await patch.commit()

  console.log('✅ Document updated successfully')

  // Re-fetch to verify
  console.log('\n🔍 Verifying update...')
  const updated = await client.fetch(
    `*[_id == $id][0]{
      gallery[]{
        alt,
        asset->{originalFilename}
      },
      detailSections[]{
        title,
        description,
        alt,
        image{
          asset->{originalFilename}
        }
      },
      quickIdChecklist,
      seasonalNotes,
      uses,
      ethicsAndDisclaimers,
      wildlifeValue,
      interestingFacts
    }`,
    {id: plant._id}
  )

  console.log('\n✅ Verification:')
  console.log(`   Gallery images: ${updated.gallery?.length || 0} items`)
  updated.gallery?.forEach((img: any, i: number) => {
    console.log(`     ${i + 1}. ${img.asset?.originalFilename || 'unknown'}: alt="${img.alt || '(none)'}"`)
  })
  console.log(`   Detail sections: ${updated.detailSections?.length || 0} items`)
  updated.detailSections?.forEach((section: any, i: number) => {
    console.log(`     ${i + 1}. "${section.title}" - ${section.image?.asset?.originalFilename || 'unknown'}`)
  })
  console.log(`   Quick ID Checklist: ${updated.quickIdChecklist?.length || 0} items`)
  console.log(`   Seasonal Notes: ${updated.seasonalNotes ? '✓' : '✗'}`)
  console.log(`   Uses: ${updated.uses ? '✓' : '✗'}`)
  console.log(`   Ethics & Disclaimers: ${updated.ethicsAndDisclaimers ? '✓' : '✗'}`)
  console.log(`   Wildlife Value: ${updated.wildlifeValue ? '✓' : '✗'}`)
  console.log(`   Interesting Facts: ${updated.interestingFacts?.length || 0} items`)

  console.log('\n✨ Done!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

