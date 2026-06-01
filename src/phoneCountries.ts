/** Country dial codes supported during signup / OTP confirmation */
export const COUNTRY_CODES = [
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States / Canada", flag: "🇺🇸" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+971", country: "U.A.E.", flag: "🇦🇪" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
] as const;

export function normalizePhoneBody(prefix: string, raw: string): string {
  let body = raw.replace(/\s+/g, "");
  if (prefix === "+44" && body.startsWith("0")) {
    body = body.slice(1);
  }
  return body;
}

export function formatPhoneE164(prefix: string, raw: string): string {
  return `${prefix}${normalizePhoneBody(prefix, raw)}`;
}

export function validatePhoneForConfirmation(prefix: string, raw: string): string | null {
  const body = normalizePhoneBody(prefix, raw);

  if (!body) {
    return "Please enter your phone number.";
  }

  if (prefix === "+44") {
    if (!/^\d{10}$/.test(body)) {
      return "Enter a valid UK mobile number (10 digits).";
    }
    return null;
  }

  if (prefix === "+1") {
    if (!/^\d{10}$/.test(body)) {
      return "Enter a valid 10-digit phone number.";
    }
    return null;
  }

  if (!/^\d{6,14}$/.test(body)) {
    return "Enter a valid phone number for the selected country.";
  }

  return null;
}

export function phonePlaceholder(prefix: string): string {
  if (prefix === "+44") return "7911123456";
  if (prefix === "+1") return "5551234567";
  return "Enter your number";
}
