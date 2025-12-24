import { useState, useCallback } from "react";
import { ContentSearchDialog } from "@/components/preferences/content-search-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Film, Tv } from "lucide-react";
import { PreferenceItem } from "@/components/preferences/preference-item";
import { toast } from "sonner";

interface ContentSelectionStepProps {
  type: "movie" | "tv";
  title: string;
  description: string;
  selectedItems: any[];
  onSelectionChange: (items: any[]) => void;
  minRequired: number;
}

export function ContentSelectionStep({
  type,
  selectedItems,
  onSelectionChange,
  minRequired,
}: ContentSelectionStepProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleContentSelected = useCallback(
    (content: any) => {
      const exists = selectedItems.some((item) => item.id === content.id);
      if (!exists) {
        onSelectionChange([...selectedItems, content]);
        toast.success(`${content.title || content.name} has been added.`);
      } else {
        toast.info("Already in your selections.");
      }
    },
    [selectedItems, onSelectionChange]
  );

  const handleRemoveItem = useCallback(
    (id: number) => {
      onSelectionChange(selectedItems.filter((item) => item.id !== id));
      toast.info("Item has been removed.");
    },
    [selectedItems, onSelectionChange]
  );

  const hasMinimum = selectedItems.length >= minRequired;
  const progress = Math.min((selectedItems.length / minRequired) * 100, 100);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            Selected {selectedItems.length} of {minRequired} required
          </p>
          <Badge variant={hasMinimum ? "default" : "secondary"}>
            {hasMinimum
              ? "✓ Requirement met"
              : `Need ${minRequired - selectedItems.length} more`}
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={() => setIsSearchOpen(true)}
          variant="outline"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add {type === "movie" ? "Movies" : "TV Shows"}
        </Button>
      </div>

      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {selectedItems.map((item) => (
            <div key={item.id}>
              <PreferenceItem
                item={item}
                onRemove={() => handleRemoveItem(item.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              {type === "movie" ? (
                <Film className="h-12 w-12 mx-auto mb-3" />
              ) : (
                <Tv className="h-12 w-12 mx-auto mb-3" />
              )}
              <p>No {type === "movie" ? "movies" : "TV shows"} selected yet</p>
              <p className="text-sm">
                Click the button above to add your favorites
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <ContentSearchDialog
        key={type}
        open={isSearchOpen}
        restrictedMode={true}
        onOpenChange={setIsSearchOpen}
        searchType={type}
        onContentSelected={handleContentSelected}
        existingIds={new Set(selectedItems.map((item) => item.id))}
      />
    </div>
  );
}
