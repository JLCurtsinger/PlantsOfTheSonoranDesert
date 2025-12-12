import type { Plant } from "../plant-types";

export const creosoteBush: Plant = {
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
};
