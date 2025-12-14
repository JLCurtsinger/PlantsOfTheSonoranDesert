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
  sortOrder?: number
  heroImage: any
  gallery?: any[]
}

// Maps Sanity plant data to the UI Plant type structure
// This is the single place where Sanity fields map to the existing UI plant shape
export function toUiPlant(p: SanityPlant): Plant {
  const mainImage = urlForImage(p.heroImage).width(2000).quality(85).url()
  const galleryImages = (p.gallery ?? []).map(img => 
    urlForImage(img).width(1800).quality(85).url()
  )

  // Map gallery images to galleryDetails format
  const galleryDetails = galleryImages.map((src, index) => ({
    src,
    alt: `${p.title} photo ${index + 1}`,
    title: undefined,
    description: undefined,
  }))

  // Map gallery images to detailSections format
  const detailSections = galleryImages.map((src, index) => ({
    src,
    alt: `${p.title} photo ${index + 1}`,
    title: `${p.title} Photo ${index + 1}`,
    description: '',
  }))

  return {
    slug: p.slug,
    commonName: p.title,
    scientificName: p.scientificName ?? '',
    category: 'other' as const, // Default category since not in Sanity schema yet
    description: p.about,
    quickFacts: [], // Not in Sanity schema yet
    mainImage,
    galleryImages,
    galleryDetails,
    detailSections,
    uses: p.uses ?? undefined,
  }
}