/**
 * generate_mock_data.js
 * Generates a mock ULP combo dataset in ~/logs/ for testing and development.
 * Referenced by start.sh and package.json "generate:logs" script.
 *
 * Usage: node generate_mock_data.js [lineCount]
 *   lineCount: Number of combo lines to generate (default: 20000)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const LINE_COUNT = parseInt(process.argv[2] || '20000', 10);
const LOGS_DIR = path.join(os.homedir(), 'logs');

// Sample data pools
const FIRST_NAMES = [
  'james', 'mary', 'john', 'patricia', 'robert', 'jennifer', 'michael', 'linda',
  'david', 'elizabeth', 'william', 'barbara', 'richard', 'susan', 'joseph', 'jessica',
  'thomas', 'sarah', 'christopher', 'karen', 'charles', 'lisa', 'daniel', 'nancy',
  'alex', 'emily', 'brian', 'ashley', 'kevin', 'amanda', 'mark', 'stephanie',
  'steven', 'nicole', 'paul', 'rebecca', 'andrew', 'laura', 'joshua', 'megan'
];

const LAST_NAMES = [
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
  'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson',
  'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'thompson',
  'white', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker'
];

const EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
  'protonmail.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com',
  'live.com', 'msn.com', 'inbox.com', 'fastmail.com', 'tutanota.com'
];

const SITE_DOMAINS = [
  'netflix.com', 'spotify.com', 'amazon.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'linkedin.com', 'reddit.com', 'twitch.tv', 'discord.com',
  'github.com', 'dropbox.com', 'adobe.com', 'paypal.com', 'ebay.com',
  'walmart.com', 'target.com', 'bestbuy.com', 'apple.com', 'microsoft.com',
  'zoom.us', 'slack.com', 'notion.so', 'figma.com', 'canva.com',
  'hulu.com', 'disneyplus.com', 'hbo.com', 'peacock.com', 'paramount.com'
];

const ANDROID_PACKAGES = [
  'com.whatsapp', 'com.instagram.android', 'com.facebook.katana',
  'com.spotify.music', 'com.twitter.android', 'com.snapchat.android',
  'com.tiktok.app', 'com.netflix.mediaclient', 'com.amazon.mShop.android',
  'com.google.android.youtube'
];

const PASSWORD_PATTERNS = [
  // Weak passwords
  () => pick(['123456', 'password', 'qwerty', '12345678', 'abc123', 'monkey',
    'letmein', 'dragon', 'iloveyou', 'trustno1', 'sunshine', 'master',
    'welcome', 'shadow', 'ashley', 'football', 'michael', 'ninja']),
  // Medium passwords (word + digits)
  () => `${pick(FIRST_NAMES)}${randInt(100, 9999)}`,
  // Medium passwords (word + special + digits)
  () => `${capitalize(pick(FIRST_NAMES))}${pick(['!', '@', '#', '$', '*'])}${randInt(10, 999)}`,
  // Strong passwords (mixed case + special + digits)
  () => `${capitalize(pick(LAST_NAMES))}${pick(['!', '@', '#', '$', '&'])}${randInt(1000, 99999)}${pick(['a', 'b', 'x', 'z'])}`,
  // Random hex
  () => crypto.randomBytes(randInt(4, 10)).toString('hex'),
  // Random base64 (short)
  () => crypto.randomBytes(randInt(6, 12)).toString('base64').replace(/[=+/]/g, ''),
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateEmail() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const domain = pick(EMAIL_DOMAINS);
  const sep = pick(['.', '_', '', `${randInt(1, 99)}`]);
  return `${first}${sep}${last}@${domain}`;
}

function generatePhone() {
  const prefixes = ['+1', '+44', '+91', '+61', '+81', '+49', '+33', '+55', '+86', ''];
  const prefix = pick(prefixes);
  const digits = prefix ? randInt(7, 10) : 10;
  let number = '';
  for (let i = 0; i < digits; i++) {
    number += String(randInt(0, 9));
  }
  return `${prefix}${number}`;
}

function generateUsername() {
  const first = pick(FIRST_NAMES);
  const patterns = [
    () => `${first}${randInt(1, 9999)}`,
    () => `${first}_${pick(LAST_NAMES)}`,
    () => `${first}${pick(['gamer', 'pro', 'dev', 'user', 'admin', 'test'])}`,
    () => `x${first}x`,
    () => first,
  ];
  return pick(patterns)();
}

function generatePassword() {
  return pick(PASSWORD_PATTERNS)();
}

function generateLine() {
  const r = Math.random();
  const password = generatePassword();

  if (r < 0.45) {
    // EP: Email:Password (45%)
    const email = generateEmail();
    const patterns = [
      () => `${email}:${password}`,
      () => `${pick(SITE_DOMAINS)}:${email}:${password}`,
      () => `https://${pick(SITE_DOMAINS)}/login:${email}:${password}`,
    ];
    return pick(patterns)();
  } else if (r < 0.70) {
    // UP: Username:Password (25%)
    const username = generateUsername();
    const patterns = [
      () => `${username}:${password}`,
      () => `${pick(SITE_DOMAINS)}:${username}:${password}`,
    ];
    return pick(patterns)();
  } else if (r < 0.85) {
    // MP: Mobile:Password (15%)
    const phone = generatePhone();
    const patterns = [
      () => `${phone}:${password}`,
      () => `${pick(SITE_DOMAINS)}:${phone}:${password}`,
      () => `${pick(ANDROID_PACKAGES)}:${phone}:${password}`,
    ];
    return pick(patterns)();
  } else {
    // Mixed / Edge cases (15%)
    const patterns = [
      // URL with port
      () => `https://${pick(SITE_DOMAINS)}:${pick([443, 8080, 8443])}/${pick(['login', 'auth', 'signin'])}:${generateEmail()}:${password}`,
      // Pipe-delimited
      () => `${generateEmail()}|${password}`,
      // Semicolon-delimited
      () => `${generateUsername()};${password}`,
      // Space-delimited
      () => `${generateUsername()} ${password}`,
      // Android package format
      () => `${pick(ANDROID_PACKAGES)}:${generateEmail()}:${password}`,
    ];
    return pick(patterns)();
  }
}

// Main execution
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const LINES_PER_FILE = 10000;
const fileCount = Math.max(1, Math.ceil(LINE_COUNT / LINES_PER_FILE));

console.log(`Generating ${LINE_COUNT.toLocaleString()} mock combo lines across ${fileCount} file(s) in ${LOGS_DIR}...`);

let totalGenerated = 0;

for (let f = 0; f < fileCount; f++) {
  const linesInFile = Math.min(LINES_PER_FILE, LINE_COUNT - totalGenerated);
  const filename = `mock_combo_${String(f + 1).padStart(3, '0')}.txt`;
  const filePath = path.join(LOGS_DIR, filename);

  const lines = [];
  for (let i = 0; i < linesInFile; i++) {
    lines.push(generateLine());
  }

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
  totalGenerated += linesInFile;
  console.log(`  ✓ ${filename} (${linesInFile.toLocaleString()} lines)`);
}

console.log(`\nDone! Generated ${totalGenerated.toLocaleString()} combo lines in ${LOGS_DIR}`);
