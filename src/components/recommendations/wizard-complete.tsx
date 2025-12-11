import { CheckCircle, Film, Tv, Users, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WizardCompleteProps {
  movieCount: number;
  tvCount: number;
  peopleCount: number;
  onGetRecommendations: () => void;
  isLoading?: boolean;
}

export function WizardComplete({
  movieCount,
  tvCount,
  peopleCount,
  onGetRecommendations,
  isLoading = false
}: WizardCompleteProps) {
  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold">You're All Set!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your preferences have been saved.
          </p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center space-y-3">
        <Sparkles className="h-6 w-6 text-primary mx-auto" />
        <h3 className="font-semibold">Ready for Your Recommendations?</h3>

        <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Film className="h-3 w-3" />
            {movieCount} movies
          </span>
          <span className="flex items-center gap-1">
            <Tv className="h-3 w-3" />
            {tvCount} shows
          </span>
          {peopleCount > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {peopleCount} people
            </span>
          )}
        </div>

        <Button
          onClick={onGetRecommendations}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving Preferences...
            </>
          ) : (
            "Get My Recommendations"
          )}
        </Button>

        <p className="text-xs text-muted-foreground mt-3">
          You can always update your preferences later by visiting your profile settings.
        </p>
      </div>
    </div>
  );
}