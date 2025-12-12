"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

interface ImageWithModalProps {
  src: string;
  alt: string;
  wrapperClassName?: string;
  allImages?: string[];
  startIndex?: number;
}

export default function ImageWithModal({
  src,
  alt,
  wrapperClassName = "",
  allImages,
  startIndex,
}: ImageWithModalProps) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex ?? 0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const images = allImages && allImages.length > 0 ? allImages : [src];

  const handleOpen = () => {
    if (allImages && typeof startIndex === "number") {
      setCurrentIndex(startIndex);
    } else {
      setCurrentIndex(0);
    }
    setZoomed(false);
    setOpen(true);
  };

  const hasPrev = images.length > 1 && currentIndex > 0;
  const hasNext = images.length > 1 && currentIndex < images.length - 1;
  const activeSrc = images[currentIndex];

  const goPrev = () => {
    if (!hasPrev) return;
    setCurrentIndex((index) => Math.max(0, index - 1));
    setZoomed(false);
  };

  const goNext = () => {
    if (!hasNext) return;
    setCurrentIndex((index) => Math.min(images.length - 1, index + 1));
    setZoomed(false);
  };

  // Escape + arrow keys + body scroll lock
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setZoomed(false);
      } else if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasPrev, hasNext, images.length]);

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={handleOpen}
        className={`relative block overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-primary transition-opacity duration-150 ease-out hover:opacity-90 ${wrapperClassName}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => {
            setOpen(false);
            setZoomed(false);
          }}
        >
          {/* This is the central box and the positioning context for arrows */}
          <div
            className="relative inline-flex max-w-[90vw] max-h-[90vh] items-center justify-center"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {/* Image container – give it an explicit height so Next.js Image with `fill` can render */}
            <div
              className="relative max-w-[90vw] max-h-[90vh] overflow-auto rounded-lg shadow-xl cursor-zoom-in"
              onClick={() => setZoomed((z) => !z)}
              onTouchStart={(e) => {
                // Only track on mobile (< md breakpoint)
                if (window.matchMedia("(min-width: 768px)").matches) return;
                const touch = e.touches[0];
                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchMove={(e) => {
                // Prevent default only if we're tracking a swipe
                if (touchStartRef.current && !window.matchMedia("(min-width: 768px)").matches) {
                  // Allow vertical scrolling, only prevent default for horizontal swipes
                  const touch = e.touches[0];
                  const dx = Math.abs(touch.clientX - touchStartRef.current.x);
                  const dy = Math.abs(touch.clientY - touchStartRef.current.y);
                  // If horizontal swipe is dominant, prevent default to avoid scrolling
                  if (dx > dy && dx > 10) {
                    e.preventDefault();
                  }
                }
              }}
              onTouchEnd={(e) => {
                // Only process on mobile (< md breakpoint)
                if (window.matchMedia("(min-width: 768px)").matches) {
                  touchStartRef.current = null;
                  return;
                }
                if (!touchStartRef.current) return;
                const touch = e.changedTouches[0];
                const dx = touch.clientX - touchStartRef.current.x;
                const dy = touch.clientY - touchStartRef.current.y;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);
                // Only trigger if horizontal swipe is dominant and exceeds threshold
                if (absDx > 50 && absDx > absDy) {
                  if (dx < 0) {
                    // Swipe left - next image
                    goNext();
                  } else {
                    // Swipe right - previous image
                    goPrev();
                  }
                }
                touchStartRef.current = null;
              }}
            >
              <div className="relative flex items-center justify-center">
                <Image
                  src={activeSrc}
                  alt={alt}
                  width={2000}
                  height={2000}
                  className={`max-h-[85vh] max-w-[90vw] w-auto h-auto object-contain transition-transform duration-200 ${
                    zoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                  }`}
                  sizes="90vw"
                />
              </div>
            </div>

            {/* Arrows – positioned relative to the central container */}
            {hasPrev && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                className="hidden md:flex absolute left-[-3rem] top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white text-2xl leading-none focus:outline-none"
              >
                ‹
              </button>
            )}

            {hasNext && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                className="hidden md:flex absolute right-[-3rem] top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white text-2xl leading-none focus:outline-none"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
