#!/usr/bin/env node

/**
 * Inspect a plant document to diagnose validation issues.
 * 
 * Fetches both published and draft versions and reports on:
 * - Whether draft exists
 * - Presence of galleryItems and detailSections
 * - Asset shape issues (missing _ref, using _id instead, etc.)
 * 
 * Usage:
 *   npm run sanity:inspect-plant -- --slug saguaro-cactus
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

interface AssetInfo {
  hasRef: boolean
  hasId: boolean
  hasType: boolean
  refValue?: string
  idValue?: string
  typeValue?: string
}

function inspectAsset(asset: any): AssetInfo {
  if (!asset) {
    return {hasRef: false, hasId: false, hasType: false}
  }
  
  return {
    hasRef: '_ref' in asset,
    hasId: '_id' in asset,
    hasType: '_type' in asset,
    refValue: asset._ref,
    idValue: asset._id,
    typeValue: asset._type,
  }
}

function inspectImageField(image: any, fieldName: string): AssetInfo | null {
  if (!image) return null
  
  if (image.asset) {
    return inspectAsset(image.asset)
  }
  
  return null
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  if (slugIndex === -1 || !args[slugIndex + 1]) {
    console.error('❌ Missing --slug argument')
    console.error('   Usage: npm run sanity:inspect-plant -- --slug saguaro-cactus')
    process.exit(1)
  }
  
  const slug = args[slugIndex + 1]
  console.log(`\n🔍 Inspecting plant: ${slug}\n`)

  // Fetch the published plant document
  console.log('📄 Fetching published document...')
  const published = await client.fetch(
    `*[_type == "plant" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage,
      gallery,
      galleryItems,
      detailSections
    }`,
    {slug}
  )

  if (!published) {
    console.error(`❌ Published plant document with slug "${slug}" not found`)
    process.exit(1)
  }

  console.log(`✅ Found published: ${published.title} (ID: ${published._id})`)

  // Fetch the draft document
  const draftId = `drafts.${published._id}`
  console.log(`\n📄 Fetching draft document (${draftId})...`)
  const draft = await client.fetch(
    `*[_id == $draftId][0]{
      _id,
      _type,
      title,
      "slug": slug.current,
      heroImage,
      gallery,
      galleryItems,
      detailSections
    }`,
    {draftId}
  )

  if (draft) {
    console.log(`✅ Found draft: ${draft.title} (ID: ${draft._id})`)
  } else {
    console.log(`⚠️  No draft document found`)
  }

  // Inspect published document
  console.log(`\n${'='.repeat(60)}`)
  console.log('📋 PUBLISHED DOCUMENT')
  console.log(`${'='.repeat(60)}`)
  console.log(`_id: ${published._id}`)
  console.log(`title: ${published.title}`)
  console.log(`slug: ${published.slug}`)
  console.log(`\ngalleryItems: ${published.galleryItems ? `${published.galleryItems.length} items` : 'missing/empty'}`)
  console.log(`detailSections: ${published.detailSections ? `${published.detailSections.length} items` : 'missing/empty'}`)

  // Inspect heroImage
  if (published.heroImage) {
    const heroAsset = inspectImageField(published.heroImage, 'heroImage')
    if (heroAsset) {
      console.log(`\nheroImage.asset:`)
      console.log(`  has _ref: ${heroAsset.hasRef}${heroAsset.refValue ? ` (${heroAsset.refValue})` : ''}`)
      console.log(`  has _id: ${heroAsset.hasId}${heroAsset.idValue ? ` (${heroAsset.idValue})` : ''}`)
      console.log(`  has _type: ${heroAsset.hasType}${heroAsset.typeValue ? ` (${heroAsset.typeValue})` : ''}`)
      if (heroAsset.hasId && !heroAsset.hasRef) {
        console.log(`  ⚠️  ISSUE: Has _id but missing _ref`)
      }
    } else {
      console.log(`\nheroImage: present but no asset field`)
    }
  } else {
    console.log(`\nheroImage: missing`)
  }

  // Inspect gallery
  if (published.gallery && Array.isArray(published.gallery)) {
    console.log(`\ngallery: ${published.gallery.length} items`)
    published.gallery.forEach((img: any, idx: number) => {
      const asset = inspectImageField(img, `gallery[${idx}]`)
      if (asset) {
        console.log(`  gallery[${idx}].asset:`)
        console.log(`    has _ref: ${asset.hasRef}${asset.refValue ? ` (${asset.refValue})` : ''}`)
        console.log(`    has _id: ${asset.hasId}${asset.idValue ? ` (${asset.idValue})` : ''}`)
        if (asset.hasId && !asset.hasRef) {
          console.log(`    ⚠️  ISSUE: Has _id but missing _ref`)
        }
      }
    })
  } else {
    console.log(`\ngallery: missing/empty`)
  }

  // Inspect galleryItems
  if (published.galleryItems && Array.isArray(published.galleryItems)) {
    console.log(`\ngalleryItems: ${published.galleryItems.length} items`)
    published.galleryItems.forEach((item: any, idx: number) => {
      if (item.image) {
        const asset = inspectImageField(item.image, `galleryItems[${idx}].image`)
        if (asset) {
          console.log(`  galleryItems[${idx}].image.asset:`)
          console.log(`    has _ref: ${asset.hasRef}${asset.refValue ? ` (${asset.refValue})` : ''}`)
          console.log(`    has _id: ${asset.hasId}${asset.idValue ? ` (${asset.idValue})` : ''}`)
          if (asset.hasId && !asset.hasRef) {
            console.log(`    ⚠️  ISSUE: Has _id but missing _ref`)
          }
        }
      }
    })
  }

  // Inspect detailSections
  if (published.detailSections && Array.isArray(published.detailSections)) {
    console.log(`\ndetailSections: ${published.detailSections.length} items`)
    published.detailSections.forEach((section: any, idx: number) => {
      if (section.image) {
        const asset = inspectImageField(section.image, `detailSections[${idx}].image`)
        if (asset) {
          console.log(`  detailSections[${idx}].image.asset:`)
          console.log(`    has _ref: ${asset.hasRef}${asset.refValue ? ` (${asset.refValue})` : ''}`)
          console.log(`    has _id: ${asset.hasId}${asset.idValue ? ` (${asset.idValue})` : ''}`)
          if (asset.hasId && !asset.hasRef) {
            console.log(`    ⚠️  ISSUE: Has _id but missing _ref`)
          }
        }
      }
    })
  }

  // Inspect draft document if it exists
  if (draft) {
    console.log(`\n${'='.repeat(60)}`)
    console.log('📋 DRAFT DOCUMENT')
    console.log(`${'='.repeat(60)}`)
    console.log(`_id: ${draft._id}`)
    console.log(`title: ${draft.title}`)
    console.log(`slug: ${draft.slug}`)
    console.log(`\ngalleryItems: ${draft.galleryItems ? `${draft.galleryItems.length} items` : 'missing/empty'}`)
    console.log(`detailSections: ${draft.detailSections ? `${draft.detailSections.length} items` : 'missing/empty'}`)

    // Inspect heroImage
    if (draft.heroImage) {
      const heroAsset = inspectImageField(draft.heroImage, 'heroImage')
      if (heroAsset) {
        console.log(`\nheroImage.asset:`)
        console.log(`  has _ref: ${heroAsset.hasRef}${heroAsset.refValue ? ` (${heroAsset.refValue})` : ''}`)
        console.log(`  has _id: ${heroAsset.hasId}${heroAsset.idValue ? ` (${heroAsset.idValue})` : ''}`)
        if (heroAsset.hasId && !heroAsset.hasRef) {
          console.log(`  ⚠️  ISSUE: Has _id but missing _ref`)
        }
      }
    }

    // Inspect gallery
    if (draft.gallery && Array.isArray(draft.gallery)) {
      console.log(`\ngallery: ${draft.gallery.length} items`)
      draft.gallery.forEach((img: any, idx: number) => {
        const asset = inspectImageField(img, `gallery[${idx}]`)
        if (asset) {
          console.log(`  gallery[${idx}].asset:`)
          console.log(`    has _ref: ${asset.hasRef}${asset.refValue ? ` (${asset.refValue})` : ''}`)
          console.log(`    has _id: ${asset.hasId}${asset.idValue ? ` (${asset.idValue})` : ''}`)
          if (asset.hasId && !asset.hasRef) {
            console.log(`    ⚠️  ISSUE: Has _id but missing _ref`)
          }
        }
      })
    }

    // Inspect galleryItems
    if (draft.galleryItems && Array.isArray(draft.galleryItems)) {
      console.log(`\ngalleryItems: ${draft.galleryItems.length} items`)
      draft.galleryItems.forEach((item: any, idx: number) => {
        if (item.image) {
          const asset = inspectImageField(item.image, `galleryItems[${idx}].image`)
          if (asset) {
            console.log(`  galleryItems[${idx}].image.asset:`)
            console.log(`    has _ref: ${asset.hasRef}${asset.refValue ? ` (${asset.refValue})` : ''}`)
            console.log(`    has _id: ${asset.hasId}${asset.idValue ? ` (${asset.idValue})` : ''}`)
            if (asset.hasId && !asset.hasRef) {
              console.log(`    ⚠️  ISSUE: Has _id but missing _ref`)
            }
          }
        }
      })
    }

    // Inspect detailSections
    if (draft.detailSections && Array.isArray(draft.detailSections)) {
      console.log(`\ndetailSections: ${draft.detailSections.length} items`)
      draft.detailSections.forEach((section: any, idx: number) => {
        if (section.image) {
          const asset = inspectImageField(section.image, `detailSections[${idx}].image`)
          if (asset) {
            console.log(`  detailSections[${idx}].image.asset:`)
            console.log(`    has _ref: ${asset.hasRef}${asset.refValue ? ` (${asset.refValue})` : ''}`)
            console.log(`    has _id: ${asset.hasId}${asset.idValue ? ` (${asset.idValue})` : ''}`)
            if (asset.hasId && !asset.hasRef) {
              console.log(`    ⚠️  ISSUE: Has _id but missing _ref`)
            }
          }
        }
      })
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 SUMMARY')
  console.log(`${'='.repeat(60)}`)
  console.log(`Published _id: ${published._id}`)
  console.log(`Draft exists: ${draft ? 'YES' : 'NO'}`)
  if (draft) {
    console.log(`Draft _id: ${draft._id}`)
  }
  console.log(`\nPublished has galleryItems: ${published.galleryItems ? 'YES' : 'NO'}`)
  console.log(`Published has detailSections: ${published.detailSections ? 'YES' : 'NO'}`)
  if (draft) {
    console.log(`Draft has galleryItems: ${draft.galleryItems ? 'YES' : 'NO'}`)
    console.log(`Draft has detailSections: ${draft.detailSections ? 'YES' : 'NO'}`)
  }
  console.log(`\n✨ Inspection complete!\n`)
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})











