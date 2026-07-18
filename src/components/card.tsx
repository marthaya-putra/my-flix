interface CardProps {
  imageUrl?: string;
  badge?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function Card({ imageUrl, badge, title, subtitle }: CardProps) {
  return (
    <div
      className="group cursor-pointer"
    >
      <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-card">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card">
            <div className="text-center text-muted-foreground">
              <div className="mb-2 text-3xl">🎬</div>
              <div className="text-xs">No Image</div>
            </div>
          </div>
        )}
        {badge && <div className="absolute top-2.5 right-2.5">{badge}</div>}

        {(title || subtitle) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
            {title && (
              <h3 className="truncate text-sm font-medium text-white group-hover:text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
