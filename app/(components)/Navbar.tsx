import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-card border-b border-border-subtle px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-text-primary">
          Plants of the Sonoran Desert
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            About
          </Link>
          <Link
            href="/plants"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            Plants
          </Link>
        </div>
      </div>
    </nav>
  );
}

