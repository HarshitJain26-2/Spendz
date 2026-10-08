/**
 * Utility functions for Spendz Group Invites (Invite codes & QR payloads)
 */

// Safe alphanumeric character set without ambiguous characters (no 0, O, 1, I)
const SAFE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const SPENDZ_INVITE_PREFIX = 'spendz://group-invite/';

/**
 * Generates an easy-to-type, uppercase invite code for a group.
 * Example: "Goa Trip" -> "GT-7K4P9X"
 *
 * @param groupName Optional group name to derive a meaningful 2-letter prefix from
 * @returns Formatted invite code like "GT-7K4P9X"
 */
export function generateInviteCode(groupName?: string): string {
  let prefix = 'GP';

  if (groupName) {
    const words = groupName
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
      .filter(Boolean);

    if (words.length >= 2 && words[0].length > 0 && words[1].length > 0) {
      prefix = `${words[0][0]}${words[1][0]}`;
    } else if (words.length === 1 && words[0].length >= 2) {
      prefix = words[0].slice(0, 2);
    } else if (words.length === 1 && words[0].length === 1) {
      prefix = `${words[0]}X`;
    }
  }

  // Generate 6 random characters from SAFE_CHARS
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
    randomPart += SAFE_CHARS[randomIndex];
  }

  return `${prefix}-${randomPart}`;
}

/**
 * Builds the secure deep-link QR payload for a Spendz group invite.
 * Does NOT include sensitive passwords, user IDs, or balances.
 * Example: "spendz://group-invite/GT-7K4P9X"
 */
export function createInvitePayload(code: string): string {
  const sanitized = code.trim().toUpperCase();
  return `${SPENDZ_INVITE_PREFIX}${sanitized}`;
}

/**
 * Validates whether a raw string or QR code scan matches a Spendz group invite.
 * Safely handles:
 * - Direct invite codes: "GT-7K4P9X", "GP-4M8P2A"
 * - Deep links: "spendz://group-invite/GT-7K4P9X"
 * - Deep links with query params: "spendz://groups/join?code=GT-7K4P9X", "spendz://group-invite?code=GT-7K4P9X"
 * - Web URLs: "https://spendz.app/groups/join?code=GT-7K4P9X"
 *
 * Returns the normalized uppercase invite code if valid, or null if invalid.
 */
export function parseInviteCodeFromUrlOrInput(input: string): string | null {
  const result = parseGroupInvitePayload(input);
  return result ? result.code : null;
}

/**
 * Standardized parser for Spendz Group Invite QR payloads and codes.
 * Returns { code: string } if valid, or null if invalid or unrelated.
 */
export function parseGroupInvitePayload(input: string): { code: string } | null {
  if (!input || typeof input !== 'string') return null;
  let trimmed = input.trim();

  try {
    trimmed = decodeURIComponent(trimmed).trim();
  } catch {
    // If decoding fails, keep raw trimmed
  }

  // Pattern for valid invite codes: 2-4 uppercase alphanumeric prefix, hyphen, 4-8 uppercase chars
  const codeRegex = /^[A-Z0-9]{2,4}-[A-Z0-9]{4,8}$/i;

  // 1. Direct code input (e.g. "GT-7K4P9X")
  if (codeRegex.test(trimmed)) {
    return { code: trimmed.toUpperCase() };
  }

  // 2. Direct simple QR prefix: SPENDZ_GROUP:<codeToken>
  if (trimmed.toUpperCase().startsWith('SPENDZ_GROUP:')) {
    const tokenPart = trimmed.slice('SPENDZ_GROUP:'.length).trim();
    if (codeRegex.test(tokenPart)) {
      return { code: tokenPart.toUpperCase() };
    }
  }

  // 3. Direct deep link: spendz://group-invite/<codeToken>
  if (trimmed.toLowerCase().startsWith('spendz://group-invite/')) {
    const tokenPart = trimmed.slice('spendz://group-invite/'.length).split(/[?#]/)[0].trim();
    if (codeRegex.test(tokenPart)) {
      return { code: tokenPart.toUpperCase() };
    }
  }

  // 3. Query string deep link or web link
  if (
    trimmed.toLowerCase().startsWith('spendz://') ||
    trimmed.toLowerCase().startsWith('http://') ||
    trimmed.toLowerCase().startsWith('https://')
  ) {
    try {
      const normalizedUrl = trimmed.toLowerCase().startsWith('spendz://')
        ? trimmed.replace(/^spendz:\/\//i, 'https://spendz.app/')
        : trimmed;

      const urlObj = new URL(normalizedUrl);
      const codeParam = urlObj.searchParams.get('code');
      if (codeParam && codeRegex.test(codeParam.trim())) {
        return { code: codeParam.trim().toUpperCase() };
      }

      // Check pathname components (e.g. /group-invite/GT-7K4P9X)
      if (urlObj.pathname.toLowerCase().includes('/group-invite/')) {
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && codeRegex.test(lastSegment)) {
          return { code: lastSegment.toUpperCase() };
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  return null;
}

