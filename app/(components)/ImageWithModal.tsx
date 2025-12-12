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
  const imageTrackRef = useRef<HTMLDivElement>(null);
  const dragXRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const images = allImages && allImages.length > 0 ? allImages : [src];

  const handleOpen = () => {
    if (allImages && typeof startIndex === "number") {
      const clampedIndex = Math.max(0, Math.min(startIndex, images.length - 1));
      setCurrentIndex(clampedIndex);
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

  // Mobile-only slide animation helpers
  const updateTrackTransform = (x: number, withTransition = false) => {
    if (!imageTrackRef.current) return;
    const track = imageTrackRef.current;
    if (withTransition) {
      track.style.transition = "transform 180ms ease-out";
    } else {
      track.style.transition = "none";
    }
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  const resetTrackPosition = () => {
    if (imageTrackRef.current) {
      imageTrackRef.current.style.transition = "none";
      imageTrackRef.current.style.transform = "translate3d(0, 0, 0)";
    }
    dragXRef.current = 0;
    isAnimatingRef.current = false;
  };

  const animateToNext = () => {
    if (!imageTrackRef.current) return;
    isAnimatingRef.current = true;
    const containerWidth = imageTrackRef.current.offsetWidth || window.innerWidth * 0.9;
    updateTrackTransform(-containerWidth, true);
    imageTrackRef.current.addEventListener(
      "transitionend",
      () => {
        goNext();
        resetTrackPosition();
      },
      { once: true }
    );
  };

  const animateToPrev = () => {
    if (!imageTrackRef.current) return;
    isAnimatingRef.current = true;
    const containerWidth = imageTrackRef.current.offsetWidth || window.innerWidth * 0.9;
    updateTrackTransform(containerWidth, true);
    imageTrackRef.current.addEventListener(
      "transitionend",
      () => {
        goPrev();
        resetTrackPosition();
      },
      { once: true }
    );
  };

  const bounceAtBoundary = (direction: "left" | "right") => {
    if (!imageTrackRef.current) return;
    isAnimatingRef.current = true;
    const offset = direction === "left" ? -24 : 24;
    updateTrackTransform(offset, true);
    imageTrackRef.current.addEventListener(
      "transitionend",
      () => {
        updateTrackTransform(0, true);
        imageTrackRef.current?.addEventListener(
          "transitionend",
          () => {
            isAnimatingRef.current = false;
          },
          { once: true }
        );
      },
      { once: true }
    );
  };

  // Reset track position when modal opens/closes or index changes
  useEffect(() => {
    if (!open) {
      resetTrackPosition();
      return;
    }
    // Reset on index change (after animation completes)
    const timer = setTimeout(() => {
      resetTrackPosition();
    }, 200);
    return () => clearTimeout(timer);
  }, [open, currentIndex]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

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
              className="relative max-w-[90vw] max-h-[90vh] overflow-hidden rounded-lg shadow-xl cursor-zoom-in md:overflow-auto"
              onClick={() => setZoomed((z) => !z)}
              onTouchStart={(e) => {
                // Only track on mobile (< md breakpoint)
                if (window.matchMedia("(min-width: 768px)").matches) return;
                if (isAnimatingRef.current) return;
                const touch = e.touches[0];
                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                dragXRef.current = 0;
                resetTrackPosition();
              }}
              onTouchMove={(e) => {
                // Prevent default only if we're tracking a swipe
                if (touchStartRef.current && !window.matchMedia("(min-width: 768px)").matches && !isAnimatingRef.current) {
                  const touch = e.touches[0];
                  const dx = touch.clientX - touchStartRef.current.x;
                  const dy = Math.abs(touch.clientY - touchStartRef.current.y);
                  const absDx = Math.abs(dx);
                  
                  // If horizontal swipe is dominant, prevent default and update drag
                  if (absDx > dy && absDx > 10) {
                    e.preventDefault();
                    dragXRef.current = dx;
                    
                    // Cancel previous RAF
                    if (rafIdRef.current !== null) {
                      cancelAnimationFrame(rafIdRef.current);
                    }
                    
                    // Update transform in RAF for performance
                    rafIdRef.current = requestAnimationFrame(() => {
                      if (imageTrackRef.current) {
                        imageTrackRef.current.style.transition = "none";
                        imageTrackRef.current.style.transform = `translate3d(${dragXRef.current}px, 0, 0)`;
                      }
                    });
                  }
                }
              }}
              onTouchEnd={(e) => {
                // Only process on mobile (< md breakpoint)
                if (window.matchMedia("(min-width: 768px)").matches) {
                  touchStartRef.current = null;
                  return;
                }
                if (!touchStartRef.current || isAnimatingRef.current) {
                  touchStartRef.current = null;
                  return;
                }
                
                // Cancel any pending RAF
                if (rafIdRef.current !== null) {
                  cancelAnimationFrame(rafIdRef.current);
                  rafIdRef.current = null;
                }
                
                const touch = e.changedTouches[0];
                const dx = touch.clientX - touchStartRef.current.x;
                const dy = touch.clientY - touchStartRef.current.y;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);
                
                // Only trigger if horizontal swipe is dominant and exceeds threshold
                if (absDx > 50 && absDx > absDy) {
                  if (dx < 0) {
                    // Swipe left - next image
                    if (hasNext) {
                      animateToNext();
                    } else {
                      bounceAtBoundary("left");
                    }
                  } else {
                    // Swipe right - previous image
                    if (hasPrev) {
                      animateToPrev();
                    } else {
                      bounceAtBoundary("right");
                    }
                  }
                } else {
                  // Threshold not met, animate back to center
                  updateTrackTransform(0, true);
                  imageTrackRef.current?.addEventListener(
                    "transitionend",
                    () => {
                      isAnimatingRef.current = false;
                    },
                    { once: true }
                  );
                }
                
                touchStartRef.current = null;
              }}
            >
              {/* Mobile sliding track wrapper */}
              <div
                ref={imageTrackRef}
                className="md:transform-none relative flex items-center justify-center"
                style={{ willChange: "transform" }}
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
