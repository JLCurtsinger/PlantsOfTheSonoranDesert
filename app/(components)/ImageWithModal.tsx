"use client";

import { useEffect, useState } from "react";
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
        className={`relative block overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-primary ${wrapperClassName}`}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => {
            setOpen(false);
            setZoomed(false);
          }}
        >
          {/* This is the central box and the positioning context for arrows */}
          <div
            className="relative w-full max-w-[80vw] max-h-[80vh]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {/* Image container – give it an explicit height so Next.js Image with `fill` can render */}
            <div
              className="relative w-full h-[70vh] max-h-[80vh] overflow-auto rounded-lg bg-black cursor-zoom-in"
              onClick={() => setZoomed((z) => !z)}
            >
              <div
                className={`relative w-full h-full flex items-center justify-center transition-transform duration-200 ${
                  zoomed ? "scale-[1.5] cursor-zoom-out" : "scale-100"
                }`}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={activeSrc}
                    alt={alt}
                    fill
                    className="object-contain"
                    sizes="80vw"
                  />
                </div>
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
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white px-3 py-2 text-2xl leading-none focus:outline-none"
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white px-3 py-2 text-2xl leading-none focus:outline-none"
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
