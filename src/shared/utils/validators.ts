import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

// ─── Email ────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/**
 * Disposable/temporary email domains that are blocked.
 * Mirrors the backend list — keeps client-side feedback instant.
 */
const TEMP_DOMAINS = new Set([
  'mailinator.com', 'mailinator2.com', 'trashmail.com', 'trashmail.at',
  'trashmail.io', 'trashmail.me', 'trashmail.net', 'trashmail.org',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'grr.la', 'spam4.me',
  'tempmail.com', 'tempmail.net', 'tempmail.org', 'tempmail.de',
  'temp-mail.org', 'temp-mail.io', 'temp-mail.ru',
  'tempr.email', 'tempemail.com', 'tempemail.net',
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  '10minutemail.de', '10minutemail.nl', '10minemail.com',
  '20minutemail.com', '20minutemail.it',
  '33mail.com', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'yopmail.com', 'yopmail.fr',
  'sharklasers.com', 'spam4.me',
  'maildrop.cc', 'spamoff.de', 'spam.la',
  'throwam.com', 'throam.com', 'throwaway.email', 'discard.email',
  'fakeinbox.com', 'fakeinbox.net', 'fakemail.fr', 'fakemail.net',
  'fakemail.store', 'spoofmail.de', 'spambox.us', 'spambox.info',
  'burnermail.io', 'burnthespam.info', 'byom.de',
  'dispostable.com', 'disposableaddress.com', 'disposablemail.com',
  'getairmail.com', 'getnada.com', 'mailnull.com',
  'mailnesia.com', 'mailscrap.com',
  'harakirimail.com', 'jetable.com', 'jetable.net', 'jetable.org',
  'mohmal.com', 'mailpoof.com',
  'tempinbox.com', 'tempomail.fr', 'temporaryemail.com',
  'temporaryemail.net', 'temporaryinbox.com',
]);

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Client-side email validation (format + disposable domain check).
 * Does NOT do MX lookup (that's server-side only).
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateEmail(raw: string | undefined | null): EmailValidationResult {
  if (!raw || raw.trim() === '') return { valid: true }; // optional field

  const email = raw.toLowerCase().trim();

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'El formato del email no es válido' };
  }

  const domain = email.split('@')[1];
  if (TEMP_DOMAINS.has(domain)) {
    return { valid: false, error: 'No se permiten emails de dominios temporales o descartables' };
  }

  return { valid: true };
}

// ─── Phone ────────────────────────────────────────────────────

const DEFAULT_COUNTRY: CountryCode = 'AR';

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes a phone number.
 * Accepts international format or national numbers (default: AR).
 * Returns the E.164 normalized number on success.
 */
export function validatePhone(raw: string | undefined | null): PhoneValidationResult {
  if (!raw || raw.trim() === '') return { valid: true }; // optional field

  const trimmed = raw.trim();

  try {
    if (!isValidPhoneNumber(trimmed, DEFAULT_COUNTRY)) {
      return {
        valid: false,
        error: 'Número de teléfono inválido. Usá formato +54 9 11 1234-5678 o 011 1234-5678',
      };
    }
    const parsed = parsePhoneNumber(trimmed, DEFAULT_COUNTRY);
    return { valid: true, normalized: parsed.format('E.164') };
  } catch {
    return {
      valid: false,
      error: 'Número de teléfono inválido. Usá formato +54 9 11 1234-5678 o 011 1234-5678',
    };
  }
}

/**
 * Convenience: returns error string or undefined (compatible with react-hook-form validate fns).
 */
export const emailValidatorRHF = (value: string | undefined) => {
  const result = validateEmail(value);
  return result.valid ? undefined : result.error;
};

export const phoneValidatorRHF = (value: string | undefined) => {
  const result = validatePhone(value);
  return result.valid ? undefined : result.error;
};
