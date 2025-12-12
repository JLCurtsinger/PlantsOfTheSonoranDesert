import type { Plant } from "../plant-types";

export const desertMarigold: Plant = {
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
};
