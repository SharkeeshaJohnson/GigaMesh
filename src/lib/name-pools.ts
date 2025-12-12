/**
 * Diverse name pools for NPC and player character generation
 * Names are spelled in English for accessibility
 * 120 total names across 6 cultural backgrounds
 */

// Indian first names (20)
export const INDIAN_NAMES = [
  'Arjun',
  'Priya',
  'Vikram',
  'Ananya',
  'Rohan',
  'Kavita',
  'Sanjay',
  'Meera',
  'Aditya',
  'Deepika',
  'Rajesh',
  'Sunita',
  'Nikhil',
  'Pooja',
  'Kiran',
  'Neha',
  'Amit',
  'Lakshmi',
  'Ravi',
  'Anjali',
];

// Spanish first names (20)
export const SPANISH_NAMES = [
  'Carlos',
  'Isabella',
  'Diego',
  'Valentina',
  'Mateo',
  'Camila',
  'Santiago',
  'Lucia',
  'Alejandro',
  'Sofia',
  'Fernando',
  'Gabriela',
  'Rafael',
  'Carmen',
  'Javier',
  'Elena',
  'Miguel',
  'Rosa',
  'Pablo',
  'Adriana',
];

// Korean first names (20) - Romanized
export const KOREAN_NAMES = [
  'Jimin',
  'Soyeon',
  'Taehyung',
  'Minji',
  'Jungkook',
  'Yuna',
  'Seojun',
  'Hana',
  'Minho',
  'Eunji',
  'Hyunwoo',
  'Jisoo',
  'Donghyun',
  'Soojin',
  'Jinwoo',
  'Chaeyoung',
  'Sungjae',
  'Dahyun',
  'Woojin',
  'Nayeon',
];

// Chinese first names (20) - Romanized (Pinyin)
export const CHINESE_NAMES = [
  'Wei',
  'Mei',
  'Chen',
  'Ling',
  'Jun',
  'Xiu',
  'Hao',
  'Yan',
  'Ming',
  'Hui',
  'Long',
  'Fang',
  'Tao',
  'Qing',
  'Bo',
  'Jing',
  'Feng',
  'Lan',
  'Yong',
  'Xia',
];

// African first names (20) - From various regions
export const AFRICAN_NAMES = [
  'Kwame',      // Ghanaian
  'Amara',      // West African
  'Kofi',       // Ghanaian
  'Zara',       // Swahili
  'Chidi',      // Nigerian (Igbo)
  'Nia',        // Swahili
  'Tendai',     // Zimbabwean
  'Amina',      // East African
  'Oluwaseun',  // Nigerian (Yoruba)
  'Fatou',      // Senegalese
  'Jabari',     // Swahili
  'Adaeze',     // Nigerian (Igbo)
  'Sipho',      // South African (Zulu)
  'Abeni',      // Nigerian (Yoruba)
  'Thabo',      // South African (Sotho)
  'Makena',     // Kenyan
  'Emeka',      // Nigerian (Igbo)
  'Zola',       // South African
  'Yaw',        // Ghanaian
  'Aisha',      // East African
];

// Western/English first names (20)
export const WESTERN_NAMES = [
  'Alex',
  'Sam',
  'John',
  'Jane',
  'Michael',
  'Sarah',
  'David',
  'Emily',
  'James',
  'Emma',
  'Chris',
  'Jessica',
  'Matt',
  'Ashley',
  'Ryan',
  'Amanda',
  'Daniel',
  'Jennifer',
  'Mark',
  'Nicole',
];

// Full name pool - all 120 names from 6 cultures
export const ALL_NAMES = [
  ...INDIAN_NAMES,
  ...SPANISH_NAMES,
  ...KOREAN_NAMES,
  ...CHINESE_NAMES,
  ...AFRICAN_NAMES,
  ...WESTERN_NAMES,
];

/**
 * Get a random selection of names from all cultures
 * @param count Number of names to return
 * @param excludeNames Names to exclude (e.g., player name, already used names)
 */
export function getRandomNames(count: number, excludeNames: string[] = []): string[] {
  const excludeLower = excludeNames.map(n => n.toLowerCase());
  const available = ALL_NAMES.filter(
    name => !excludeLower.includes(name.toLowerCase())
  );

  // Shuffle and take requested count
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get a balanced selection ensuring representation from each culture
 * @param count Number of names to return (should be divisible by 6 for perfect balance)
 * @param excludeNames Names to exclude
 */
export function getBalancedNames(count: number, excludeNames: string[] = []): string[] {
  const excludeLower = excludeNames.map(n => n.toLowerCase());

  const pools = [
    INDIAN_NAMES.filter(n => !excludeLower.includes(n.toLowerCase())),
    SPANISH_NAMES.filter(n => !excludeLower.includes(n.toLowerCase())),
    KOREAN_NAMES.filter(n => !excludeLower.includes(n.toLowerCase())),
    CHINESE_NAMES.filter(n => !excludeLower.includes(n.toLowerCase())),
    AFRICAN_NAMES.filter(n => !excludeLower.includes(n.toLowerCase())),
    WESTERN_NAMES.filter(n => !excludeLower.includes(n.toLowerCase())),
  ];

  // Shuffle each pool
  pools.forEach(pool => pool.sort(() => Math.random() - 0.5));

  const result: string[] = [];
  const perPool = Math.ceil(count / 6);

  // Take from each pool in round-robin fashion
  for (let i = 0; i < perPool && result.length < count; i++) {
    for (const pool of pools) {
      if (pool[i] && result.length < count) {
        result.push(pool[i]);
      }
    }
  }

  // Shuffle final result to mix cultures
  return result.sort(() => Math.random() - 0.5);
}

/**
 * Get suggested names for NPC generation prompt
 * Returns a string to insert into the LLM prompt
 */
export function getNPCNameSuggestions(count: number, playerName: string): string {
  const names = getBalancedNames(count + 5, [playerName]); // Get extra for variety
  return `SUGGESTED NAMES (pick from these for variety): ${names.join(', ')}`;
}

/**
 * Get suggested names for player character generation
 * Returns a subset appropriate for player naming
 */
export function getPlayerNameSuggestions(count: number = 10): string[] {
  return getRandomNames(count);
}
