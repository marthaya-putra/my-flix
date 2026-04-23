import { FilmType } from "@/lib/types";

interface PlayLinkProps {
  title: string;
  category: FilmType;
  children: React.ReactNode;
}

export function PlayLink({ title, category, children }: PlayLinkProps) {
  const categoryPath = category === "movie" ? "movies" : "shows";
  return (
    <a
      href={`https://www.lookmovie2.to/${categoryPath}/search/?q=${title}`}
      target={title}
      rel="noopener noreferrer"
      className="block text-decoration-none color-inherit"
    >
      {children}
    </a>
  );
}
