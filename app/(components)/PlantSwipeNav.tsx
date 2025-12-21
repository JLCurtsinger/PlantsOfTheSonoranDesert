"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface PlantSwipeNavProps {
  prevSlug: string | null;
  nextSlug: string | null;
}

export default function PlantSwipeNav({
  prevSlug,
  nextSlug,
}: PlantSwipeNavProps) {
  const router = useRouter();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 60;
  const maxSwipeTime = 500; // Maximum time for a swipe gesture in ms
  const hasNavigatedRef = useRef(false);

  const handleTouchStart = (e: TouchEvent | PointerEvent) => {
    const point = "touches" in e ? e.touches[0] : e;
    touchStartRef.current = { x: point.clientX, y: point.clientY, time: Date.now() };
    touchEndRef.current = null;
    hasNavigatedRef.current = false;
  };

  const handleTouchMove = (e: TouchEvent | PointerEvent) => {
    if (!touchStartRef.current || hasNavigatedRef.current) {
      return;
    }
    const point = "touches" in e ? e.touches[0] : e;
    touchEndRef.current = { x: point.clientX, y: point.clientY };
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current || hasNavigatedRef.current) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const swipeTime = Date.now() - touchStartRef.current.time;

    // Only trigger if:
    // 1. Horizontal movement exceeds threshold
    // 2. Horizontal movement is dominant over vertical
    // 3. Swipe was quick enough (not a slow drag)
    // 4. Haven't already navigated
    if (
      absDeltaX > minSwipeDistance &&
      absDeltaX > absDeltaY &&
      swipeTime < maxSwipeTime &&
      !hasNavigatedRef.current
    ) {
      hasNavigatedRef.current = true;
      
      if (deltaX > 0 && prevSlug) {
        // Swipe right -> previous plant
        router.push(`/plants/${prevSlug}`);
      } else if (deltaX < 0 && nextSlug) {
        // Swipe left -> next plant
        router.push(`/plants/${nextSlug}`);
      }
    }

    // Reset
    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  useEffect(() => {
    // Only enable swipe on mobile/tablet (below lg breakpoint)
    const checkMediaQuery = () => {
      return window.matchMedia("(max-width: 1023px)").matches;
    };

    if (!checkMediaQuery()) {
      return;
    }

    const element = document.documentElement;

    // Use pointer events for better cross-device support
    element.addEventListener("pointerdown", handleTouchStart, { passive: true });
    element.addEventListener("pointermove", handleTouchMove, { passive: true });
    element.addEventListener("pointerup", handleTouchEnd, { passive: true });
    element.addEventListener("pointercancel", handleTouchEnd, { passive: true });

    // Fallback for touch events
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("pointerdown", handleTouchStart);
      element.removeEventListener("pointermove", handleTouchMove);
      element.removeEventListener("pointerup", handleTouchEnd);
      element.removeEventListener("pointercancel", handleTouchEnd);
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [prevSlug, nextSlug, router]);

  // This component doesn't render anything
  return null;
}

