import {createImageUrlBuilder} from '@sanity/image-url'
import {getSanityClient} from './client'

// Lightweight type for Sanity image source
type SanityImageSource = any

export function urlForImage(source: SanityImageSource) {
  const client = getSanityClient()
  if (!client) {
    // Fallback: return a dummy builder if Sanity not configured
    // This should not happen in practice when Sanity is properly set up
    throw new Error('Sanity client not configured')
  }
  const builder = createImageUrlBuilder(client)
  return builder.image(source).auto('format')
}