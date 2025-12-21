"use client";

import { useState, useEffect } from "react";

interface Pillar {
  id: string;
  title: string;
  summary: string;
  headline: string;
  body: string;
  adaptations: string[];
}

const pillars: Pillar[] = [
  {
    id: "heat-sun",
    title: "Heat + Sun",
    summary: "Relentless summer sun shaped plants that reflect heat, create shade, and protect tissues.",
    headline: "Built for intense light",
    body: "Summer sun is relentless and surfaces can overheat fast. Many plants evolved to manage temperature and protect tissues without wasting water.",
    adaptations: [
      "Waxy or reflective skins that reduce heat load",
      "Ribs, spines, or hairs that create shade and airflow",
      "Growth forms that minimize midday exposure",
    ],
  },
  {
    id: "water-scarcity",
    title: "Water Scarcity",
    summary: "Unpredictable rain favored plants that store water, lose less, and grow in short windows.",
    headline: "Water is the main constraint",
    body: "Rain can be rare and unpredictable. Survival often means storing water, losing less of it, and timing growth to short windows of moisture.",
    adaptations: [
      "Succulent tissues that store water",
      "Tiny leaves or leaf drop during drought",
      "Shallow, widespread roots that grab quick rain",
    ],
  },
  {
    id: "poor-soils",
    title: "Poor Soils",
    summary: "Rocky, low-organic soils rewarded slow growth, efficiency, and partnerships below ground.",
    headline: "Nutrients are earned, not given",
    body: "Desert soils can be rocky, alkaline, and low in organic matter. Plants succeed by growing slowly, partnering with microbes, and using resources efficiently.",
    adaptations: [
      "Slow growth and long lifespans",
      "Symbiosis with fungi or soil microbes",
      "Leaves and stems built to conserve nutrients",
    ],
  },
  {
    id: "seasonal-extremes",
    title: "Seasonal Extremes",
    summary: "Monsoon pulses and cooler winters pushed plants to time growth, bloom, and dormancy.",
    headline: "Two seasons, two strategies",
    body: "The Sonoran Desert swings between dry heat, monsoon pulses, and cooler winters. Many plants synchronize flowering and growth with these seasonal cues.",
    adaptations: [
      "Rapid flowering after rain events",
      "Dormancy or slowed growth in harsh periods",
      "Timing that matches monsoon and winter patterns",
    ],
  },
];

export default function EvolutionPillars() {
  const [selectedPillarId, setSelectedPillarId] = useState<string>("heat-sun");
  const [isVisible, setIsVisible] = useState(true);

  const selectedPillar = pillars.find((p) => p.id === selectedPillarId) || pillars[0];

  useEffect(() => {
    setIsVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, [selectedPillarId]);

  const handlePillarClick = (pillarId: string) => {
    setSelectedPillarId(pillarId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, pillarId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePillarClick(pillarId);
    }
  };

  return (
    <section className="py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wide">
          FIELD NOTES
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
          How the Sonoran Desert Shaped Its Plants
        </h2>
        <p className="text-lg text-text-secondary leading-relaxed">
          Extreme heat, scarce water, and seasonal swings pushed desert plants toward survival-first designs you can see up close.
        </p>
      </div>

      {/* Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {pillars.map((pillar) => {
          const isSelected = pillar.id === selectedPillarId;
          return (
            <button
              key={pillar.id}
              onClick={() => handlePillarClick(pillar.id)}
              onKeyDown={(e) => handleKeyDown(e, pillar.id)}
              aria-pressed={isSelected}
              className={`px-4 py-4 rounded-lg text-left transition-all duration-200 ease-out border-2 min-h-[84px] ${
                isSelected
                  ? "bg-subtle border-text-primary shadow-sm"
                  : "bg-card border-border-subtle hover:border-text-primary hover:bg-subtle"
              } focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2`}
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-text-primary">{pillar.title}</h3>
                <p className="text-sm text-text-secondary mt-1">{pillar.summary}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Panel */}
      <div
        key={selectedPillarId}
        aria-live="polite"
        className={`bg-card border border-border-subtle rounded-lg p-6 transition-opacity duration-200 ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <h3 className="text-2xl font-bold text-text-primary mb-3">
          {selectedPillar.headline}
        </h3>
        <p className="text-text-secondary mb-6 leading-relaxed">
          {selectedPillar.body}
        </p>
        <div>
          <p className="font-semibold text-text-primary mb-3">
            Adaptations you'll notice:
          </p>
          <ul className="space-y-2">
            {selectedPillar.adaptations.map((adaptation, index) => (
              <li key={index} className="text-text-secondary flex items-start">
                <span className="mr-2 text-text-primary">•</span>
                <span>{adaptation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

