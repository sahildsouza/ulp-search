import { parseComboLine } from '../utils/parser.js';

console.log('--- Testing Smart Combo Line Parser ---');

const testCases = [
  {
    line: 'alex.doe@gmail.com:SecretPass123!',
    expectedConf: 'EP',
    expectedUser: 'alex.doe@gmail.com',
    expectedPass: 'SecretPass123!',
    expectedDomain: 'gmail.com'
  },
  {
    line: 'https://auth.internal.corp:8443/login:sarah.connor@cyberdyne.systems:IwillBeBack2026',
    expectedConf: 'EP',
    expectedUser: 'sarah.connor@cyberdyne.systems',
    expectedPass: 'IwillBeBack2026',
    expectedDomain: 'cyberdyne.systems'
  },
  {
    line: 'john_wick|continental999',
    expectedConf: 'UP',
    expectedUser: 'john_wick',
    expectedPass: 'continental999'
  },
  {
    line: 'root;SuperAdministratorP@ssw0rd',
    expectedConf: 'UP',
    expectedUser: 'root',
    expectedPass: 'SuperAdministratorP@ssw0rd'
  },
  {
    line: '+19175551234:SecretPhonePass',
    expectedConf: 'MP',
    expectedUser: '+19175551234',
    expectedPass: 'SecretPhonePass'
  },
  {
    line: '9876543210:IndianMobilePass2026',
    expectedConf: 'MP',
    expectedUser: '9876543210',
    expectedPass: 'IndianMobilePass2026'
  },
  {
    line: 'https://mybank.com:+919876543210:securePass99',
    expectedConf: 'MP',
    expectedUser: '+919876543210',
    expectedPass: 'securePass99'
  },
  {
    line: 'admin:simplepass',
    expectedConf: 'UP',
    expectedUser: 'admin',
    expectedPass: 'simplepass'
  },
  {
    line: 'com.cpplusworld.ezykamp:7737193309:Devkisu2001',
    expectedConf: 'MP',
    expectedUser: '7737193309',
    expectedPass: 'Devkisu2001',
    expectedDomain: 'com.cpplusworld.ezykamp'
  },
  {
    line: 'cpplusworld.ezykamp.com:7905181267:Raj@774847',
    expectedConf: 'MP',
    expectedUser: '7905181267',
    expectedPass: 'Raj@774847',
    expectedDomain: 'cpplusworld.ezykamp.com'
  },
  {
    line: 'https://cpplusworld.ezykamp.com:7905181267:Raj@774847',
    expectedConf: 'MP',
    expectedUser: '7905181267',
    expectedPass: 'Raj@774847',
    expectedDomain: 'cpplusworld.ezykamp.com'
  },
  {
    line: 'malformed_garbage_string_with_no_delimiter',
    expectedConf: 'UK',
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
