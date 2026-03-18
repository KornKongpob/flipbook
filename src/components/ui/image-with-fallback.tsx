"use client";

import Image from "next/image";
import { useState } from "react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
}

export function ImageWithFallback({ src, alt, fill, className, sizes }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted">
        No image
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
