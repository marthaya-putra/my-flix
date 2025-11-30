interface CardProps {
  imageUrl?: string;
  badge?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function Card({ imageUrl, badge, title, subtitle }: CardProps) {
  return (
    <div className="group cursor-pointer transition-transform duration-200 hover:scale-105">
      <div className="relative aspect-3/4 overflow-hidden rounded-md bg-gray-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || ""}
            className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <div className="mb-2 text-3xl">🎬</div>
              <div className="text-xs">No Image</div>
            </div>
          </div>
        )}
        {badge && <div className="absolute top-2 right-2">{badge}</div>}

        {/* Title and subtitle overlay at bottom */}
        {(title || subtitle) && (
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-3">
            {title && (
              <h3 className="truncate text-sm font-medium text-white group-hover:text-blue-400">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-gray-300">{subtitle}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
