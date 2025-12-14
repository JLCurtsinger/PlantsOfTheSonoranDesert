import {urlForImage} from './image'
import type {Plant} from '../plant-types'

type SanityGalleryItem = {
  image: any
  title?: string
  description?: string
  alt?: string
}

type SanityDetailSection = {
  image: any
  title: string
  description: string
  alt?: string
}

type SanityPlant = {
  _id: string
  title: string
  slug: string
  scientificName?: string
  about: string
  additionalInfo?: string
  uses?: string
  sortOrder?: number
  heroImage: any
  gallery?: any[]
  galleryItems?: SanityGalleryItem[]
  detailSections?: SanityDetailSection[]
}

// Maps Sanity plant data to the UI Plant type structure
// This is the single place where Sanity fields map to the existing UI plant shape
// Optionally merges with local plant data for fields missing in Sanity
export function toUiPlant(p: SanityPlant, localPlant?: Plant): Plant {
  const mainImage = urlForImage(p.heroImage).width(2000).quality(85).url()
  
  // Handle galleryItems (new structure with captions)
  let galleryImages: string[] = []
  let galleryDetails: Array<{src: string; alt: string; title?: string; description?: string}> = []
  
  if (p.galleryItems && p.galleryItems.length > 0) {
    // Use new galleryItems structure
    galleryImages = p.galleryItems.map(item => 
      urlForImage(item.image).width(1800).quality(85).url()
    )
    galleryDetails = p.galleryItems.map((item, index) => ({
      src: urlForImage(item.image).width(1800).quality(85).url(),
      alt: item.alt || `${p.title} photo ${index + 1}`,
      title: item.title,
      description: item.description,
    }))
  } else if (p.gallery && p.gallery.length > 0) {
    // Fallback to old gallery structure (backwards compatibility)
    galleryImages = p.gallery.map(img => 
      urlForImage(img).width(1800).quality(85).url()
    )
    // Try to match with local galleryDetails if available
    if (localPlant?.galleryDetails && localPlant.galleryDetails.length > 0) {
      galleryDetails = galleryImages.map((src, index) => {
        const localMatch = localPlant.galleryDetails?.find(g => g.src === src) || 
                          localPlant.galleryDetails?.[index]
        return {
          src,
          alt: localMatch?.alt || `${p.title} photo ${index + 1}`,
          title: localMatch?.title,
          description: localMatch?.description,
        }
      })
    } else {
      galleryDetails = galleryImages.map((src, index) => ({
        src,
        alt: `${p.title} photo ${index + 1}`,
        title: undefined,
        description: undefined,
      }))
    }
  } else if (localPlant?.galleryImages) {
    // Fallback to local gallery if Sanity has none
    galleryImages = localPlant.galleryImages
    galleryDetails = localPlant.galleryDetails || []
  }

  // Handle detailSections
  let detailSections: Array<{src: string; alt: string; title: string; description: string}> = []
  if (p.detailSections && p.detailSections.length > 0) {
    detailSections = p.detailSections.map(section => ({
      src: urlForImage(section.image).width(1800).quality(85).url(),
      alt: section.alt || section.title,
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
    uses: p.uses ?? localPlant?.uses,
    quickId: localPlant?.quickId,
    seasonalNotes: localPlant?.seasonalNotes,
    ethicsAndDisclaimers: localPlant?.ethicsAndDisclaimers,
    wildlifeValue: localPlant?.wildlifeValue,
    interestingFacts: localPlant?.interestingFacts,
  }
}