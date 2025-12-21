import Link from "next/link";
import { getAllPlants } from "@/lib/data/getPlants";

interface PlantPrevNextNavProps {
  currentSlug: string;
  prevSlug?: string | null;
  nextSlug?: string | null;
}

export default async function PlantPrevNextNav({
  currentSlug,
  prevSlug,
  nextSlug,
}: PlantPrevNextNavProps) {
  // Compute prev/next if not provided (backward compatibility)
  let prevPlant: { slug: string } | null = null;
  let nextPlant: { slug: string } | null = null;

  if (prevSlug !== undefined && nextSlug !== undefined) {
    // Use provided slugs
    prevPlant = prevSlug ? { slug: prevSlug } : null;
    nextPlant = nextSlug ? { slug: nextSlug } : null;
  } else {
    // Compute from all plants (original behavior)
    const allPlants = await getAllPlants();
    const currentIndex = allPlants.findIndex((plant) => plant.slug === currentSlug);

    if (currentIndex === -1) {
      return null;
    }

    prevPlant = currentIndex > 0 ? allPlants[currentIndex - 1] : null;
    nextPlant = currentIndex < allPlants.length - 1 ? allPlants[currentIndex + 1] : null;
  }

  return (
    <>
      {prevPlant && (
        <Link
          href={`/plants/${prevPlant.slug}`}
          className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-50 bg-card border border-border-subtle rounded-full p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-md hover:border-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          aria-label="Previous plant"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-text-primary"
            aria-hidden="true"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
      {nextPlant && (
        <Link
          href={`/plants/${nextPlant.slug}`}
          className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-card border border-border-subtle rounded-full p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-md hover:border-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          aria-label="Next plant"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-text-primary"
            aria-hidden="true"
          >
            <path
              d="M7.5 15L12.5 10L7.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
    </>
  );
}

