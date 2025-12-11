"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface ImageWithModalProps {
  src: string;
  alt: string;
  /** Wrapper classes for the thumbnail container (height, rounding, etc.) */
  wrapperClassName?: string;
}

/**
 * Renders a clickable thumbnail that opens a fullscreen modal.
 * - Click thumbnail: open modal
 * - In modal: click image to toggle zoom (scale ~150%)
 * - Click backdrop or press Escape: close
 */
export default function ImageWithModal({
  src,
  alt,
  wrapperClassName = "",
}: ImageWithModalProps) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Handle Escape key + body scroll lock
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setZoomed(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
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
          <div
            className="relative max-w-5xl w-full max-h-[90vh]"
            onClick={(event) => {
              // Prevent clicks on the image container from closing the modal
              event.stopPropagation();
            }}
          >
            <div
              className="relative w-full h-[60vh] overflow-auto rounded-lg bg-black cursor-zoom-in"
              onClick={() => setZoomed((z) => !z)}
            >
              <div
                className={`relative w-full h-full transition-transform duration-200 ${
                  zoomed ? "scale-150 cursor-zoom-out" : "scale-100"
                }`}
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
