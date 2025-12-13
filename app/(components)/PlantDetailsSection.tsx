import type { Plant } from "@/lib/plants";

interface PlantDetailsSectionProps {
  plant: Plant;
}

export default function PlantDetailsSection({ plant }: PlantDetailsSectionProps) {
  // Helper to normalize string or string[] to array
  const normalizeToArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

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
  const renderContent = (value: string | string[] | undefined) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      return renderList(value);
    }
    return <p className="text-sm text-text-secondary leading-relaxed">{value}</p>;
  };

  const sections = [];

  if (plant.quickId && plant.quickId.length > 0) {
    sections.push({
      title: "Quick ID Checklist",
      content: renderList(plant.quickId),
    });
  }

  if (plant.seasonalNotes) {
    sections.push({
      title: "Seasonal Notes",
      content: renderContent(plant.seasonalNotes),
    });
  }

  if (plant.uses) {
    sections.push({
      title: "Uses",
      content: renderContent(plant.uses),
    });
  }

  if (plant.ethicsAndDisclaimers) {
    sections.push({
      title: "Ethics + Disclaimers",
      content: renderContent(plant.ethicsAndDisclaimers),
    });
  }

  if (plant.wildlifeValue) {
    sections.push({
      title: "Wildlife Value",
      content: renderContent(plant.wildlifeValue),
    });
  }

  if (plant.interestingFacts && plant.interestingFacts.length > 0) {
    sections.push({
      title: "Interesting Facts",
      content: renderList(plant.interestingFacts.slice(0, 2)),
    });
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 md:mt-12">
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

