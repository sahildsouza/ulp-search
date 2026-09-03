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
 * Checks if a string is a domain/host, IP, or Android app package name
 * e.g. com.cpplusworld.ezykamp, cpplusworld.ezykamp.com, netflix.com, 192.168.1.1
 */
export function isHostOrPackage(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().toLowerCase();
  const withoutProto = s.replace(/^[a-z0-9+.-]+:\/\//i, '');
  if (withoutProto.includes(' ') || withoutProto.includes('@')) return false;
  const hostOnly = withoutProto.replace(/:\d{1,5}$/, '');
  return /^(?:[a-z0-9-_]+\.)+[a-z0-9-_]{2,}$/i.test(hostOnly) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostOnly);
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
          let domain = emailStr.split('@')[1]?.toLowerCase() || '';

          // If there is a domain/URL prefix before the email (e.g. example.com:email:pass or https://example.com/login:email:pass)
          if (emailIndex > 0) {
            const beforeEmail = raw.slice(0, emailIndex).trim();
            const prefixClean = beforeEmail.replace(/[:|;,\t ]+$/, '').trim();
            const protoMatch = prefixClean.match(/^[a-zA-Z0-9+.-]+:\/\/(?:www\.)?([^\/:]+)/i);
            if (protoMatch) {
              domain = protoMatch[1].toLowerCase();
            } else if (isHostOrPackage(prefixClean)) {
              domain = prefixClean.toLowerCase();
            } else {
              const hostInPrefix = prefixClean.split('/')[0].split(':')[0];
              if (isHostOrPackage(hostInPrefix)) {
                domain = hostInPrefix.toLowerCase();
              }
            }
          }

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

  // Strategy 2: URL, Package & Delimiter Matching for Non-Email (Mobile:Pass, User:Pass)
  let cleanLine = raw;
  let urlPrefixDomain = '';

  // Strip protocol URLs: https://..., http://..., android://... (limiting port to 5 digits so 10-digit phones aren't stripped)
  const protocolMatch = cleanLine.match(/^[a-zA-Z0-9+.-]+:\/\/[^\/:\s]+(?::\d{1,5})?(?:\/[^:|\t;, ]*)?[:|;,\t ]/i);
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

        // Check 3+ part lines like host:port:user:pass or package:mobile:pass or host:mobile:pass
        if (parts.length >= 4 && isHostOrPackage(parts[0]) && /^\d{1,5}$/.test(parts[1])) {
          domain = parts[0].toLowerCase();
          userCandidate = parts[2].trim();
          passCandidate = parts.slice(3).join(delim).trim();
        } else if (parts.length >= 3 && (isHostOrPackage(parts[0]) || isMobileNumber(parts[1]) || RFC5322_EMAIL_REGEX.test(parts[1]))) {
          domain = parts[0].toLowerCase();
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
