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
        <section className="pt-12 pb-12 md:pt-4 md:pb-16">
          <div className="flex flex-col md:grid md:grid-cols-2 md:items-start gap-8 md:gap-12">
            <div className="flex flex-col gap-6 md:[grid-column:1] md:[grid-row:1]">
              <p className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wide">
                Field Guide
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-6 leading-tight text-center md:text-left">
                <span className="inline md:block">Plants</span>{" "}
                <span className="inline md:block">of the</span>{" "}
                <span className="inline md:block">Sonoran Desert</span>
              </h1>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Discover the remarkable flora of one of North America's most diverse
                desert ecosystems. Explore cacti, shrubs, trees, and wildflowers that
                have adapted to thrive in this arid landscape.
              </p>
              <button
                onClick={scrollToPlants}
                className="w-fit bg-button-bg text-button-text px-6 py-3 rounded-full font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md"
              >
                Browse all plants
              </button>
              
              {/* Search + Categories */}
              <div className="mt-8 md:mt-4">
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
                      className="px-6 py-3 bg-button-bg text-button-text rounded-full font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md"
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
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-out ${
                        selectedCategory === category.value
                          ? "bg-button-bg text-button-text hover:-translate-y-0.5 hover:shadow-md"
                          : "bg-card text-text-secondary border border-border-subtle hover:bg-subtle hover:border-text-primary hover:-translate-y-0.5"
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative w-full h-[350px] md:h-[450px] rounded-lg overflow-hidden md:[grid-row:1/span-4] md:[grid-column:2]">
              <Image
                // src="/images/hero-desert.jpg"
                src="/images/hero.webp"
                alt="Sonoran Desert landscape"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
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
