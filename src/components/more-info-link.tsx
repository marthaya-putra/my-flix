import * as React from "react";
import { FilmType } from "@/lib/types";

type MoreInfoLinkProps = {
  title: string;
  category: FilmType;
  releasedYear: number;
  children?: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export const MoreInfoLink = React.forwardRef<
  HTMLAnchorElement,
  MoreInfoLinkProps
>(
  (
    { title, category, releasedYear, children, className, ...props },
    ref,
  ) => {
    const typeKeyword = category === "movie" ? "movie" : "TV series";
    const query = `${title} ${releasedYear} ${typeKeyword}`;
    return (
      <a
        ref={ref}
        href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Search for more info"
        className={
          className ??
          "text-white/55 hover:text-white underline-offset-2 hover:underline"
        }
        {...props}
      >
        {children}
      </a>
    );
  },
);
MoreInfoLink.displayName = "MoreInfoLink";
