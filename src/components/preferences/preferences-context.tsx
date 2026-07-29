import { createContext, useContext } from "react";
import { usePreferences } from "@/hooks/use-preferences";

/**
 * Shared preferences store + Add-dialog controls for the whole /preferences
 * section.
 *
 * `usePreferences` reads TanStack Query's cache (single source of truth for
 * the domain — Issue #80 / CODING_STANDARDS.md §8), so the hook instance is
 * effectively stateless: every caller sees the same cache regardless of where
 * it's called. The layout route's shell owns the Add dialog and exposes the
 * hook here so any child page can open that dialog with a specific type.
 */
export type PreferencesContextValue = ReturnType<typeof usePreferences> & {
  /** Open the shell's Add dialog pre-set to a content type. */
  openAdd: (type?: "movie" | "tv" | "person") => void;
};

export const PreferencesContext = createContext<PreferencesContextValue | null>(
  null,
);

export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error(
      "usePreferencesContext must be used within <PreferencesShell>",
    );
  }
  return ctx;
}
