import type { Plant } from "../plant-types";

export const barrelCactus: Plant = {
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
};
