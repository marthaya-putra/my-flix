interface PlayLinkProps {
  title: string;
  category: string;
  children: React.ReactNode;
}

export function PlayLink({ title, category, children }: PlayLinkProps) {
  return (
    <a
      href={`https://fmoviesz.fi/search/${title.replace(/ /g, "-")}}`}
      target={title}
      rel="noopener noreferrer"
      className="block text-decoration-none color-inherit"
    >
      {children}
    </a>
  );
}
