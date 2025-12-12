import type { Plant } from "../plant-types";

export const ocotillo: Plant = {
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
};
