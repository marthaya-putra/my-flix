import { useState } from "react";
import { WizardStep } from "./wizard-step";
import { WelcomeStep } from "./welcome-step";
import { ContentSelectionStep } from "./content-selection-step";
import { PeopleSelectionStep } from "./people-selection-step";
import { WizardComplete } from "./wizard-complete";
import { usePreferences } from "@/components/preferences/use-preferences";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MIN_MOVIES = 3;
const MIN_TV_SHOWS = 3;

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMovies, setSelectedMovies] = useState<any[]>([]);
  const [selectedTvShows, setSelectedTvShows] = useState<any[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { addPreference } = usePreferences();
  const router = useRouter();

  const steps = [
    { title: "Welcome", component: "welcome" },
    { title: "Favorite Movies", component: "movies" },
    { title: "Favorite TV Shows", component: "tv" },
    { title: "Favorite People", component: "people" },
    { title: "Complete", component: "complete" },
  ];

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Complete wizard - save all preferences
      await saveAllPreferences();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const saveAllPreferences = async () => {
    setIsSaving(true);
    try {
      // Save all movies
      for (const movie of selectedMovies) {
        await addPreference({ ...movie, category: "movie" });
      }

      // Save all TV shows
      for (const tv of selectedTvShows) {
        await addPreference({ ...tv, category: "tv" });
      }

      // Save all people
      for (const person of selectedPeople) {
        await addPreference({ ...person, category: "person" });
      }

      toast.success("Your preferences have been saved!");

      // Navigate to recommendations to see the results
      router.navigate({ to: "/recommendations" });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1: // Movies step
        return selectedMovies.length >= MIN_MOVIES;
      case 2: // TV step
        return selectedTvShows.length >= MIN_TV_SHOWS;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (steps[currentStep].component) {
      case "welcome":
        return <WelcomeStep onNext={handleNext} />;

      case "movies":
        return (
          <ContentSelectionStep
            type="movie"
            title="Select Your Favorite Movies"
            description={`Choose at least ${MIN_MOVIES} movies that you love. This helps us understand your taste.`}
            selectedItems={selectedMovies}
            onSelectionChange={setSelectedMovies}
            minRequired={MIN_MOVIES}
          />
        );

      case "tv":
        return (
          <ContentSelectionStep
            type="tv"
            title="Select Your Favorite TV Shows"
            description={`Choose at least ${MIN_TV_SHOWS} TV shows that you enjoy. We'll use these to find similar content.`}
            selectedItems={selectedTvShows}
            onSelectionChange={setSelectedTvShows}
            minRequired={MIN_TV_SHOWS}
          />
        );

      case "people":
        return (
          <PeopleSelectionStep
            selectedPeople={selectedPeople}
            onSelectionChange={setSelectedPeople}
            onSkip={() => setCurrentStep(4)} // Skip to complete step
          />
        );

      case "complete":
        return (
          <WizardComplete
            movieCount={selectedMovies.length}
            tvCount={selectedTvShows.length}
            peopleCount={selectedPeople.length}
            onGetRecommendations={handleNext}
            isLoading={isSaving}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Setup Progress</h2>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {currentStep === 0 ? (
        <div className="space-y-6">
          {renderStep()}
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Get Started
            </button>
          </div>
        </div>
      ) : currentStep === steps.length - 1 ? (
        renderStep()
      ) : (
        <WizardStep
          title={steps[currentStep].title}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoNext={canGoNext()}
          canGoPrevious={currentStep > 0}
          isLastStep={currentStep === steps.length - 1}
          isLoading={isSaving}
        >
          {renderStep()}
        </WizardStep>
      )}
    </div>
  );
}