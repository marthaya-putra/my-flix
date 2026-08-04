import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PosterImageProps = {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
};

// Poster with a muted placeholder until bytes paint, then a 300ms fade-in.
// Prevents the empty-box pop when the grid mounts faster than the proxied
// TMDB image streams in (e.g. /watchlist). The wrapper is `bg-muted`, so a
// loading card matches `WatchlistSkeleton` instead of reading as broken.
//
// Race-safe: a cached image can fire `onLoad` before React attaches the
// handler. `useLayoutEffect` reads `img.complete` on every `src` change so
// cached posters still fade.
export function PosterImage({
  src,
  alt,
  fallbackSrc = "/poster-placeholder.svg",
  className,
}: PosterImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset on src change so the placeholder + fade replay for a new image.
  useLayoutEffect(() => {
    setCurrentSrc(src);
    setLoaded(imgRef.current?.complete ?? false);
  }, [src]);

  return (
    <div className={cn("relative bg-muted overflow-hidden", className)}>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        decoding="async"
        // No loading="lazy": MovieCard grids are above-the-fold. Lazy defers
        // the request until scroll-near, which is what made posters appear late
        // on /watchlist. Horizontal scrollers (content-cards.tsx) use their
        // own lazy imgs off-screen; this shared poster is not one of them.
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
        }}
      />
    </div>
  );
}
