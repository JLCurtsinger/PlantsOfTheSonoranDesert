import {urlForImage} from './image'
import type {Plant} from '../plant-types'

type SanityPlant = {
  _id: string
  title: string
  slug: string
  scientificName?: string
  about: string
  additionalInfo?: string
  uses?: string
  quickIdChecklist?: string[]
  seasonalNotes?: string
  ethicsAndDisclaimers?: string
  wildlifeValue?: string
  interestingFacts?: string[]
  sortOrder?: number
  heroImage: any
  gallery?: any[]
  detailSections?: Array<{
    key: string
    title: string
    alt?: string
    description: string
    image: any
  }>
}

// Maps Sanity plant data to the UI Plant type structure
// This is the single place where Sanity fields map to the existing UI plant shape
// Optionally merges with local plant data for fields missing in Sanity
export function toUiPlant(p: SanityPlant, localPlant?: Plant): Plant {
  const mainImage = urlForImage(p.heroImage).width(2000).quality(85).url()
  
  // Build gallery deterministically from heroImage + gallery[]
  // Index 0 = heroImage, indices 1+ = gallery[] items
  let galleryImages: string[] = []
  let galleryDetails: Array<{src: string; alt: string; title?: string; description?: string}> = []
  
  // Build combined image array: [heroImage, ...gallery] (skip nulls)
  const combinedImages: any[] = []
  if (p.heroImage) {
    combinedImages.push(p.heroImage)
  }
  if (p.gallery && p.gallery.length > 0) {
    combinedImages.push(...p.gallery.filter(img => img != null))
  }
  
  if (combinedImages.length > 0) {
    // Create galleryImages from combined array
    galleryImages = combinedImages.map(img => 
      urlForImage(img).width(1800).quality(85).url()
    )
    
    // Create galleryDetails by indexing into localPlant.galleryDetails
    // localPlant.galleryDetails[0] corresponds to heroImage (index 0)
    // localPlant.galleryDetails[1+] corresponds to gallery[] items (indices 1+)
    galleryDetails = galleryImages.map((src, index) => {
      const localCaption = localPlant?.galleryDetails?.[index]
      return {
        src,
        alt: localCaption?.alt || `${p.title} photo ${index + 1}`,
        title: localCaption?.title,
        description: localCaption?.description,
      }
    })
  } else if (localPlant?.galleryImages) {
    // Fallback to local gallery if Sanity has none
    galleryImages = localPlant.galleryImages
    galleryDetails = localPlant.galleryDetails || []
  }

  // Handle detailSections - prefer Sanity, fallback to local
  let detailSections: Array<{src: string; alt: string; title: string; description: string}> = []
  
  if (p.detailSections && p.detailSections.length > 0) {
    // Use detailSections from Sanity
    detailSections = p.detailSections.map(section => ({
      src: urlForImage(section.image).width(1200).quality(85).url(),
      alt: section.alt || section.title || '',
      title: section.title,
      description: section.description,
    }))
  } else if (localPlant?.detailSections) {
    // Fallback to local detailSections if Sanity has none
    detailSections = localPlant.detailSections
  }

  return {
    slug: p.slug,
    commonName: p.title,
    scientificName: p.scientificName ?? localPlant?.scientificName ?? '',
    category: localPlant?.category ?? 'other' as const,
    description: p.about,
    quickFacts: localPlant?.quickFacts ?? [],
    mainImage,
    galleryImages,
    galleryDetails,
    detailSections: detailSections.length > 0 ? detailSections : undefined,
    quickId: p.quickIdChecklist ?? localPlant?.quickId,
    seasonalNotes: p.seasonalNotes ?? localPlant?.seasonalNotes,
    uses: p.uses ?? localPlant?.uses,
    ethicsAndDisclaimers: p.ethicsAndDisclaimers ?? localPlant?.ethicsAndDisclaimers,
    wildlifeValue: p.wildlifeValue ?? localPlant?.wildlifeValue,
    interestingFacts: p.interestingFacts ?? localPlant?.interestingFacts,
  }
}