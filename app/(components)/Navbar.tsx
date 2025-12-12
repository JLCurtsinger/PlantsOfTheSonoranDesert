"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMobileNav = () => setIsOpen((prev) => !prev);

  const navLinkClass = "text-text-secondary transition-all duration-150 ease-out hover:underline hover:underline-offset-2 hover:[text-shadow:0_1px_2px_rgba(0,0,0,0.1)]";

  return (
    <nav className="bg-card border-b border-border-subtle px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-text-primary transition-all duration-150 ease-out hover:text-text-primary hover:underline hover:underline-offset-2 hover:[text-shadow:0_1px_2px_rgba(0,0,0,0.1)]">
          Plants of the Sonoran Desert
        </Link>
        
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className={navLinkClass}>
            Home
          </Link>
          <Link href="/about" className={navLinkClass}>
            About
          </Link>
          <Link href="/plants" className={navLinkClass}>
            Plants
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden flex items-center justify-center p-2 transition-transform duration-150 ease-out hover:-translate-y-px"
          onClick={toggleMobileNav}
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
        >
          <div className="relative w-5 h-4">
            <span
              className={`absolute left-0 top-0 h-0.5 w-full bg-black rounded-full transition-all duration-150 ease-out ${
                isOpen ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 h-0.5 w-full bg-black rounded-full transition-opacity duration-150 ease-out ${
                isOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 bottom-0 h-0.5 w-full bg-black rounded-full transition-all duration-150 ease-out ${
                isOpen ? "-translate-y-1.5 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="md:hidden mt-2 border border-black rounded-2xl bg-white px-4 py-3">
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/" className={navLinkClass} onClick={() => setIsOpen(false)}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/about" className={navLinkClass} onClick={() => setIsOpen(false)}>
                About
              </Link>
            </li>
            <li>
              <Link href="/plants" className={navLinkClass} onClick={() => setIsOpen(false)}>
                Plants
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

