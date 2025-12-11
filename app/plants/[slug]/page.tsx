import { notFound } from "next/navigation";
import Image from "next/image";
import { getPlantBySlug, getPlantsByCategory, plants } from "@/lib/plants";
import PlantCard from "../../(components)/PlantCard";
import ImageModal from "../../(components)/ImageModal";

export async function generateStaticParams() {
  return plants.map((plant) => ({
    slug: plant.slug,
  }));
}

export default function PlantDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const plant = getPlantBySlug(params.slug);

  if (!plant) {
    notFound();
  }

  const relatedPlants = getPlantsByCategory(plant.category).filter(
    (p) => p.slug !== plant.slug
  ).slice(0, 3);

  const categoryLabels: Record<string, string> = {
    cactus: "Cacti",
    shrub: "Shrubs",
    tree: "Trees",
    wildflower: "Wildflowers",
    other: "Other",
  };

  return (
    <main className="min-h-screen py-12 bg-page">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Column A: Main Image */}
          <div className="relative w-full h-[500px] lg:h-[600px]">
            <ImageModal src={plant.mainImage} alt={plant.commonName}>
              <div className="relative w-full h-full cursor-pointer rounded-lg overflow-hidden">
                <Image
                  src={plant.mainImage}
                  alt={plant.commonName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </ImageModal>
          </div>

          {/* Column B: Plant Info */}
          <div>
            <div className="mb-4">
              <span className="px-3 py-1 text-sm font-medium rounded bg-subtle text-text-secondary capitalize inline-block mb-4">
                {categoryLabels[plant.category] || plant.category}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {plant.commonName}
            </h1>
            <p className="text-xl italic text-text-secondary mb-8">
              {plant.scientificName}
            </p>

            {/* Quick Facts */}
            <div className="mb-8 space-y-3">
              {plant.quickFacts.map((fact, index) => (
                <div key={index} className="flex gap-4">
                  <span className="font-medium text-text-primary min-w-[120px]">
                    {fact.label}:
                  </span>
                  <span className="text-text-secondary">{fact.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* About Section */}
        <section className="mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-text-primary">
            About this plant
          </h2>
          <div className="prose max-w-none">
            <p className="text-base leading-relaxed text-text-primary">
              {plant.description}
            </p>
          </div>
        </section>

        {/* Photo Gallery */}
        {plant.galleryImages && plant.galleryImages.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-text-primary">
              Photo gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {plant.galleryImages.map((image, index) => (
                <ImageModal
                  key={index}
                  src={image}
                  alt={`${plant.commonName} - Image ${index + 1}`}
                >
                  <div className="relative w-full h-48 cursor-pointer rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
                    <Image
                      src={image}
                      alt={`${plant.commonName} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                </ImageModal>
              ))}
            </div>
          </section>
        )}

        {/* Related Plants */}
        {relatedPlants.length > 0 && (
          <section>
            <h2 className="text-3xl md:text-4xl font-semibold mb-8 text-text-primary">
              Related plants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPlants.map((relatedPlant) => (
                <PlantCard key={relatedPlant.slug} plant={relatedPlant} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
