import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WizardStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  onNextText?: string;
  onPreviousText?: string;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastStep?: boolean;
  isLoading?: boolean;
}

export function WizardStep({
  title,
  description,
  children,
  onNext,
  onPrevious,
  onNextText = "Next",
  onPreviousText = "Previous",
  canGoNext = true,
  canGoPrevious = true,
  isLastStep = false,
  isLoading = false,
}: WizardStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious || isLoading}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {onPreviousText}
          </Button>

          <Button
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            className="gap-2"
          >
            {isLoading ? "Saving..." : isLastStep ? "Get Recommendations" : onNextText}
            {!isLoading && !isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}