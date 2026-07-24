import { createContext, useContext } from "react";
import { usePreferences } from "./use-preferences";

/**
 * Shared preferences store + Add-dialog controls for the whole /preferences
 * section.
 *
 * `usePreferences` holds local React state, so calling it in both the shell
 * and a child page yields two disconnected stores. The layout route's shell
 * owns the single store (and the Add dialog) and exposes it here; every child
 * page consumes the same instance so an Add/Remove anywhere updates
 * everywhere, and any page can open the Add dialog with a specific type.
 */
export interface PreferencesContextValue extends ReturnType<
  typeof usePreferences
> {
  /** Open the shell's Add dialog pre-set to a content type. */
  openAdd: (type?: "movie" | "tv" | "person") => void;
}

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
