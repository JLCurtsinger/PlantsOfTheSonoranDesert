import { notFound } from "next/navigation";
import Image from "next/image";
import { getPlantBySlug, getPlantsByCategory, plants } from "@/lib/plants";
import PlantCard from "../../(components)/PlantCard";
import ImageViewerModal from "../../(components)/ImageViewerModal";

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
        {/* Two-column layout above the fold */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          {/* Left Column: Plant Info */}
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

          {/* Right Column: Main Image */}
          <div className="relative w-full h-[500px] md:h-[600px]">
            <ImageViewerModal src={plant.mainImage} alt={plant.commonName}>
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                <Image
                  src={plant.mainImage}
                  alt={plant.commonName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            </ImageViewerModal>
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

        {/* Photo Details Section */}
        {plant.detailSections && plant.detailSections.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold mb-8 text-text-primary">
              Photo details
            </h2>
            <div className="space-y-8">
              {plant.detailSections.map((section, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] gap-6 bg-card rounded-lg p-6"
                >
                  {/* Image */}
                  <div className="relative w-full h-64 md:h-full min-h-[250px]">
                    <ImageViewerModal src={section.src} alt={section.alt}>
                      <div className="relative w-full h-full rounded-lg overflow-hidden">
                        <Image
                          src={section.src}
                          alt={section.alt}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 40vw"
                        />
                      </div>
                    </ImageViewerModal>
                  </div>

                  {/* Text Content */}
                  <div className="flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold text-text-primary mb-3">
                      {section.title}
                    </h3>
                    <p className="text-base leading-relaxed text-text-secondary">
                      {section.description}
                    </p>
                  </div>
                </div>
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
