import { useNavigate, useSearch } from "@tanstack/react-router";
import Card from "@/components/card";
import { User } from "lucide-react";
import Pagination from "@/components/pagination";
import { Person } from "@/lib/types";

interface ActorsContentProps {
  actorsData: {
    page: number;
    actors: Array<Person>;
    totalPages: number;
  };
}

export default function ActorsContent({ actorsData }: ActorsContentProps) {
  const navigate = useNavigate({ from: "/actors-search" });
  const { query } = useSearch({ from: "/actors-search" });

  const nextPage = () =>
    navigate({
      search: { query: query || "", page: actorsData.page + 1 },
    });

  const prevPage = () =>
    navigate({
      search: { query: query || "", page: actorsData.page - 1 },
    });

  return (
    <>
      <Pagination
        currentPage={actorsData.page}
        totalPages={actorsData.totalPages}
        hasNextPage={actorsData.page < actorsData.totalPages}
        hasPreviousPage={actorsData.page > 1}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 my-8">
        {actorsData.actors.map((actor) => (
          <Card
            key={actor.id}
            imageUrl={actor.profileImageUrl}
            title={actor.name}
            badge={
              <div className="rounded-full bg-purple-600 p-1">
                <User className="h-3 w-3 text-white" />
              </div>
            }
          />
        ))}
      </div>

      <Pagination
        currentPage={actorsData.page}
        totalPages={actorsData.totalPages}
        hasNextPage={actorsData.page < actorsData.totalPages}
        hasPreviousPage={actorsData.page > 1}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />
    </>
  );
}