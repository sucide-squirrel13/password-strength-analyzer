export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '123456',
  '123456789',
  '12345678',
  '12345',
  '1234567',
  '1234567890',
  '1234',
  '111111',
  '000000',
  '123123',
  '654321',
  '987654321',
  '1q2w3e4r',
  '1q2w3e',
  '1qaz2wsx',
  'zaq12wsx',
  'qwerty',
  'qwertyuiop',
  'qwerty123',
  'qazwsx',
  'asdfgh',
  'asdfghjkl',
  'zxcvbnm',
  'password',
  'password1',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  'p@ssword',
  'pass123',
  'pass1234',
  'admin',
  'admin123',
  'administrator',
  'root',
  'toor',
  'guest',
  'user',
  'login',
  'welcome',
  'welcome1',
  'welcome123',
  'letmein',
  'monkey',
  'dragon',
  'baseball',
  'football',
  'soccer',
  'basketball',
  'hockey',
  'sunshine',
  'princess',
  'iloveyou',
  'love',
  'trustno1',
  'master',
  'shadow',
  'ashley',
  'michael',
  'jessica',
  'charlie',
  'andrew',
  'matthew',
  'daniel',
  'robert',
  'jennifer',
  'joshua',
  'thomas',
  'ninja',
  'mustang',
  'superman',
  'batman',
  'spiderman',
  'starwars',
  'pokemon',
  'hunter2',
  'whatever',
  'freedom',
  'secret',
  'security',
  'cybersecurity',
  'changeme',
  'default',
  'test',
  'test123',
  'testing',
  'demo',
  'demo123',
  'sample',
  'oracle',
  'postgres',
  'cisco',
  'ubuntu',
  'debian',
  'alpine',
  'kali',
  'docker',
  'server',
  'system',
  'qwerty1',
  'abc123',
  'abcd1234',
  '112233',
  '7777777',
  '88888888',
  '696969',
  'solo',
  'star',
  'angel',
  'flower',
  'summer',
  'winter',
  'spring',
  'autumn',
  'coffee',
  'chocolate',
  'diamond',
  'cookie',
  'cheese',
  'banana',
  'orange',
  'purple',
  'silver',
  'golden',
  'london',
  'paris',
  'madrid',
  'berlin',
  'tokyo',
  'newyork',
  'football1',
  'qwertyui',
  'asdf1234',
  'zxcv1234',
  'pass',
  'hello',
  'hello123',
  'access',
  'master123',
  'jordan',
  'harley',
  'buster',
  'pepper',
  'maggie',
  'ginger',
  'tigger',
  'computer',
  'internet',
  'network',
  'firewall',
  'database',
  'support',
  'service',
  'manager',
  'student',
  'portfolio',
  'college',
  'school',
  'university'
]);

const FORMAT_CHAR_REGEX = /^\p{Cf}$/u;

const LEET_MAP: Readonly<Record<string, string>> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '7': 't',
  '+': 't'
};

/**
 * Returns true for ASCII/C1 control characters and invisible Unicode format/BiDi characters.
 */
export function isInvisibleOrControlCodePoint(cp: number): boolean {
  if ((cp >= 0x0000 && cp <= 0x001f) || (cp >= 0x007f && cp <= 0x009f)) {
    return true;
  }
  if (
    cp === 0x00ad ||
    cp === 0x034f ||
    cp === 0x061c ||
    cp === 0x180e ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2060 && cp <= 0x206f) ||
    cp === 0xfeff
  ) {
    return true;
  }
  return FORMAT_CHAR_REGEX.test(String.fromCodePoint(cp));
}

export function stripInvisibleFromCodePoints(codePoints: readonly string[]): string {
  const out: string[] = [];
  for (const ch of codePoints) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && !isInvisibleOrControlCodePoint(cp)) {
      out.push(ch);
    }
  }
  return out.join('');
}

export function normalizeVisibleNFKC(codePoints: readonly string[]): string {
  return stripInvisibleFromCodePoints(codePoints).normalize('NFKC').toLowerCase();
}

export function applyLeetMap(text: string): string {
  const out: string[] = [];
  for (const ch of text) {
    out.push(LEET_MAP[ch] ?? ch);
  }
  return out.join('');
}
