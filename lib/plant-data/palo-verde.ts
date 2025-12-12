import type { Plant } from "../plant-types";

export const paloVerde: Plant = {
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
};
