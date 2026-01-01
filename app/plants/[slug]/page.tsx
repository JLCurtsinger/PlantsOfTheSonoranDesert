import React from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPlantBySlug, getAllPlants } from "@/lib/data/getPlants";
import ImageWithModal from "@/app/(components)/ImageWithModal";
import PlantDetailsSection from "@/app/(components)/PlantDetailsSection";
import PlantPrevNextNav from "@/app/(components)/PlantPrevNextNav";
import PlantSwipeNav from "@/app/(components)/PlantSwipeNav";

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic'

/**
 * Parses markdown-style links [text](url) in description text and renders them as JSX links.
 * Links open in a new tab.
 */
function parseDescriptionWithLinks(text: string): React.ReactNode {
  if (!text) return text;
  
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = linkPattern.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the link
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-primary hover:underline underline-offset-2"
      >
        {match[1]}
      </a>
    );
    
    lastIndex = linkPattern.lastIndex;
  }
  
  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? <>{parts}</> : text;
}

interface PlantPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlantPage({ params }: PlantPageProps) {
  const { slug } = await params;
  const plant = await getPlantBySlug(slug);

  if (!plant) {
    notFound();
  }

  // Compute prev/next slugs for navigation
  const allPlants = await getAllPlants();
  const currentIndex = allPlants.findIndex((p) => p.slug === slug);
  const prevSlug = currentIndex > 0 ? allPlants[currentIndex - 1].slug : null;
  const nextSlug =
    currentIndex < allPlants.length - 1 ? allPlants[currentIndex + 1].slug : null;

  const allImages: string[] = [
    plant.mainImage,
    ...(plant.galleryImages ?? []).filter((img) => img && img !== plant.mainImage),
  ].filter(Boolean) as string[];

  // Use first gallery image as hero if mainImage is missing
  const heroImage = plant.mainImage || (plant.galleryImages && plant.galleryImages.length > 0 ? plant.galleryImages[0] : '');

  const galleryDetails =
    plant.galleryDetails ??
    (plant.galleryImages ?? []).map((src, index) => ({
      src,
      alt: `${plant.commonName} photo ${index + 1}`,
      title: undefined,
      description: undefined,
    }));

  return (
    <>
      <PlantPrevNextNav currentSlug={slug} prevSlug={prevSlug} nextSlug={nextSlug} />
      <PlantSwipeNav prevSlug={prevSlug} nextSlug={nextSlug} />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-12 scroll-smooth">
        <Link
        href="/"
        className="inline-flex items-center text-sm text-text-secondary transition-colors duration-150 ease-out hover:underline hover:underline-offset-2 mb-6"
      >
        ← Back to all plants
      </Link>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start">
        {/* Left column: text */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-3">
            {plant.category.charAt(0).toUpperCase() + plant.category.slice(1)}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4">
            {plant.commonName}
          </h1>
          <p className="text-lg italic text-text-secondary mb-6">
            {plant.scientificName}
          </p>

          {plant.quickFacts && plant.quickFacts.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plant.quickFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                    {fact.label}
                  </dt>
                  <dd className="text-sm text-text-primary">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Right column: main image with modal */}
        {heroImage && (
          <ImageWithModal
            src={heroImage}
            alt={plant.commonName}
            wrapperClassName="relative w-full h-[320px] sm:h-[380px] md:h-[420px] rounded-lg bg-subtle"
            allImages={allImages}
            startIndex={0}
            thumbnailSizes="(max-width: 768px) 100vw, 50vw"
            priority={true}
          />
        )}
      </section>

      {/* About this plant */}
      <section className="mt-10 md:mt-12">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-3">
          About this plant
        </h2>
        <p className="text-base text-text-secondary leading-relaxed">
          {parseDescriptionWithLinks(plant.description)}
        </p>
        <a
          href="#plant-more-info"
          className="inline-block font-semibold hover:underline underline-offset-4 mt-4 mb-6"
        >
          More info
        </a>
      </section>

      {/* Photo gallery with cards */}
      {galleryDetails.length > 0 && (
        <section className="mt-10 md:mt-12">
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-4">
            Photo gallery
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryDetails.map((item, index) => {
              const imageIndex = allImages.findIndex(img => img === item.src);
              return (
              <article
                key={(item as any)._key ?? (item as any).key ?? `${item.src}-${index}`}
                className="flex flex-col rounded-lg bg-card border border-border-subtle shadow-sm overflow-hidden"
              >
                <div className="relative w-full h-48 sm:h-56 md:h-64">
                  <ImageWithModal
                    src={item.src}
                    alt={item.alt || `${plant.commonName} photo ${index + 1}`}
                    wrapperClassName="relative w-full h-full overflow-hidden"
                    allImages={allImages}
                    startIndex={imageIndex >= 0 ? imageIndex : 0}
                    thumbnailSizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {(item.title?.trim() || item.description?.trim()) && (
                  <div className="px-3 py-3 flex flex-col gap-1">
                    {item.title?.trim() && (
                      <h3 className="text-sm font-semibold text-text-primary">
                        {item.title}
                      </h3>
                    )}
                    {item.description?.trim() && (
                      <p className="text-xs text-text-secondary leading-snug">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}
              </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Plant Details Section */}
      <PlantDetailsSection plant={plant} />
      </main>
    </>
  );
}
