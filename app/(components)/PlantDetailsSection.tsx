import type { Plant } from "@/lib/plants";

interface PlantDetailsSectionProps {
  plant: Plant;
}

export default function PlantDetailsSection({ plant }: PlantDetailsSectionProps) {
  const PLACEHOLDER_TEXT = "Notes coming soon as more field photos are added.";

  // Helper to render list items
  const renderList = (items: string[]) => (
    <ul className="list-disc list-inside space-y-1">
      {items.map((item, index) => (
        <li key={index} className="text-sm text-text-secondary">
          {item}
        </li>
      ))}
    </ul>
  );

  // Helper to render content (handles both string and array)
  const renderContent = (value: string | string[] | undefined, isArray: boolean) => {
    // If value is an array, render as list
    if (Array.isArray(value)) {
      const items = value.length > 0 ? value : [PLACEHOLDER_TEXT];
      return renderList(items);
    }
    // Otherwise render as text
    const text = value || PLACEHOLDER_TEXT;
    return <p className="text-sm text-text-secondary leading-relaxed">{text}</p>;
  };

  const sections = [
    {
      title: "Quick ID Checklist",
      content: renderContent(plant.quickId, true),
    },
    {
      title: "Seasonal Notes",
      content: renderContent(plant.seasonalNotes, false),
    },
    {
      title: "Uses",
      content: renderContent(plant.uses, false),
    },
    {
      title: "Ethics + Disclaimers",
      content: renderContent(plant.ethicsAndDisclaimers, false),
    },
    {
      title: "Wildlife Value",
      content: renderContent(plant.wildlifeValue, false),
    },
    {
      title: "Interesting Facts",
      content: renderContent(plant.interestingFacts, true),
    },
  ];

  return (
    <section id="plant-more-info" className="mt-10 md:mt-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, index) => (
          <article
            key={index}
            className="rounded-lg bg-card border border-border-subtle shadow-sm p-4 md:p-5"
          >
            <h3 className="text-base font-semibold text-text-primary mb-3">
              {section.title}
            </h3>
            <div>{section.content}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

