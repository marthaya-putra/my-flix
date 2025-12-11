import { useState, useCallback } from "react";
import { ContentSearchDialog } from "@/components/preferences/content-search-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Plus, X, SkipForward } from "lucide-react";
import { PreferenceItem } from "@/components/preferences/preference-item";
import { toast } from "sonner";

interface PeopleSelectionStepProps {
  selectedPeople: any[];
  onSelectionChange: (people: any[]) => void;
  onSkip: () => void;
}

export function PeopleSelectionStep({
  selectedPeople,
  onSelectionChange,
  onSkip,
}: PeopleSelectionStepProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handlePersonSelected = useCallback(
    (person: any) => {
      const exists = selectedPeople.some((item) => item.id === person.id);
      if (!exists) {
        onSelectionChange([...selectedPeople, person]);
        toast.success(`${person.name} has been added.`);
      } else {
        toast.info("Already in your selections.");
      }
    },
    [selectedPeople, onSelectionChange]
  );

  const handleRemovePerson = useCallback(
    (id: number) => {
      onSelectionChange(selectedPeople.filter((person) => person.id !== id));
      toast.info("Person has been removed.");
    },
    [selectedPeople, onSelectionChange]
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Users className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-semibold">
          Add Your Favorite People (Optional)
        </h3>
        <p className="text-muted-foreground">
          Select actors and directors you love to get even better
          recommendations
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <Button
          onClick={() => setIsSearchOpen(true)}
          variant="outline"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Actors & Directors
        </Button>
        <Button variant="ghost" onClick={onSkip} className="gap-2">
          Skip this step
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {selectedPeople.length > 0 ? (
        <div className="pt-6">
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Selected {selectedPeople.length}{" "}
                {selectedPeople.length === 1 ? "person" : "people"}
              </p>
              <Badge variant="secondary">Optional</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedPeople.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <PreferenceItem
                  item={person}
                  onRemove={() => handleRemovePerson(person.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3" />
              <p>No actors or directors selected</p>
              <p className="text-sm">
                This step is optional - you can skip if you prefer
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
        <p>
          Adding your favorite actors and directors helps our AI understand your
          taste better, but it's completely optional. You can always add them
          later in your preferences.
        </p>
      </div>

      <ContentSearchDialog
        restrictedMode={true}
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        searchType="person"
        onContentSelected={handlePersonSelected}
      />
    </div>
  );
}
