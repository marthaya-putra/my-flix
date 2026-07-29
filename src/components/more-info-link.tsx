import { FilmType } from "@/lib/types";

interface MoreInfoLinkProps {
  title: string;
  category: FilmType;
  releasedYear: number;
  children: React.ReactNode;
  className?: string;
}

export function MoreInfoLink({
  title,
  category,
  releasedYear,
  children,
  className,
}: MoreInfoLinkProps) {
  const typeKeyword = category === "movie" ? "movie" : "TV series";
  const query = `${title} ${releasedYear} ${typeKeyword}`;
  return (
    <a
      href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Search for more info"
      className={
        className ??
        "text-white/55 hover:text-white underline-offset-2 hover:underline"
      }
    >
      {children}
    </a>
  );
}
