import type { Plant } from "../plant-types";

export const saguaroCactus: Plant = {
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
        "A small saguaro growing in the partial shade of another plant, which helps protect it from extreme sun and temperature swings. Based on size, the small saguaro in the photo is likely around 10-20 years old!",
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
};
