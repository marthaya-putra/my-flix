import * as React from "react";
import { FilmType } from "@/lib/types";

type PlayLinkProps = {
  title: string;
  category: FilmType;
  children?: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export const PlayLink = React.forwardRef<HTMLAnchorElement, PlayLinkProps>(
  ({ title, category, children, ...props }, ref) => {
    const categoryPath = category === "movie" ? "movies" : "shows";
    return (
      <a
        ref={ref}
        href={`https://www.lookmovie2.to/${categoryPath}/search/?q=${title}`}
        target={title}
        rel="noopener noreferrer"
        className="block text-decoration-none color-inherit"
        {...props}
      >
        {children}
      </a>
    );
  },
);
PlayLink.displayName = "PlayLink";
