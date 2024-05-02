/**
 * Sanitizes the input string to prevent potential attacks.
 * @param {string} input - The input string to sanitize.
 * @returns {string} The sanitized input string.
 */
export function sanitizeInput(input: string): string {
    // Remove any HTML tags from the input
    const sanitizedInput = input.replace(/<[^>]*>/g, '');
  
    // Escape special characters to prevent injection attacks
    const escapedInput = sanitizedInput
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  
    return escapedInput;
  }
