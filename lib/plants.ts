export type PlantCategory = "cactus" | "shrub" | "tree" | "wildflower" | "other";

export interface Plant {
  slug: string;
  commonName: string;
  scientificName: string;
  category: PlantCategory;
  description: string;
  quickFacts: { label: string; value: string }[];
  mainImage: string;
  galleryImages?: string[];
  galleryDetails?: {
    src: string;
    alt: string;
    title?: string;
    description?: string;
  }[];
  detailSections?: { src: string; alt: string; title: string; description: string }[];
}

export const plants: Plant[] = [
  {
    slug: "saguaro-cactus",
    commonName: "Saguaro Cactus",
    scientificName: "Carnegiea gigantea",
    category: "cactus",
    description:
      "The saguaro is a large, tree-like columnar cactus that can grow to be over 40 feet tall. It is native to the Sonoran Desert and is an iconic symbol of the American Southwest. The saguaro can live for over 150 years and typically begins to branch (grow arms) when it is 50-75 years old.",
    quickFacts: [
      { label: "Height", value: "Up to 40-60 feet" },
      { label: "Bloom Season", value: "May-June" },
      { label: "Lifespan", value: "150-200 years" },
    ],
    mainImage: "/images/saguaro/youngSaguaro.webp",
    galleryImages: [
      "/images/saguaro/adultSaguaro.webp",
      "/images/saguaro/babySaguaro.webp",
      "/images/saguaro/saguaroBloom.webp",
      "/images/saguaro/saguaroCloseUp.webp",
      "/images/saguaro/saguaroHoles.webp",
    ],
    galleryDetails: [
      {
        src: "/images/saguaro/youngSaguaro.webp",
        alt: "Young saguaro cactus in front of the Tucson mountains",
        title: "Young saguaro in the foothills",
        description:
          "A young saguaro growing among desert shrubs with the Tucson mountains in the distance. Notice the smooth, unbranched column shape.",
      },
      {
        src: "/images/saguaro/adultSaguaro.webp",
        alt: "Mature saguaro cactus in the Sonoran Desert",
        title: "Mature saguaro",
        description:
          "An adult saguaro with arms beginning to form. Saguaros typically start to branch when they are 50–75 years old.",
      },
      {
        src: "/images/saguaro/babySaguaro.webp",
        alt: "Small saguaro cactus growing under a nurse plant",
        title: "Seedling under a nurse plant",
        description:
          "A small saguaro growing in the partial shade of another plant, which helps protect it from extreme sun and temperature swings.",
      },
      {
        src: "/images/saguaro/saguaroBloom.webp",
        alt: "Close-up of a blooming saguaro flower",
        title: "Saguaro flower",
        description:
          "The saguaro's white, waxy flowers bloom at the top of the stems in late spring. They provide nectar for bats, birds, and insects.",
      },
      {
        src: "/images/saguaro/saguaroCloseUp.webp",
        alt: "Close-up of saguaro ribs and spines",
        title: "Ribs and spines detail",
        description:
          "A close look at the accordion-like ribs and sharp spines that help the saguaro store water and discourage animals from eating it.",
      },
      {
        src: "/images/saguaro/saguaroHoles.webp",
        alt: "Saguaro cactus with woodpecker nest holes",
        title: "Bird nesting cavities",
        description:
          "Woodpeckers and other birds carve nesting holes into saguaros. Over time, these heal into hardened structures called saguaro boots.",
      },
    ],
    detailSections: [
      {
        src: "/images/saguaro/youngSaguaro.webp",
        alt: "Young saguaro with developing arms",
        title: "Young Saguaro",
        description: "A young saguaro cactus with developing arms, showing the early stages of growth. These cacti typically begin branching when they are 50-75 years old.",
      },
      {
        src: "/images/saguaro/adultSaguaro.webp",
        alt: "Mature adult saguaro cactus",
        title: "Mature Adult Saguaro",
        description: "A fully mature saguaro cactus, reaching impressive heights of 40-60 feet. These iconic cacti can live for over 150 years and are a defining feature of the Sonoran Desert landscape.",
      },
      {
        src: "/images/saguaro/babySaguaro.webp",
        alt: "Baby saguaro seedling",
        title: "Baby Saguaro",
        description: "A young saguaro seedling, just beginning its long journey. These small cacti grow very slowly, protected by nurse plants that provide shade and shelter in their early years.",
      },
      {
        src: "/images/saguaro/saguaroBloom.webp",
        alt: "Saguaro cactus in bloom",
        title: "Saguaro Bloom",
        description: "The beautiful white flowers of the saguaro cactus bloom in May and June. These flowers open at night and are pollinated by bats, moths, and birds, producing edible red fruit.",
      },
      {
        src: "/images/saguaro/saguaroCloseUp.webp",
        alt: "Close-up of saguaro skin and spines",
        title: "Saguaro Skin Detail",
        description: "A close-up view of the saguaro's distinctive ribbed structure and protective spines. The pleated skin allows the cactus to expand and store water during rare desert rains.",
      },
      {
        src: "/images/saguaro/saguaroHoles.webp",
        alt: "Saguaro with woodpecker holes",
        title: "Woodpecker Holes",
        description: "Holes created by Gila woodpeckers and other birds that nest in saguaros. These cavities provide shelter for many desert animals, including owls, bats, and other birds.",
      },
    ],
  },
  {
    slug: "prickly-pear",
    commonName: "Prickly Pear",
    scientificName: "Opuntia spp.",
    category: "cactus",
    description:
      "Prickly pears are low-growing cacti with flat, paddle-shaped pads. They are common throughout the Sonoran Desert and provide food and shelter for wildlife. Many species produce edible fruits known as tunas and tender young pads called nopales.",
    quickFacts: [
      { label: "Height", value: "1–6 feet" },
      { label: "Bloom Season", value: "Spring–early summer" },
      { label: "Lifespan", value: "25–40+ years" },
    ],
    mainImage: "/images/prickly-pear/budding-prickly-pear.webp",
    galleryImages: [
      "/images/prickly-pear/budding-prickly-pear.webp",
      "/images/prickly-pear/Mature-prickly-pear.webp",
      "/images/prickly-pear/wild-prickly-pear.webp",
      "/images/prickly-pear/prickly-pear-fruits.webp",
      "/images/prickly-pear/prickly-pear-sprouts.webp",
      "/images/prickly-pear/lakeside-prickly-pear.webp",
      "/images/prickly-pear/prickly-pear-at-dawn.webp",
      "/images/prickly-pear/prickly-pear-growing-on-tree.webp",
    ],
    detailSections: [
      {
        src: "/images/prickly-pear/budding-prickly-pear.webp",
        alt: "Young prickly pear pads with new buds",
        title: "Budding prickly pear pads",
        description:
          "New pads and flower buds emerging along the edges of a prickly pear pad. Young growth is often softer in color before the spines fully harden.",
      },
      {
        src: "/images/prickly-pear/Mature-prickly-pear.webp",
        alt: "Mature prickly pear cactus clump",
        title: "Mature prickly pear clump",
        description:
          "A mature prickly pear forming a dense clump of pads. Older plants can spread into wide patches that provide shade and habitat for small animals.",
      },
      {
        src: "/images/prickly-pear/wild-prickly-pear.webp",
        alt: "Wild prickly pear patch in desert scrub",
        title: "Wild desert patch",
        description:
          "Prickly pear growing among native desert shrubs in undisturbed habitat. These colonies help stabilize soil and offer food for desert wildlife.",
      },
      {
        src: "/images/prickly-pear/prickly-pear-fruits.webp",
        alt: "Close-up of prickly pear fruits",
        title: "Prickly pear fruits (tunas)",
        description:
          "Ripe tunas developing along the top edges of the pads. The fruits range from green to deep magenta and are an important seasonal food for birds, mammals, and people.",
      },
      {
        src: "/images/prickly-pear/prickly-pear-sprouts.webp",
        alt: "Small prickly pear sprouts emerging from the ground",
        title: "New sprouts",
        description:
          "Small sprouts and juvenile pads emerging near the base of older plants. Many new prickly pears sprout from fallen pads that have taken root.",
      },
      {
        src: "/images/prickly-pear/lakeside-prickly-pear.webp",
        alt: "Prickly pear growing near a lakeside shoreline",
        title: "Lakeside prickly pear",
        description:
          "Prickly pear growing along a shoreline, showing how this desert cactus can thrive in rocky, well-drained soils near water features.",
      },
      {
        src: "/images/prickly-pear/prickly-pear-at-dawn.webp",
        alt: "Prickly pear cactus in warm dawn light",
        title: "Prickly pear at dawn",
        description:
          "Pads catching the warm light of early morning. Cooler dawn and dusk hours are when many desert animals visit prickly pear patches.",
      },
      {
        src: "/images/prickly-pear/prickly-pear-growing-on-tree.webp",
        alt: "Prickly pear growing against or within a tree",
        title: "Prickly pear and tree trunk",
        description:
          "Prickly pear growing alongside a tree trunk, using the shade and structure of the tree to help protect its pads from the harshest sun and wind.",
      },
    ],
  },
  {
    slug: "palo-verde",
    commonName: "Blue Palo Verde",
    scientificName: "Parkinsonia florida",
    category: "tree",
    description:
      "The blue palo verde is a small to medium-sized tree with smooth, blue-green bark that photosynthesizes. It produces bright yellow flowers in spring and has small, compound leaves that drop during drought periods. The tree is drought-deciduous, meaning it can drop its leaves to conserve water.",
    quickFacts: [
      { label: "Height", value: "15-30 feet" },
      { label: "Bloom Season", value: "March-April" },
      { label: "Water Needs", value: "Very low" },
    ],
    mainImage: "/images/palo-verde.jpg",
    galleryImages: [
      "/images/palo-verde-1.jpg",
    ],
  },
  {
    slug: "ocotillo",
    commonName: "Ocotillo",
    scientificName: "Fouquieria splendens",
    category: "shrub",
    description:
      "The ocotillo is a unique desert shrub with long, spiny, wand-like stems that can reach up to 20 feet tall. After rainfall, it quickly produces small green leaves along the stems, which it sheds during dry periods. In spring, it produces clusters of bright red tubular flowers at the tips of its stems.",
    quickFacts: [
      { label: "Height", value: "10-20 feet" },
      { label: "Bloom Season", value: "March-June" },
      { label: "Growth Pattern", value: "Deciduous" },
    ],
    mainImage: "/images/ocotillo.jpg",
    galleryImages: [
      "/images/ocotillo-1.jpg",
    ],
  },
  {
    slug: "barrel-cactus",
    commonName: "Golden Barrel Cactus",
    scientificName: "Echinocactus grusonii",
    category: "cactus",
    description:
      "The golden barrel cactus is a large, spherical cactus with prominent ribs covered in golden-yellow spines. It grows slowly and can reach up to 3 feet in diameter. Native to central Mexico but commonly found in desert gardens, it produces yellow flowers in summer.",
    quickFacts: [
      { label: "Diameter", value: "Up to 3 feet" },
      { label: "Bloom Season", value: "Summer" },
      { label: "Growth Rate", value: "Very slow" },
    ],
    mainImage: "/images/barrel-cactus.jpg",
    galleryImages: [
      "/images/barrel-cactus-1.jpg",
    ],
  },
  {
    slug: "desert-marigold",
    commonName: "Desert Marigold",
    scientificName: "Baileya multiradiata",
    category: "wildflower",
    description:
      "The desert marigold is a low-growing perennial wildflower with silvery-gray foliage and bright yellow, daisy-like flowers. It blooms profusely in spring and can continue flowering after summer rains. The plant is drought-tolerant and thrives in well-drained soils.",
    quickFacts: [
      { label: "Height", value: "6-18 inches" },
      { label: "Bloom Season", value: "Spring-Fall" },
      { label: "Water Needs", value: "Low" },
    ],
    mainImage: "/images/desert-marigold.jpg",
    galleryImages: [
      "/images/desert-marigold-1.jpg",
    ],
  },
  {
    slug: "creosote-bush",
    commonName: "Creosote Bush",
    scientificName: "Larrea tridentata",
    category: "shrub",
    description:
      "The creosote bush is one of the most common and widespread desert shrubs. It has small, waxy, dark green leaves and produces small yellow flowers. The plant has a distinctive resinous smell, especially after rain. It is extremely drought-tolerant and can live for thousands of years through clonal reproduction.",
    quickFacts: [
      { label: "Height", value: "3-10 feet" },
      { label: "Bloom Season", value: "Year-round" },
      { label: "Lifespan", value: "Can live thousands of years" },
    ],
    mainImage: "/images/creosote-bush.jpg",
    galleryImages: [
      "/images/creosote-bush-1.jpg",
    ],
  },
];

export function getPlantBySlug(slug: string): Plant | undefined {
  return plants.find((plant) => plant.slug === slug);
}

export function getPlantsByCategory(category: PlantCategory): Plant[] {
  return plants.filter((plant) => plant.category === category);
}

