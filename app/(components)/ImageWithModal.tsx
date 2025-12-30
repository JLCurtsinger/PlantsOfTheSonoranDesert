"use client";

import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import { sanityImageLoader } from "@/lib/sanity/image";

interface ImageWithModalProps {
  src: string;
  alt: string;
  wrapperClassName?: string;
  allImages?: string[];
  startIndex?: number;
  thumbnailSizes?: string;
  modalSizes?: string;
  priority?: boolean;
}

// Constrain modal image size to reasonable max (1920px) instead of unbounded 100vw
// This prevents requesting huge images on large desktop screens
const MODAL_MAX_WIDTH = 1920;
const MODAL_SIZES = `(max-width: 1920px) 90vw, ${MODAL_MAX_WIDTH}px`;

// Dev-only instrumentation for debugging image loading performance
const isDev = process.env.NODE_ENV === 'development';

export default function ImageWithModal({
  src,
  alt,
  wrapperClassName = "",
  allImages,
  startIndex,
  thumbnailSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  modalSizes = MODAL_SIZES,
  priority = false,
}: ImageWithModalProps) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex ?? 0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const imageTrackRef = useRef<HTMLDivElement>(null);
  const dragXRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const preloadedImagesRef = useRef<Set<string>>(new Set());
  const imageLoadStartRef = useRef<{ [key: string]: number }>({});
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Memoize images array to avoid recomputation
  const images = useMemo(() => {
    return allImages && allImages.length > 0 ? allImages : [src];
  }, [allImages, src]);

  // Memoize active source to avoid recomputation
  const activeSrc = useMemo(() => images[currentIndex], [images, currentIndex]);
  
  // Memoize navigation state
  const hasPrev = useMemo(() => images.length > 1 && currentIndex > 0, [images.length, currentIndex]);
  const hasNext = useMemo(() => images.length > 1 && currentIndex < images.length - 1, [images.length, currentIndex]);

  // Preload an image URL by creating an Image object
  // This triggers browser caching without rendering
  const preloadImage = useCallback((imageSrc: string) => {
    if (preloadedImagesRef.current.has(imageSrc)) {
      return; // Already preloaded
    }
    
    if (isDev) {
      console.log('[ImageWithModal] Preloading image:', imageSrc.substring(0, 100) + '...');
    }
    
    // Generate the URL that Next.js Image would request (approximate max width for modal)
    const preloadUrl = sanityImageLoader({ src: imageSrc, width: MODAL_MAX_WIDTH });
    
    const img = new window.Image();
    img.src = preloadUrl;
    preloadedImagesRef.current.add(imageSrc);
    
    if (isDev) {
      img.onload = () => {
        console.log('[ImageWithModal] Preload complete:', imageSrc.substring(0, 100) + '...');
      };
      img.onerror = () => {
        console.warn('[ImageWithModal] Preload failed:', imageSrc.substring(0, 100) + '...');
      };
    }
  }, []);

  // Preload prev/next images when modal opens or index changes
  useEffect(() => {
    if (!open) return;
    
    // Preload current image
    if (activeSrc) {
      preloadImage(activeSrc);
    }
    
    // Preload next image
    if (hasNext && currentIndex + 1 < images.length) {
      preloadImage(images[currentIndex + 1]);
    }
    
    // Preload previous image
    if (hasPrev && currentIndex - 1 >= 0) {
      preloadImage(images[currentIndex - 1]);
    }
  }, [open, currentIndex, activeSrc, hasNext, hasPrev, images, preloadImage]);

  const handleOpen = () => {
    if (allImages && typeof startIndex === "number") {
      const clampedIndex = Math.max(0, Math.min(startIndex, images.length - 1));
      setCurrentIndex(clampedIndex);
    } else {
      setCurrentIndex(0);
    }
    setZoomed(false);
    setOpen(true);
    setIsImageLoading(true);
    
    if (isDev) {
      console.log('[ImageWithModal] Modal opened, index:', startIndex ?? 0);
    }
  };

  const goPrev = useCallback((e?: React.MouseEvent) => {
    if (!hasPrev) return;
    if (e) {
      e.stopPropagation();
    }
    
    if (isDev) {
      console.log('[ImageWithModal] Navigating to previous image');
    }
    
    setIsImageLoading(true);
    setCurrentIndex((index) => {
      const newIndex = Math.max(0, index - 1);
      if (isDev) {
        console.log('[ImageWithModal] Previous index:', newIndex);
      }
      return newIndex;
    });
    setZoomed(false);
  }, [hasPrev]);

  const goNext = useCallback((e?: React.MouseEvent) => {
    if (!hasNext) return;
    if (e) {
      e.stopPropagation();
    }
    
    if (isDev) {
      console.log('[ImageWithModal] Navigating to next image');
    }
    
    setIsImageLoading(true);
    setCurrentIndex((index) => {
      const newIndex = Math.min(images.length - 1, index + 1);
      if (isDev) {
        console.log('[ImageWithModal] Next index:', newIndex);
      }
      return newIndex;
    });
    setZoomed(false);
  }, [hasNext, images.length]);

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

  // Set focus immediately when modal opens (before browser paint)
  // This ensures the modal is fully active immediately, preventing the "first click activates" issue
  useLayoutEffect(() => {
    if (!open) return;
    
    // Set focus synchronously before browser paint to ensure modal is immediately active
    if (modalContainerRef.current) {
      modalContainerRef.current.focus();
    }
  }, [open]);

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
          loader={sanityImageLoader}
          sizes={thumbnailSizes}
          priority={priority}
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
            ref={modalContainerRef}
            tabIndex={-1}
            className="relative inline-flex max-w-[90vw] max-h-[90vh] items-center justify-center outline-none"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {/* Image container – give it an explicit height so Next.js Image with `fill` can render */}
            <div
              className="relative max-w-[90vw] max-h-[90vh] overflow-hidden rounded-lg shadow-xl cursor-zoom-in md:overflow-auto"
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
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
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <Image
                    key={activeSrc}
                    src={activeSrc}
                    alt={alt}
                    width={MODAL_MAX_WIDTH}
                    height={MODAL_MAX_WIDTH}
                    className={`max-h-[85vh] max-w-[90vw] w-auto h-auto object-contain transition-transform duration-200 ${
                      zoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                    }`}
                    loader={sanityImageLoader}
                    sizes={modalSizes}
                    onLoadStart={() => {
                      setIsImageLoading(true);
                      if (isDev) {
                        imageLoadStartRef.current[activeSrc] = performance.now();
                        const url = sanityImageLoader({ src: activeSrc, width: MODAL_MAX_WIDTH });
                        console.log('[ImageWithModal] Image load started:', {
                          index: currentIndex,
                          urlLength: url.length,
                          urlPreview: url.substring(0, 150) + '...',
                        });
                      }
                    }}
                    onLoad={() => {
                      setIsImageLoading(false);
                      if (isDev) {
                        const startTime = imageLoadStartRef.current[activeSrc];
                        if (startTime) {
                          const loadTime = performance.now() - startTime;
                          console.log('[ImageWithModal] Image loaded:', {
                            index: currentIndex,
                            loadTime: `${loadTime.toFixed(0)}ms`,
                          });
                          delete imageLoadStartRef.current[activeSrc];
                        }
                      }
                    }}
                    onError={() => {
                      setIsImageLoading(false);
                      if (isDev) {
                        console.error('[ImageWithModal] Image load error:', {
                          index: currentIndex,
                          src: activeSrc.substring(0, 100) + '...',
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Arrows – positioned relative to the central container */}
            {hasPrev && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev(e);
                }}
                className="hidden md:flex absolute left-[-3rem] top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                style={{ pointerEvents: 'auto' }}
              >
                ‹
              </button>
            )}

            {hasNext && (
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext(e);
                }}
                className="hidden md:flex absolute right-[-3rem] top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                style={{ pointerEvents: 'auto' }}
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
