import { parseComboLine } from '../utils/parser.js';

console.log('--- Testing Smart Combo Line Parser ---');

const testCases = [
  {
    line: 'alex.doe@gmail.com:SecretPass123!',
    expectedConf: 'GREEN',
    expectedUser: 'alex.doe@gmail.com',
    expectedPass: 'SecretPass123!',
    expectedDomain: 'gmail.com'
  },
  {
    line: 'https://auth.internal.corp:8443/login:sarah.connor@cyberdyne.systems:IwillBeBack2026',
    expectedConf: 'GREEN',
    expectedUser: 'sarah.connor@cyberdyne.systems',
    expectedPass: 'IwillBeBack2026',
    expectedDomain: 'cyberdyne.systems'
  },
  {
    line: 'john_wick|continental999',
    expectedConf: 'YELLOW',
    expectedUser: 'john_wick',
    expectedPass: 'continental999'
  },
  {
    line: 'root;SuperAdministratorP@ssw0rd',
    expectedConf: 'YELLOW',
    expectedUser: 'root',
    expectedPass: 'SuperAdministratorP@ssw0rd'
  },
  {
    line: 'malformed_garbage_string_with_no_delimiter',
    expectedConf: 'RED',
    expectedPass: ''
  }
];

let failed = 0;
for (const tc of testCases) {
  const parsed = parseComboLine(tc.line, 'test_log.txt');
  console.log(`Input: "${tc.line.slice(0, 40)}..."`);
  console.log(`  -> Conf: ${parsed?.confidence}, User: ${parsed?.userOrEmail}, Pass: ${parsed?.pass}, Domain: ${parsed?.domain}`);
  
  if (parsed.confidence !== tc.expectedConf) {
    console.error(`  FAIL: Expected confidence ${tc.expectedConf}, got ${parsed.confidence}`);
    failed++;
  } else if (tc.expectedUser && parsed.userOrEmail !== tc.expectedUser) {
    console.error(`  FAIL: Expected user ${tc.expectedUser}, got ${parsed.userOrEmail}`);
    failed++;
  } else if (tc.expectedPass !== undefined && parsed.pass !== tc.expectedPass) {
    console.error(`  FAIL: Expected pass ${tc.expectedPass}, got ${parsed.pass}`);
    failed++;
  } else {
    console.log('  PASS');
  }
}

if (failed === 0) {
  console.log('\nAll Parser Tests Passed Successfully!');
  process.exit(0);
} else {
  console.error(`\n${failed} Tests Failed!`);
  process.exit(1);
}
