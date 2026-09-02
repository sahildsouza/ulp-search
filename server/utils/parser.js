import crypto from 'crypto';

// RFC 5322 compliant regex for strict email validation
export const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Pattern to search for email occurrences within mixed lines (e.g. URL:user@domain.com:pass)
export const EMAIL_EXTRACT_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

/**
 * Fast deterministic hash for unique row tracking and copy memory
 */
export function generateRowId(raw, file = '') {
  return crypto.createHash('sha256').update(`${file}:${raw}`).digest('hex').slice(0, 16);
}

/**
 * Smart Combo Line Parser Engine
 * Handles any delimiter (:, |, ;, ,, \t, space) and URL combo patterns.
 * 
 * Confidence Ratings:
 *  - GREEN: Clean RFC 5322 Email Match + Password
 *  - YELLOW: Fallback Delimiter Match (non-email username or phone) + Password
 *  - RED: Unstructured line / parser inaccuracy / missing password
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
    // Pick the most plausible email match (usually the last or only one in combo)
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
            confidence: 'GREEN',
            file: filename,
            domain: domain,
            timestamp: Date.now()
          };
        }
      }
    }
  }

  // Strategy 2: Fallback Delimiter Match for Non-Email Usernames
  // Common delimiters: ':', '|', ';', '\t', ','
  // Strip URL scheme if present (e.g. http://site.com/login:admin:pass -> admin:pass)
  let cleanLine = raw;
  let urlPrefixDomain = '';

  const urlMatch = raw.match(/^(?:https?:\/\/[^\/:]+(?::\d+)?(?:\/[^:]*)?[:|;,\t ])/i);
  if (urlMatch) {
    const matchedUrl = urlMatch[0];
    const domainMatch = matchedUrl.match(/https?:\/\/([^\/:]+)/i);
    if (domainMatch) {
      urlPrefixDomain = domainMatch[1].toLowerCase().replace(/^www\./, '');
    }
    cleanLine = raw.slice(matchedUrl.length).trim();
  }

  const delimiters = [':', '|', ';', '\t', ','];
  for (const delim of delimiters) {
    if (cleanLine.includes(delim)) {
      const parts = cleanLine.split(delim);
      if (parts.length >= 2) {
        // user is the first part, pass is the remaining joined or second part
        const userCandidate = parts[0].trim();
        const passCandidate = parts.slice(1).join(delim).trim();

        if (userCandidate.length >= 2 && passCandidate.length > 0) {
          // Check if candidate happens to be valid email
          const isEmail = RFC5322_EMAIL_REGEX.test(userCandidate);
          const domain = isEmail 
            ? userCandidate.split('@')[1]?.toLowerCase() 
            : (urlPrefixDomain || 'non-email');

          return {
            id: rowId,
            userOrEmail: userCandidate,
            pass: passCandidate,
            raw: raw,
            confidence: isEmail ? 'GREEN' : 'YELLOW',
            file: filename,
            domain: domain,
            timestamp: Date.now()
          };
        }
      }
    }
  }

  // Strategy 3: Space separated fallback
  const spaceParts = raw.split(/\s+/);
  if (spaceParts.length === 2 && spaceParts[0].length >= 2 && spaceParts[1].length > 0) {
    const isEmail = RFC5322_EMAIL_REGEX.test(spaceParts[0]);
    return {
      id: rowId,
      userOrEmail: spaceParts[0],
      pass: spaceParts[1],
      raw: raw,
      confidence: isEmail ? 'GREEN' : 'YELLOW',
      file: filename,
      domain: isEmail ? spaceParts[0].split('@')[1]?.toLowerCase() : (urlPrefixDomain || 'non-email'),
      timestamp: Date.now()
    };
  }

  // Strategy 4: Unstructured Line (RED confidence)
  return {
    id: rowId,
    userOrEmail: raw,
    pass: '',
    raw: raw,
    confidence: 'RED',
    file: filename,
    domain: 'unstructured',
    timestamp: Date.now()
  };
}
