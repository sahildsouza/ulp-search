import fs from 'fs';
import path from 'path';

const mockDir = path.resolve('mock_logs');
if (!fs.existsSync(mockDir)) {
  fs.mkdirSync(mockDir, { recursive: true });
}

const domains = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'proton.me', 'aol.com', 'zoho.com', 'mail.ru', 'gmx.de',
  'cyberdyne.systems', 'spacex.com', 'github.com', 'netflix.com', 'meta.com',
  'amazon.com', 'uber.com', 'spotify.com', 'stripe.com', 'openai.com',
  'fintech.io', 'gov.uk', 'telecom.fr', 't-online.de', 'bank.br'
];

const firstNames = [
  'alex', 'sarah', 'john', 'emma', 'michael', 'jessica', 'david', 'olivia',
  'james', 'sophia', 'daniel', 'isabella', 'robert', 'mia', 'william', 'charlotte'
];

const lastNames = [
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
  'rodriguez', 'martinez', 'wilson', 'anderson', 'taylor', 'thomas', 'moore'
];

const passwords = [
  'SecretPass123!', 'Welcome2026#', 'Tr0ub4dor&3', 'CorrectHorseBatteryStaple',
  'Admin#8899', 'WinterIsComing!', 'DragonBallZ1999', 'LetMeIn2025$', 'ShadowHunter99',
  'QuantumLeap2026', 'P@ssw0rd1', 'AlphaBetaGammaDelta!', 'CyberSecurity#1'
];

const fallbackUsernames = [
  'root', 'admin', 'administrator', 'sysadmin', 'operator', 'dark_knight',
  'shadow_runner', 'cyber_punk_88', 'terminal_zero', 'phoenix_one'
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLine() {
  const roll = Math.random();

  // 75% RFC 5322 Clean Email (GREEN)
  if (roll < 0.75) {
    const fn = getRandom(firstNames);
    const ln = getRandom(lastNames);
    const num = Math.floor(Math.random() * 999);
    const domain = getRandom(domains);
    const email = `${fn}.${ln}${num > 500 ? num : ''}@${domain}`;
    const pass = getRandom(passwords);

    // Varied formats
    const subRoll = Math.random();
    if (subRoll < 0.6) {
      return `${email}:${pass}`;
    } else if (subRoll < 0.8) {
      return `https://${domain}/login:${email}:${pass}`;
    } else if (subRoll < 0.9) {
      return `${email}|${pass}`;
    } else {
      return `${email};${pass}`;
    }
  }

  // 18% Fallback Delimiter Match (YELLOW)
  if (roll < 0.93) {
    const user = getRandom(fallbackUsernames) + (Math.random() > 0.5 ? Math.floor(Math.random() * 100) : '');
    const pass = getRandom(passwords);
    const delim = getRandom([':', '|', ';', ',']);
    return `${user}${delim}${pass}`;
  }

  // 7% Unstructured Line (RED)
  const garbage = [
    'INVALID_HEADER_TOKEN_0x88924A_CORRUPT',
    '--- SESSION LOG DUMP START 2026-09-02 ---',
    'connection_reset_by_peer_127.0.0.1:443',
    'single_unmatched_token_without_password_key',
    'DEBUG [AuthService] token verification failed for session_992'
  ];
  return getRandom(garbage);
}

export function generateMockLogs(fileConfigs = [
  { name: 'combo_log_1.txt', lines: 15000 },
  { name: 'db_dump.txt', lines: 10000 },
  { name: 'mixed_leads_2026.txt', lines: 8000 }
]) {
  console.log(`Generating mock combo logs in ${mockDir}...`);

  for (const config of fileConfigs) {
    const filePath = path.join(mockDir, config.name);
    const writeStream = fs.createWriteStream(filePath, { flags: 'w' });

    for (let i = 0; i < config.lines; i++) {
      writeStream.write(generateLine() + '\n');
    }
    writeStream.end();
    console.log(`Created ${config.name} with ${config.lines} lines.`);
  }
}

// Run directly if invoked
if (process.argv[1]?.endsWith('generate_mock_data.js')) {
  generateMockLogs();
}
