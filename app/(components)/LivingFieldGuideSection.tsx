import Image from "next/image";
import { sanityImageLoader } from "@/lib/sanity/image";
import type { Plant } from "@/lib/plants";

interface LivingFieldGuideSectionProps {
  plants: Plant[];
}

export default function LivingFieldGuideSection({ plants }: LivingFieldGuideSectionProps) {
  // Get images from the same plant data source used by PlantCard (Sanity-adapted plants)
  const saguaro = plants.find((p) => p.slug === "saguaro-cactus");
  const paloVerde = plants.find((p) => p.slug === "palo-verde");
  const pricklyPear = plants.find((p) => p.slug === "prickly-pear");
  const ocotillo = plants.find((p) => p.slug === "ocotillo");

  const cards = [
    {
      title: "Photo-first",
      description: "Every entry starts with field photography in natural habitat.",
      image: saguaro?.galleryImages?.[3] || saguaro?.mainImage,
      alt: "Close-up of saguaro ribs and spines",
    },
    {
      title: "Grounded, not academic",
      description:
        "Built from observation and trusted references over time, not lab-grade documentation.",
      image: paloVerde?.mainImage,
      alt: "Palo verde tree beginning to bloom beside a lake",
    },
    {
      title: "Evolving entries",
      description:
        "Pages begin simple and grow as better photos, seasons, and variants are captured.",
      image: pricklyPear?.mainImage,
      alt: "Budding prickly pear with new pads forming",
    },
    {
      title: "Built to scale",
      description:
        "Plant types branch into species pages as coverage expands.",
      image: ocotillo?.galleryImages?.[6] || ocotillo?.mainImage,
      alt: "Multiple wild ocotillo plants in desert landscape",
    },
  ];

  // Verify all images exist before rendering - match PlantCard's pattern
  // PlantCard checks: plant.mainImage ? (truthy check)
  const allImagesExist = cards.every((card) => card.image);

  // If images can't be reliably used, don't render the section
  if (!allImagesExist) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wide">
          FIELD NOTES
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
          A Living Field Guide
        </h2>
        <p className="text-lg text-text-secondary leading-relaxed">
          This site is photo-first and observational. Entries will expand over
          time as more seasons, habitats, and species variations are documented
          and cross-referenced.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-card border border-border-subtle rounded-lg overflow-hidden"
          >
            {/* Visual Header Area */}
            <div className="relative w-full h-28 rounded-t-lg overflow-hidden">
              {card.image ? (
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  className="object-cover"
                  loader={sanityImageLoader}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full bg-subtle" />
              )}
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-text-primary mb-2">
                {card.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {card.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Callout */}
      <div className="bg-card border border-border-subtle rounded-lg p-6">
        <p className="text-text-secondary leading-relaxed text-sm">
          Note: This guide is educational and observational. It is not a
          scientific database and should not be treated as medical or foraging
          advice. When in doubt, consult local experts and reliable references.
        </p>
      </div>
    </section>
  );
}

