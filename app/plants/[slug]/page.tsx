import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { plants } from "@/lib/plants";
import ImageWithModal from "@/app/(components)/ImageWithModal";

interface PlantPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlantPage({ params }: PlantPageProps) {
  const { slug } = await params;
  const plant = plants.find((p) => p.slug === slug);

  if (!plant) {
    notFound();
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-12">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary mb-6"
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
        <ImageWithModal
          src={plant.mainImage}
          alt={plant.commonName}
          wrapperClassName="relative w-full h-[320px] sm:h-[380px] md:h-[420px] rounded-lg bg-subtle"
          allImages={[plant.mainImage, ...(plant.galleryImages ?? [])]}
          startIndex={0}
        />
      </section>

      {/* About this plant */}
      <section className="mt-10 md:mt-12">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-3">
          About this plant
        </h2>
        <p className="text-base text-text-secondary leading-relaxed">
          {plant.description}
        </p>
      </section>

      {/* Simple gallery using any galleryImages we have */}
      {plant.galleryImages && plant.galleryImages.length > 0 && (
        <section className="mt-10 md:mt-12">
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-4">
            Photo gallery
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {plant.galleryImages.map((src, index) => (
              <ImageWithModal
                key={src}
                src={src}
                alt={plant.commonName}
                wrapperClassName="relative w-full h-48 rounded-lg bg-subtle"
                allImages={[plant.mainImage, ...(plant.galleryImages ?? [])]}
                // +1 because index 0 is the main image in allImages
                startIndex={index + 1}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
