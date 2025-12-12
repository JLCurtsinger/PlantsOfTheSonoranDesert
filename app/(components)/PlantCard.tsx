import Link from "next/link";
import Image from "next/image";
import { Plant } from "@/lib/plants";

interface PlantCardProps {
  plant: Plant;
}

export default function PlantCard({ plant }: PlantCardProps) {
  const categoryLabels: Record<string, string> = {
    cactus: "Cacti",
    shrub: "Shrubs",
    tree: "Trees",
    wildflower: "Wildflowers",
    other: "Other",
  };

  return (
    <Link href={`/plants/${plant.slug}`}>
      <div className="bg-card rounded-lg overflow-hidden shadow-sm border border-border-subtle transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-md hover:border-white">
        <div className="relative w-full h-64">
          <Image
            src={plant.mainImage}
            alt={plant.commonName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-text-primary">
              {plant.commonName}
            </h3>
            <span className="px-2 py-1 text-xs font-medium rounded bg-subtle text-text-secondary shrink-0 capitalize">
              {categoryLabels[plant.category] || plant.category}
            </span>
          </div>
          <p className="text-sm italic text-text-secondary">
            {plant.scientificName}
          </p>
        </div>
      </div>
    </Link>
  );
}
