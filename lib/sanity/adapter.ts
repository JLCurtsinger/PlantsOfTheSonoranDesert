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
  gallery?: Array<{
    _key?: string
    [key: string]: any
  }>
  detailSections?: Array<{
    key: string
    title: string
    alt?: string
    galleryKey?: string
    description: string
    image: any
  }>
}

// Maps Sanity plant data to the UI Plant type structure
// This is the single place where Sanity fields map to the existing UI plant shape
// Optionally merges with local plant data for fields missing in Sanity
export function toUiPlant(p: SanityPlant, localPlant?: Plant): Plant {
  // Build base URL without width/quality - the loader will handle responsive sizing
  const mainImage = urlForImage(p.heroImage).url()
  
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
    // Create galleryImages from combined array - base URLs without width/quality
    galleryImages = combinedImages.map(img => 
      urlForImage(img).url()
    )
    
    // Build a map of galleryKey -> caption data for primary lookup
    const detailByGalleryKey = new Map<string, {title: string; alt: string; description: string}>()
    
    // Build a map of detailSection image URLs to their metadata for fallback matching
    const detailSectionMap = new Map<string, {title: string; alt: string; description: string}>()
    
    if (p.detailSections && p.detailSections.length > 0) {
      p.detailSections.forEach(section => {
        // Defensive guard: Sanity content can be incomplete or have null assets
        const assetRef = section?.image?.asset?._ref
        if (!assetRef) return

        const sectionImageUrl = urlForImage(section.image).url()
        if (!sectionImageUrl) return

        const captionData = {
          title: section.title || '',
          alt: section.alt || section.title || '',
          description: section.description || '',
        }
        
        // Primary: map by galleryKey if set
        if (section.galleryKey) {
          detailByGalleryKey.set(section.galleryKey, captionData)
        }
        
        // Fallback: also map by URL for backward compatibility
        detailSectionMap.set(sectionImageUrl, captionData)
      })
    }
    
    // Create galleryDetails by matching with detailSections first, then localPlant.galleryDetails
    // localPlant.galleryDetails[0] corresponds to heroImage (index 0)
    // localPlant.galleryDetails[1+] corresponds to gallery[] items (indices 1+)
    galleryDetails = galleryImages.map((src, index) => {
      let detailSection: {title: string; alt: string; description: string} | undefined
      
      // Priority 1: Match by galleryKey using gallery item _key (only for gallery items, not hero)
      if (index > 0 && p.gallery && p.gallery[index - 1]) {
        const galleryItem = p.gallery[index - 1]
        if (galleryItem._key && detailByGalleryKey.has(galleryItem._key)) {
          detailSection = detailByGalleryKey.get(galleryItem._key)
        }
      }
      
      // Priority 2: Fallback to URL-based matching
      if (!detailSection) {
        detailSection = detailSectionMap.get(src)
      }
      
      // Priority 3: Fall back to localPlant.galleryDetails if no detailSection match
      const localCaption = localPlant?.galleryDetails?.[index]
      
      return {
        src,
        alt: detailSection?.alt || localCaption?.alt || `${p.title} photo ${index + 1}`,
        title: detailSection?.title || localCaption?.title,
        description: detailSection?.description || localCaption?.description,
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
    // Use detailSections from Sanity - base URLs without width/quality
    // Defensive guard: Sanity content can be incomplete or have null assets
    detailSections = p.detailSections
      .filter(section => {
        const assetRef = section?.image?.asset?._ref
        return !!assetRef
      })
      .map(section => {
        const sectionImageUrl = urlForImage(section.image).url()
        return {
          src: sectionImageUrl || '',
          alt: section.alt || section.title || '',
          title: section.title || '',
          description: section.description || '',
        }
      })
      .filter(section => section.src) // Remove entries with empty URLs
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