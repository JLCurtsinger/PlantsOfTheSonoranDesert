interface SubregionCard {
  title: string;
  elevation: string;
  description: string;
  commonlySeen: string[];
}

const subregions: SubregionCard[] = [
  {
    title: "Lower Sonoran (Low Desert)",
    elevation: "~0–2,000 ft",
    description:
      "Hotter, drier lowlands where classic Sonoran landscapes dominate. This zone rewards water storage, heat management, and efficient survival strategies.",
    commonlySeen: [
      "Saguaro",
      "Palo Verde",
      "Creosote Bush",
      "Prickly Pear",
      "Brittlebush",
    ],
  },
  {
    title: "Arizona Upland Sonoran",
    elevation: "~2,000–4,000 ft",
    description:
      "Slightly cooler nights and more varied terrain create a richer mix of shrubs, cacti, and small trees. Many plants here respond quickly to seasonal rainfall pulses.",
    commonlySeen: ["Ocotillo", "Cholla", "Mesquite", "Barrel Cactus", "Agave"],
  },
  {
    title: "Desert Grassland Transition",
    elevation: "~3,500–5,000 ft (edge zones)",
    description:
      "At higher elevations near the Sonoran boundary, grasses begin to mix with desert shrubs. Seasonal swings are stronger here, and blooms can change dramatically after rain.",
    commonlySeen: ["Agave", "Yucca", "Cholla", "Wildflowers", "Grasses"],
  },
  {
    title: "Rocky Slopes & Volcanic Hills",
    elevation: "Varies (often 1,500–4,500 ft)",
    description:
      "Thin soils, exposed rock, and fast drainage create harsh growing conditions. Plants here tend to be tough, slow-growing, and highly specialized.",
    commonlySeen: [
      "Barrel Cactus",
      "Hedgehog Cactus",
      "Agave",
      "Ocotillo",
      "Cholla",
    ],
  },
];

export default function BiodiversitySection() {
  return (
    <section className="py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wide">
          FIELD NOTES
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
          One of the Most Biodiverse Deserts on Earth
        </h2>
        <p className="text-lg text-text-secondary leading-relaxed">
          The Sonoran Desert is not a single uniform landscape. Its diversity
          comes from dramatic elevation changes, seasonal rainfall patterns, and
          a mosaic of habitats that support a wide range of plant life across
          Arizona and beyond.
        </p>
      </div>

      {/* Subregion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
        {subregions.map((subregion, index) => (
          <div
            key={index}
            className="bg-card border border-border-subtle rounded-lg p-6"
          >
            <h3 className="font-semibold text-text-primary mb-2">
              {subregion.title}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Elevation: {subregion.elevation}
            </p>
            <p className="text-text-secondary mb-4 leading-relaxed">
              {subregion.description}
            </p>
            <div>
              <p className="font-semibold text-text-primary mb-2 text-sm">
                Commonly seen:
              </p>
              <p className="text-sm text-text-secondary">
                {subregion.commonlySeen.join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Field Note Callout */}
      <div className="bg-card border border-border-subtle rounded-lg p-6">
        <p className="text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">Field Note:</span>{" "}
          All photographs on this site were taken by the author across Arizona
          within the Sonoran Desert region, spanning multiple elevations and
          landscapes. Each image reflects plants growing in natural habitat
          rather than cultivated settings.
        </p>
      </div>
    </section>
  );
}

