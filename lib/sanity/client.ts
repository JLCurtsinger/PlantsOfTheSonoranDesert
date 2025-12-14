import {createClient, type SanityClient} from '@sanity/client'

let sanityClient: SanityClient | null = null

function getSanityClient(): SanityClient | null {
  if (sanityClient) return sanityClient
  
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'

  // Temporary dev diagnostics - remove after confirming fix
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sanity Client] Config check:', {
      hasProjectId: !!projectId,
      hasDataset: !!dataset,
      apiVersion,
      projectId: projectId || 'MISSING',
      dataset: dataset || 'MISSING',
    })
  }

  if (!projectId || !dataset) {
    return null
  }

  sanityClient = createClient({
    projectId,
    dataset,
    apiVersion,
    // Disable CDN in development to ensure fresh data during debugging
    // CDN can cache responses and delay seeing published changes
    useCdn: process.env.NODE_ENV === 'production',
  })
  
  return sanityClient
}

export { getSanityClient }