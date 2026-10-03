/**
 * Formats authentication error messages for friendly, non-exposing user UI display.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = error.message?.toLowerCase() || '';
  const status = error.status;

  if (message.includes('network') || message.includes('failed to fetch') || message.includes('connection')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials') ||
    message.includes('wrong password') ||
    message.includes('user not found')
  ) {
    return 'Email or password is incorrect.';
  }

  if (message.includes('user already registered') || message.includes('already exists')) {
    return 'An account with this email already exists.';
  }

  if (message.includes('password should be at least') || message.includes('weak password')) {
    return 'Password must be at least 6 characters long.';
  }

  if (message.includes('rate limit') || status === 429) {
    return 'Too many attempts. Please wait a few moments and try again.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }

  if (message.includes('invalid email') || message.includes('unable to validate email')) {
    return 'Enter a valid email address.';
  }

  return error.message || 'Something went wrong. Please try again.';
}
