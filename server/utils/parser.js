import crypto from 'crypto';

// RFC 5322 compliant regex for strict email validation
export const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Pattern to search for email occurrences within mixed lines (e.g. URL:user@domain.com:pass)
export const EMAIL_EXTRACT_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

/**
 * Checks if a string is a phone/mobile number (E.164 or national phone format)
 * e.g. +19175551234, +919876543210, 9876543210, 07123456789, +447911123456
 */
export function isMobileNumber(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  const digitsOnly = trimmed.replace(/[\s\-\(\)\.]/g, '');
  // Must be between 7 and 15 digits (ITU-T E.164 max is 15 digits, min national phone is 7 digits)
  return /^\+?\d{7,15}$/.test(digitsOnly);
}

/**
 * Fast deterministic hash for unique row tracking and copy memory
 */
export function generateRowId(raw, file = '') {
  return crypto.createHash('sha256').update(`${file}:${raw}`).digest('hex').slice(0, 16);
}

/**
 * Classifies a user candidate into EP (Email:Pass), MP (Mobile:Pass), or UP (Username:Pass)
 */
function classifyCandidate(userCandidate) {
  if (RFC5322_EMAIL_REGEX.test(userCandidate)) {
    return 'EP';
  }
  if (isMobileNumber(userCandidate)) {
    return 'MP';
  }
  return 'UP';
}

/**
 * Smart Combo Line Parser Engine
 * Accurately classifies lines into:
 *  - EP: Email:Password (RFC 5322 Email + Password)
 *  - UP: Username:Password (Alphanumeric username + Password)
 *  - MP: Mobile:Password (Phone number + Password)
 *  - UK: Unknown / Malformed line
 * 
 * @param {string} rawLine - Raw log line
 * @param {string} filename - Associated source log filename
 * @returns {object|null} Parsed combo object
 */
export function parseComboLine(rawLine, filename = 'unknown.txt') {
  if (!rawLine || typeof rawLine !== 'string') return null;
  const raw = rawLine.trim();
  if (raw.length === 0) return null;

  const rowId = generateRowId(raw, filename);

  // Strategy 1: Check for Email in line (RFC 5322 Search)
  const emailMatches = [...raw.matchAll(EMAIL_EXTRACT_REGEX)];
  if (emailMatches.length > 0) {
    const emailMatch = emailMatches[emailMatches.length - 1];
    const emailStr = emailMatch[0];
    const emailIndex = emailMatch.index;

    // Check delimiter immediately following the email
    const afterEmail = raw.slice(emailIndex + emailStr.length);
    if (afterEmail.length > 0) {
      const delimiter = afterEmail[0];
      if ([':', '|', ';', ',', '\t', ' '].includes(delimiter)) {
        const pass = afterEmail.slice(1).trim();
        if (pass.length > 0 && RFC5322_EMAIL_REGEX.test(emailStr)) {
          const domain = emailStr.split('@')[1]?.toLowerCase() || '';
          return {
            id: rowId,
            userOrEmail: emailStr,
            pass: pass,
            raw: raw,
            confidence: 'EP',
            type: 'EP',
            file: filename,
            domain: domain,
            timestamp: Date.now()
          };
        }
      }
    }
  }

  // Strategy 2: URL & Delimiter Matching for Non-Email (User:Pass, Mobile:Pass)
  let cleanLine = raw;
  let urlPrefixDomain = '';

  // Strip protocol URLs: https://..., http://..., android://...
  const protocolMatch = cleanLine.match(/^[a-zA-Z0-9+.-]+:\/\/[^\/:\s]+(?::\d+)?(?:\/[^:|\t;, ]*)?[:|;,\t ]/i);
  if (protocolMatch) {
    const matchedUrl = protocolMatch[0];
    const hostMatch = matchedUrl.match(/:\/\/(?:www\.)?([^\/:]+)/i);
    if (hostMatch) urlPrefixDomain = hostMatch[1].toLowerCase();
    cleanLine = cleanLine.slice(matchedUrl.length).trim();
  }

  const delimiters = [':', '|', ';', '\t', ','];
  for (const delim of delimiters) {
    if (cleanLine.includes(delim)) {
      const parts = cleanLine.split(delim);
      if (parts.length >= 2) {
        let userCandidate = '';
        let passCandidate = '';
        let domain = urlPrefixDomain;

        // Check if parts[0] is a domain/host or IP without protocol (e.g. site.com:user:pass)
        const isHost = /(?:^[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d+)?$/.test(parts[0]) || 
                      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/.test(parts[0]);

        if (isHost && parts.length >= 3) {
          domain = parts[0].split(':')[0].toLowerCase();
          userCandidate = parts[1].trim();
          passCandidate = parts.slice(2).join(delim).trim();
        } else {
          userCandidate = parts[0].trim();
          passCandidate = parts.slice(1).join(delim).trim();
        }

        if (userCandidate.length >= 1 && passCandidate.length > 0) {
          const conf = classifyCandidate(userCandidate);
          if (conf === 'EP') {
            domain = userCandidate.split('@')[1]?.toLowerCase() || domain || 'email';
          } else if (conf === 'MP') {
            domain = domain || 'mobile';
          } else {
            domain = domain || 'username';
          }

          return {
            id: rowId,
            userOrEmail: userCandidate,
            pass: passCandidate,
            raw: raw,
            confidence: conf,
            type: conf,
            file: filename,
            domain: domain,
            timestamp: Date.now()
          };
        }
      }
    }
  }

  // Strategy 3: Space-separated fallback (e.g. "user pass" or "9876543210 pass")
  const spaceParts = raw.split(/\s+/);
  if (spaceParts.length === 2 && spaceParts[0].length >= 1 && spaceParts[1].length > 0) {
    const conf = classifyCandidate(spaceParts[0]);
    return {
      id: rowId,
      userOrEmail: spaceParts[0],
      pass: spaceParts[1],
      raw: raw,
      confidence: conf,
      type: conf,
      file: filename,
      domain: conf === 'EP' ? spaceParts[0].split('@')[1]?.toLowerCase() : (urlPrefixDomain || (conf === 'MP' ? 'mobile' : 'username')),
      timestamp: Date.now()
    };
  }

  // Strategy 4: Unknown / Unstructured Line (UK)
  return {
    id: rowId,
    userOrEmail: raw,
    pass: '',
    raw: raw,
    confidence: 'UK',
    type: 'UK',
    file: filename,
    domain: 'unstructured',
    timestamp: Date.now()
  };
}
