import { getAllPlants } from "@/lib/data/getPlants";
import HomeClient from "./(components)/HomeClient";

export default async function Home() {
  const plants = await getAllPlants();
  return <HomeClient plants={plants} />;
}
