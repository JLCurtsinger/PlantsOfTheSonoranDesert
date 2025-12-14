import {getSanityClient} from '../sanity/client'
import {allPlantsQuery, plantBySlugQuery} from '../sanity/queries'
import {toUiPlant} from '../sanity/adapter'
import {plants as localPlants, type Plant} from '@/lib/plants'

export async function getPlantBySlug(slug: string): Promise<Plant | null> {
  const client = getSanityClient()
  
  // Temporary dev diagnostics - remove after confirming fix
  if (process.env.NODE_ENV === 'development') {
    console.log('[getPlantBySlug] Called with slug:', slug)
    console.log('[getPlantBySlug] Client status:', client ? 'PRESENT' : 'NULL')
  }

  if (client) {
    try {
      const sanityPlant = await client.fetch(plantBySlugQuery, {slug})
      
      // Temporary dev diagnostics
      if (process.env.NODE_ENV === 'development') {
        console.log('[getPlantBySlug] Sanity fetch result:', sanityPlant ? {
          _id: sanityPlant._id,
          slug: sanityPlant.slug,
          title: sanityPlant.title,
          hasAbout: !!sanityPlant.about,
          aboutLength: sanityPlant.about?.length || 0,
        } : 'NULL')
      }
      
      if (sanityPlant) return toUiPlant(sanityPlant)
    } catch (error) {
      // Surface fetch errors instead of swallowing them
      if (process.env.NODE_ENV === 'development') {
        console.error('[getPlantBySlug] Sanity fetch error:', error)
      }
      // Continue to fallback on error
    }
  }

  // fallback if not yet migrated or Sanity not configured
  const localPlant = localPlants.find((p) => p.slug === slug) ?? null
  
  // Temporary dev diagnostics
  if (process.env.NODE_ENV === 'development') {
    console.log('[getPlantBySlug] Using fallback:', localPlant ? 'LOCAL' : 'NOT_FOUND')
  }
  
  return localPlant
}

export async function getAllPlants(): Promise<Plant[]> {
  const client = getSanityClient()
  let sanityMapped: Plant[] = []
  
  if (client) {
    const sanityPlants = await client.fetch(allPlantsQuery).catch(() => [])
    sanityMapped = Array.isArray(sanityPlants) ? sanityPlants.map(toUiPlant) : []
  }

  // Merge strategy:
  // - prefer Sanity version if slug exists in Sanity
  // - keep local for the rest
  const sanitySlugs = new Set(sanityMapped.map(p => p.slug))
  const localsNotInSanity = localPlants.filter(p => !sanitySlugs.has(p.slug))

  return [...sanityMapped, ...localsNotInSanity]
}