import {getSanityClient} from '../sanity/client'
import {allPlantsQuery, plantBySlugQuery} from '../sanity/queries'
import {toUiPlant} from '../sanity/adapter'
import {plants as localPlants, type Plant} from '@/lib/plants'

export async function getPlantBySlug(slug: string): Promise<Plant | null> {
  const client = getSanityClient()
  if (client) {
    const sanityPlant = await client.fetch(plantBySlugQuery, {slug}).catch(() => null)
    if (sanityPlant) return toUiPlant(sanityPlant)
  }

  // fallback if not yet migrated or Sanity not configured
  return localPlants.find((p) => p.slug === slug) ?? null
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