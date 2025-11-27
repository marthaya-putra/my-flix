import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Hero() {
  const heroBg =
    "https://image.tmdb.org/t/p/w500/5h2EsPKNDdB3MAtOk9MB9Ycg9Rz.jpg";
  return (
    <div className="relative w-full h-[50vh] overflow-hidden">
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transform animate-in fade-in duration-1000"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative h-full flex justify-between px-4 md:px-12 max-w-7xl mx-auto pt-20">
        <div className="max-w-2xl ">
          <Badge
            variant="outline"
            className="border-primary/50 text-primary bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-2 backdrop-blur-md"
          >
            #1 in Movies Today
          </Badge>

          <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-none tracking-tight drop-shadow-2xl">
            NEON <br /> HORIZON
          </h1>

          <div className="flex items-center gap-4 text-sm md:text-base text-gray-300 font-medium">
            <span>2025</span>
            <span>2h 14m</span>
            <span>Sci-Fi</span>
          </div>

          <p className="text-lg text-gray-300 leading-relaxed line-clamp-3 md:line-clamp-none max-w-xl drop-shadow-md">
            In a future where memories can be digitized, a rogue detective
            uncovers a conspiracy that threatens to overwrite humanity's
            collective consciousness.
          </p>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Button
            size="lg"
            className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-md gap-2 shadow-lg shadow-primary/25"
          >
            <Play className="w-5 h-5 fill-current" /> Play Now
          </Button>
        </div>
      </div>
    </div>
  );
}
