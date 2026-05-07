import { useState } from "react";

export function CreatorImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/30 text-xs tracking-[0.22em] text-brand-muted">
        NO IMAGE
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
      onError={() => setFailed(true)}
    />
  );
}
