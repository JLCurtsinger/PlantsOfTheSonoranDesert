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
