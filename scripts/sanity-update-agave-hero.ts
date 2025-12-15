#!/usr/bin/env node

/**
 * Update the Agave hero image with caption metadata (title, alt text, description)
 * via a detailSection entry.
 * 
 * Does not duplicate the hero image in the gallery.
 */

import {createClient} from '@sanity/client'
import {config} from 'dotenv'
import {resolve} from 'path'

config({path: resolve(process.cwd(), '.env.local')})

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !dataset || !token) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token,
})

const SLUG = 'agave'

// Hero image metadata
const heroMetadata = {
  title: 'Lakeside agave',
  alt: 'Agave growing near a desert lake with water in the background',
  description: 'A mature agave growing along the edge of a desert lake. Agaves thrive in rocky soils and can take advantage of nearby moisture while remaining highly drought tolerant.',
}

async function main() {
  console.log(`\n🔍 Fetching Agave plant document (slug: ${SLUG})...`)

  // Fetch the plant document with hero image and detailSections
  const plant = await client.fetch(
    `*[_type == "plant" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      heroImage{
        ...,
        asset->{
          _id,
          originalFilename
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
      }
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

  const heroImage = plant.heroImage
  if (!heroImage || !heroImage.asset) {
    console.error('❌ Hero image not found')
    process.exit(1)
  }

  const heroAssetId = heroImage.asset._id
  const heroFilename = heroImage.asset.originalFilename || 'unknown'

  console.log(`📸 Hero image: ${heroFilename} (asset: ${heroAssetId})`)

  // Check if there's already a detailSection for the hero image
  const existingDetailSections = plant.detailSections || []
  const heroDetailSection = existingDetailSections.find((section: any) => 
    section.image?.asset?._id === heroAssetId
  )

  const patch = client.patch(plant._id)

  // Update hero image alt text
  if (!heroImage.alt || heroImage.alt !== heroMetadata.alt) {
    console.log('\n📝 Updating hero image alt text...')
    patch.set({
      'heroImage.alt': heroMetadata.alt,
    })
  } else {
    console.log('\n✓ Hero image alt text already set')
  }

  // Create or update detailSection for hero image
  if (heroDetailSection) {
    console.log('\n📝 Updating existing detailSection for hero image...')
    // Find the index of the existing section
    const sectionIndex = existingDetailSections.findIndex((section: any) => 
      section.image?.asset?._id === heroAssetId
    )

    // Update the section, preserving existing fields if they exist
    patch.set({
      [`detailSections[${sectionIndex}].title`]: heroDetailSection.title || heroMetadata.title,
      [`detailSections[${sectionIndex}].description`]: heroDetailSection.description || heroMetadata.description,
      [`detailSections[${sectionIndex}].alt`]: heroDetailSection.alt || heroMetadata.alt,
    })
  } else {
    console.log('\n📝 Creating new detailSection for hero image...')
    
    // Generate a key based on filename
    const key = heroFilename.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/\.(jpeg|jpg|png|webp)$/i, '')
    
    // Create new detailSection for hero image
    const newDetailSection = {
      _type: 'detailSection',
      key: `agave-${key}`,
      image: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: heroAssetId,
        },
        // Preserve crop and hotspot if present on heroImage
        ...(heroImage.crop && {crop: heroImage.crop}),
        ...(heroImage.hotspot && {hotspot: heroImage.hotspot}),
      },
      title: heroMetadata.title,
      description: heroMetadata.description,
      alt: heroMetadata.alt,
    }

    // Append to existing detailSections
    patch.set({
      detailSections: [...existingDetailSections, newDetailSection],
    })
  }

  // Commit the changes
  console.log('\n💾 Committing changes...')
  await patch.commit()

  console.log('✅ Document updated successfully')

  // Verify the update
  console.log('\n🔍 Verifying update...')
  const updated = await client.fetch(
    `*[_id == $id][0]{
      heroImage{
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
      }
    }`,
    {id: plant._id}
  )

  console.log('\n✅ Verification:')
  console.log(`   Hero image alt: "${updated.heroImage?.alt || '(none)'}"`)
  
  const heroSection = updated.detailSections?.find((section: any) =>
    section.image?.asset?.originalFilename === heroFilename
  )
  
  if (heroSection) {
    console.log(`   Hero detailSection found:`)
    console.log(`     Title: "${heroSection.title}"`)
    console.log(`     Alt: "${heroSection.alt}"`)
    console.log(`     Description: "${heroSection.description?.substring(0, 60)}..."`)
  } else {
    console.log(`   ⚠️  Hero detailSection not found`)
  }

  console.log(`   Total detailSections: ${updated.detailSections?.length || 0}`)

  console.log('\n✨ Done!\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})







