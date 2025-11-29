import { Heart, HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

interface FavoriteIconProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  isFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
}

export default function FavoriteIcon({
  size = "md",
  variant = "outline",
  className = "",
  isFavorited: controlledFavorite,
  onToggle,
}: FavoriteIconProps) {
  const [internalFavorite, setInternalFavorite] = useState(false);
  const isFavorited = controlledFavorite !== undefined ? controlledFavorite : internalFavorite;

  const handleToggle = () => {
    const newState = !isFavorited;
    if (controlledFavorite === undefined) {
      setInternalFavorite(newState);
    }
    onToggle?.(newState);
  };

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={variant}
          className={`
            ${sizeClasses[size]}
            rounded-full
            transition-all duration-300
            ${isFavorited
              ? 'bg-red-500 border-red-400 text-white hover:bg-red-600 scale-110'
              : 'border-gray-400 bg-transparent text-white hover:bg-white/20 hover:text-white hover:scale-105'
            }
            ${className}
          `}
          onClick={handleToggle}
        >
          {isFavorited ? (
            <Heart
              className={`
                ${iconSizes[size]}
                fill-current
                transition-all duration-300
                animate-pulse
              `}
            />
          ) : (
            <Heart
              className={`
                ${iconSizes[size]}
                transition-all duration-300
              `}
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isFavorited ? 'Remove from favorites' : 'Add to favorites'}</p>
      </TooltipContent>
    </Tooltip>
  );
}