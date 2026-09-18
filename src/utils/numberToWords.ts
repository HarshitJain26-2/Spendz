/**
 * Convert numeric amount to English words (Indian numbering system)
 * e.g., 500 -> "Five hundred rupees"
 * 1250 -> "One thousand two hundred fifty rupees"
 */

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

function convertBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const ten = TENS[Math.floor(n / 10)];
    const rem = ONES[n % 10];
    return rem ? `${ten} ${rem}` : ten;
  }
  const hundred = `${ONES[Math.floor(n / 100)]} hundred`;
  const rem = n % 100;
  if (!rem) return hundred;
  return `${hundred} ${convertBelowThousand(rem)}`;
}

export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero rupees';
  }

  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Zero rupees';

  const parts: string[] = [];

  const crores = Math.floor(num / 10000000);
  const remAfterCrore = num % 10000000;

  const lakhs = Math.floor(remAfterCrore / 100000);
  const remAfterLakh = remAfterCrore % 100000;

  const thousands = Math.floor(remAfterLakh / 1000);
  const remainder = remAfterLakh % 1000;

  if (crores > 0) {
    parts.push(`${convertBelowThousand(crores)} crore`);
  }
  if (lakhs > 0) {
    parts.push(`${convertBelowThousand(lakhs)} lakh`);
  }
  if (thousands > 0) {
    parts.push(`${convertBelowThousand(thousands)} thousand`);
  }
  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  const joined = parts.join(' ').trim();
  if (!joined) return 'Zero rupees';

  // Capitalize first letter and append "rupees"
  const capitalized = joined.charAt(0).toUpperCase() + joined.slice(1);
  return `${capitalized} rupees`;
}
