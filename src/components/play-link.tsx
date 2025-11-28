interface PlayLinkProps {
  title: string;
  category: string;
  children: React.ReactNode;
}

export function PlayLink({ title, category, children }: PlayLinkProps) {
  return (
    <a
      href={`https://123movies-official.hair/search?q=${title.replace(/ /g, "+")}&category=${category}`}
      target={title}
      rel="noopener noreferrer"
      className="block text-decoration-none color-inherit"
    >
      {children}
    </a>
  );
}