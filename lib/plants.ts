import type { Plant, PlantCategory } from "./plant-types";
export type { Plant, PlantCategory } from "./plant-types";

import { saguaroCactus } from "./plant-data/saguaro-cactus";
import { pricklyPear } from "./plant-data/prickly-pear";
import { paloVerde } from "./plant-data/palo-verde";
import { ocotillo } from "./plant-data/ocotillo";
import { barrelCactus } from "./plant-data/barrel-cactus";
import { desertMarigold } from "./plant-data/desert-marigold";
import { creosoteBush } from "./plant-data/creosote-bush";
import { cholla } from "./plant-data/cholla";
import { hedgehogCactus } from "./plant-data/hedgehog-cactus";

export const plants: Plant[] = [
  saguaroCactus,
  pricklyPear,
  paloVerde,
  ocotillo,
  barrelCactus,
  desertMarigold,
  creosoteBush,
  cholla,
  hedgehogCactus,
];

export function getPlantBySlug(slug: string): Plant | undefined {
  return plants.find((plant) => plant.slug === slug);
}

export function getPlantsByCategory(category: PlantCategory): Plant[] {
  return plants.filter((plant) => plant.category === category);
}
