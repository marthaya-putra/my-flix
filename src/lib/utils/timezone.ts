export const getUserTimezone = (): string => {
  // Auto-detect user's timezone using browser's native API
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};