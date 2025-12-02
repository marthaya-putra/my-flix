// User ID management utilities for development/demo purposes
// In production, this would be replaced with proper authentication

const USER_ID_KEY = 'myflix_user_id';

export function getUserId(): string {
  // Try to get existing user ID from localStorage
  if (typeof window !== 'undefined') {
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
      // Generate new user ID if none exists
      userId = generateUserId();
      localStorage.setItem(USER_ID_KEY, userId);
    }

    return userId;
  }

  // Fallback for server-side rendering
  return 'server-user-' + Math.random().toString(36).substr(2, 9);
}

function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function resetUserId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY);
  }
}