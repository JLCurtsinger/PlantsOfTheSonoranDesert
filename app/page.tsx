"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { plants, PlantCategory } from "@/lib/plants";
import PlantCard from "./(components)/PlantCard";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | "all">("all");
  const gridRef = useRef<HTMLDivElement | null>(null);

  const filteredPlants = useMemo(() => {
    let filtered = plants;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((plant) => plant.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (plant) =>
          plant.commonName.toLowerCase().includes(query) ||
          plant.scientificName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const scrollToPlants = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const categories: { label: string; value: PlantCategory | "all" }[] = [
    { label: "All", value: "all" },
    { label: "Cacti", value: "cactus" },
    { label: "Shrubs", value: "shrub" },
    { label: "Trees", value: "tree" },
    { label: "Wildflowers", value: "wildflower" },
  ];

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Section 1: Hero */}
        <section className="py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left Column */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wide">
                Field Guide
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
                Plants of the Sonoran Desert
              </h1>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Discover the remarkable flora of one of North America's most diverse
                desert ecosystems. Explore cacti, shrubs, trees, and wildflowers that
                have adapted to thrive in this arid landscape.
              </p>
              <button
                onClick={scrollToPlants}
                className="bg-button-bg text-button-text px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Browse all plants
              </button>
            </div>
            {/* Right Column */}
            <div className="relative w-full h-[350px] md:h-[450px] rounded-lg overflow-hidden">
              <Image
                src="/images/hero-desert.jpg"
                alt="Sonoran Desert landscape"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </section>

        {/* Section 2: Search + Categories */}
        <section className="mt-8 md:mt-10">
          <div className="mb-8">
            <div className="max-w-2xl mx-auto flex gap-2">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 border border-border-subtle rounded-md bg-card text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-primary"
              />
              <button
                onClick={() => setSearchQuery("")}
                className="px-6 py-3 bg-button-bg text-button-text rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Search
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.value
                    ? "bg-button-bg text-button-text"
                    : "bg-card text-text-secondary hover:bg-subtle border border-border-subtle"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        {/* Section 3: Plant Grid */}
        <section className="py-12 pb-24" ref={gridRef}>
          {filteredPlants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlants.map((plant) => (
                <PlantCard key={plant.slug} plant={plant} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-text-secondary text-lg">
                No plants found matching your search.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
