"use client";

import * as React from "react";
import Image from "next/image";

interface ImageViewerModalProps {
  thumbnail: React.ReactNode;
  src: string;
  alt: string;
}

export default function ImageViewerModal({
  thumbnail,
  src,
  alt,
}: ImageViewerModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isZoomed, setIsZoomed] = React.useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setIsZoomed(false);
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed((prev) => !prev);
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div onClick={openModal} className="cursor-pointer">
        {thumbnail}
      </div>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="max-w-[90vw] max-h-[90vh] bg-black/90 rounded-lg p-3 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-auto max-h-[80vh] w-full flex items-center justify-center">
              <div
                className="relative"
                style={{
                  width: isZoomed ? "150%" : "100%",
                  maxWidth: isZoomed ? "none" : "100%",
                }}
              >
                <Image
                  src={src}
                  alt={alt}
                  width={2000}
                  height={2000}
                  className="object-contain cursor-zoom-in w-full h-auto"
                  onClick={toggleZoom}
                  sizes="90vw"
                  priority
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
