import {createClient, type SanityClient} from '@sanity/client'

let sanityClient: SanityClient | null = null

function getSanityClient(): SanityClient | null {
  if (sanityClient) return sanityClient
  
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'

  if (!projectId || !dataset) {
    return null
  }

  sanityClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
  })
  
  return sanityClient
}

export { getSanityClient }