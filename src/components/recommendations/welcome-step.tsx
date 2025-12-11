import { Sparkles, Film, Tv, Users } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Sparkles className="h-16 w-16 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Welcome to Your Personalized Recommendations!</h2>
          <p className="text-muted-foreground mt-2">
            Let's set up your preferences to get amazing movie and TV show recommendations tailored just for you.
          </p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-center">What we'll ask you to share:</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <Film className="h-6 w-6 text-primary mt-1" />
            <div>
              <p className="font-medium">Favorite Movies</p>
              <p className="text-sm text-muted-foreground">At least 3 movies you love</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Tv className="h-6 w-6 text-primary mt-1" />
            <div>
              <p className="font-medium">Favorite TV Shows</p>
              <p className="text-sm text-muted-foreground">At least 3 series you enjoy</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Users className="h-6 w-6 text-primary mt-1" />
            <div>
              <p className="font-medium">Favorite People</p>
              <p className="text-sm text-muted-foreground">Actors & directors (optional)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>This will only take a few minutes and you can always update your preferences later.</p>
      </div>
    </div>
  );
}