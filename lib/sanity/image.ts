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

/**
 * Custom loader for Next.js Image component that updates Sanity CDN URLs
 * with the requested width. This enables responsive image loading.
 * 
 * Sanity CDN URLs use the `w` query parameter to control the actual served width,
 * regardless of dimensions in the filename.
 * 
 * @param src - The source URL (either a Sanity CDN URL or any other URL)
 * @param width - The requested image width
 * @returns The URL with the requested width parameter
 */
export function sanityImageLoader({ src, width }: { src: string; width: number }): string {
  // Only process Sanity CDN URLs
  if (!src.includes('cdn.sanity.io')) {
    return src
  }

  try {
    const url = new URL(src)
    
    // Update the width parameter (this is what Sanity actually uses to serve the image)
    url.searchParams.set('w', width.toString())
    
    // Ensure auto=format is set for format optimization (WebP/AVIF)
    url.searchParams.set('auto', 'format')
    
    // Set quality to 80 for better performance (balance between size and quality)
    url.searchParams.set('q', '80')

    return url.toString()
  } catch (error) {
    // If URL parsing fails, return original URL
    return src
  }
}