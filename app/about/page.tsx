import Image from "next/image";

// Inline Card components matching shadcn API but using existing Tailwind styles
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-lg border border-border-subtle shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pb-4 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl md:text-2xl font-semibold text-text-primary ${className}`}>{children}</h2>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export default function AboutPage() {
  return (
    <main>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Section A: Top header */}
        <section className="mb-12 md:mb-16">
          <p className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wide">
            About
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 leading-tight">
            Why this site exists
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            A personal project to document, share, and protect the plants of the Sonoran Desert.
          </p>
        </section>

        {/* Section B: Hero area with text + portrait image */}
        <section className="mb-12 md:mb-16">
          <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            {/* Left Card: How this all started */}
            <Card>
              <CardHeader>
                <CardTitle>How this all started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-base text-text-secondary leading-relaxed">
                  <p>
                    When I moved out to Arizona, the first thing that grabbed my attention was the plants. Every drive and every walk, there was something unfamiliar along the roadside or tucked into a hillside.
                  </p>
                  <p>
                    That curiosity led me into a class called Ecology of the Sonoran Desert, which focused on the flora and fauna that make this region what it is. I enjoyed the course, but I found myself especially drawn to the plants. The shapes, textures, and survival strategies were unlike anything I had grown up around.
                  </p>
                  <p>
                    At the same time, I was growing as a web developer and designer. This site is my way of combining that technical background with a genuine appreciation for Sonoran Desert flora.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Portrait image - hidden on mobile, shown on md+ */}
            <div className="hidden md:block">
              <Card className="overflow-hidden max-w-xs w-full md:max-w-none">
                <div className="relative w-full aspect-[3/4]">
                  <Image
                    src="/images/jc.webp"
                    alt="Portrait in the Sonoran Desert"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 320px, 400px"
                  />
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Section C: Purpose */}
        <section className="mb-12 md:mb-16">
          <Card>
            <CardHeader>
              <CardTitle>What this site is trying to do</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-base text-text-secondary leading-relaxed list-disc list-inside">
                <li>Highlight the plants of the Sonoran Desert with clear photos and names.</li>
                <li>Explain basic identification features and everyday uses where appropriate.</li>
                <li>Encourage people to slow down, notice, and appreciate the desert around them.</li>
                <li>Point toward further research for anyone who wants to go deeper.</li>
                <li>Serve as a free, accessible resource for students, locals, and visitors.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Section D: Why the Sonoran Desert matters */}
        <section className="mb-12 md:mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Why the Sonoran Desert is worth paying attention to</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 text-base text-text-secondary leading-relaxed">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Unique biodiversity
                  </h3>
                  <p>
                    The Sonoran Desert is one of the most biologically diverse deserts on Earth, with plant communities that exist nowhere else.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Many endemic species
                  </h3>
                  <p>
                    A significant number of plants here are endemic, meaning they naturally occur only in this region.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    A fragile system
                  </h3>
                  <p>
                    The desert looks tough, but the ecosystem is delicate. Habitat loss, climate change, and invasive species can quickly damage plant communities that took centuries to establish.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section E: About the creator */}
        <section>
          {/* Portrait image - shown on mobile only, hidden on md+ */}
          <div className="block md:hidden mb-8">
            <div className="flex justify-center">
              <Card className="overflow-hidden max-w-xs w-full">
                <div className="relative w-full aspect-[3/4]">
                  <Image
                    src="/images/jc.webp"
                    alt="Portrait in the Sonoran Desert"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 320px, 400px"
                  />
                </div>
              </Card>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>About the creator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-base text-text-secondary leading-relaxed">
                <p>
                  This site is built and maintained by a UX-minded web developer living in Arizona who happens to be obsessed with desert plants. It started as a personal project and will grow as I have time to explore new trails, take more photos, and keep learning.
                </p>
                <p>
                  If you have suggestions, corrections, or plants you would love to see added, I would love to hear from you.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
