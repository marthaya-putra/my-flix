import { useNavigate, useSearch } from "@tanstack/react-router";
import Card from "@/components/card";
import { User, Film, Camera, Star } from "lucide-react";
import Pagination from "@/components/pagination";
import { Person } from "@/lib/types";

interface PersonContentProps {
  personData: {
    page: number;
    people: Array<Person>;
    totalPages: number;
  };
}

const getCategoryBadge = (category: Person['category']) => {
  switch (category) {
    case 'actor':
      return (
        <div className="rounded-full bg-blue-600 p-1">
          <Film className="h-3 w-3 text-white" />
        </div>
      );
    case 'director':
      return (
        <div className="rounded-full bg-green-600 p-1">
          <Camera className="h-3 w-3 text-white" />
        </div>
      );
    case 'other':
      return (
        <div className="rounded-full bg-gray-600 p-1">
          <Star className="h-3 w-3 text-white" />
        </div>
      );
    default:
      return (
        <div className="rounded-full bg-purple-600 p-1">
          <User className="h-3 w-3 text-white" />
        </div>
      );
  }
};

export default function PersonContent({ personData }: PersonContentProps) {
  const navigate = useNavigate({ from: "/person/search" });
  const { query } = useSearch({ from: "/person/search" });

  const nextPage = () =>
    navigate({
      search: { query: query || "", page: personData.page + 1 },
    });

  const prevPage = () =>
    navigate({
      search: { query: query || "", page: personData.page - 1 },
    });

  return (
    <>
      <Pagination
        currentPage={personData.page}
        totalPages={personData.totalPages}
        hasNextPage={personData.page < personData.totalPages}
        hasPreviousPage={personData.page > 1}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 my-8">
        {personData.people.map((person) => (
          <Card
            key={person.id}
            imageUrl={person.profileImageUrl}
            title={person.name}
            subtitle={person.category}
            badge={getCategoryBadge(person.category)}
          />
        ))}
      </div>

      <Pagination
        currentPage={personData.page}
        totalPages={personData.totalPages}
        hasNextPage={personData.page < personData.totalPages}
        hasPreviousPage={personData.page > 1}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />
    </>
  );
}