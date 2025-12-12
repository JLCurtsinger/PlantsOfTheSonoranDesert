import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-card border-b border-border-subtle px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-text-primary transition-all duration-150 ease-out hover:text-text-primary hover:underline hover:underline-offset-2 hover:[text-shadow:0_1px_2px_rgba(0,0,0,0.1)]">
          Plants of the Sonoran Desert
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-text-secondary transition-all duration-150 ease-out hover:underline hover:underline-offset-2 hover:[text-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-text-secondary transition-all duration-150 ease-out hover:underline hover:underline-offset-2 hover:[text-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
          >
            About
          </Link>
          <Link
            href="/plants"
            className="text-text-secondary transition-all duration-150 ease-out hover:underline hover:underline-offset-2 hover:[text-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
          >
            Plants
          </Link>
        </div>
      </div>
    </nav>
  );
}

