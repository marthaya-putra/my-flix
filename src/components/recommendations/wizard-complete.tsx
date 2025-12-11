import { CheckCircle, Film, Tv, Users, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WizardCompleteProps {
  movieCount: number;
  tvCount: number;
  peopleCount: number;
}

export function WizardComplete({ movieCount, tvCount, peopleCount }: WizardCompleteProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">You're All Set!</h2>
          <p className="text-muted-foreground mt-2">
            Your preferences have been saved. We'll now generate personalized recommendations based on what you've shared.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Your Preferences Summary:</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Film className="h-5 w-5 text-primary" />
                <span>Movies</span>
              </div>
              <Badge variant="secondary">{movieCount} selected</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Tv className="h-5 w-5 text-primary" />
                <span>TV Shows</span>
              </div>
              <Badge variant="secondary">{tvCount} selected</Badge>
            </div>

            {peopleCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Actors & Directors</span>
                </div>
                <Badge variant="secondary">{peopleCount} selected</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
        <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
        <h3 className="font-semibold mb-2">Ready for Your Recommendations?</h3>
        <p className="text-sm text-muted-foreground">
          Click the button below to see your personalized movie and TV show recommendations!
        </p>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          You can always update your preferences later by visiting your profile settings.
        </p>
      </div>
    </div>
  );
}