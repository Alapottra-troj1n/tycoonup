import type { Tile, ChestQuestion } from './types';

// ⚠️  TILES must be ordered by id (index === id) because the game uses TILES[position] lookups.
export const TILES: Tile[] = [
  /* 0  */ { id: 0,  name: 'GO',                   type: 'go' },
  /* 1  */ { id: 1,  name: 'Cairo',                 type: 'country', set: 'brown',     country: 'Egypt',       flag: '🇪🇬', buyPrice: 60,  rentLevels: [2, 10, 30, 90, 160],         upgradePrice: 50,  mortgageValue: 30  },
  /* 2  */ { id: 2,  name: 'World Chest',           type: 'chest' },
  /* 3  */ { id: 3,  name: 'Luxor',                 type: 'country', set: 'brown',     country: 'Egypt',       flag: '🇪🇬', buyPrice: 60,  rentLevels: [4, 20, 60, 180, 320],         upgradePrice: 50,  mortgageValue: 30  },
  /* 4  */ { id: 4,  name: 'Income Tax',             type: 'tax',    taxAmount: 0,     taxType: 'percent' },
  /* 5  */ { id: 5,  name: 'Silk Road',             type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 6  */ { id: 6,  name: 'Mumbai',                type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 100, rentLevels: [6, 30, 90, 270, 400],         upgradePrice: 50,  mortgageValue: 50  },
  /* 7  */ { id: 7,  name: 'Global Event',          type: 'event' },
  /* 8  */ { id: 8,  name: 'Delhi',                 type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 100, rentLevels: [6, 30, 90, 270, 400],         upgradePrice: 50,  mortgageValue: 50  },
  /* 9  */ { id: 9,  name: 'Bangalore',             type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 120, rentLevels: [8, 40, 100, 300, 450],         upgradePrice: 50,  mortgageValue: 60  },
  /* 10 */ { id: 10, name: 'Jail',                  type: 'jail' },
  /* 11 */ { id: 11, name: 'Paris',                 type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 140, rentLevels: [10, 50, 150, 450, 625],       upgradePrice: 100, mortgageValue: 70  },
  /* 12 */ { id: 12, name: 'Global Bank',           type: 'utility', buyPrice: 150,   mortgageValue: 75 },
  /* 13 */ { id: 13, name: 'Lyon',                  type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 140, rentLevels: [10, 50, 150, 450, 625],       upgradePrice: 100, mortgageValue: 70  },
  /* 14 */ { id: 14, name: 'Marseille',             type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 160, rentLevels: [12, 60, 180, 500, 700],       upgradePrice: 100, mortgageValue: 80  },
  /* 15 */ { id: 15, name: 'Trade Route',           type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 16 */ { id: 16, name: 'São Paulo',             type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 180, rentLevels: [14, 70, 200, 550, 750],       upgradePrice: 100, mortgageValue: 90  },
  /* 17 */ { id: 17, name: 'World Chest',           type: 'chest' },
  /* 18 */ { id: 18, name: 'Rio de Janeiro',        type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 180, rentLevels: [14, 70, 200, 550, 750],       upgradePrice: 100, mortgageValue: 90  },
  /* 19 */ { id: 19, name: 'Brasília',              type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 200, rentLevels: [16, 80, 220, 600, 800],       upgradePrice: 100, mortgageValue: 100 },
  /* 20 */ { id: 20, name: 'Free Parking',          type: 'free-parking' },
  /* 21 */ { id: 21, name: 'Tokyo',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 220, rentLevels: [18, 90, 250, 700, 875],       upgradePrice: 150, mortgageValue: 110 },
  /* 22 */ { id: 22, name: 'Global Event',          type: 'event' },
  /* 23 */ { id: 23, name: 'Osaka',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 220, rentLevels: [18, 90, 250, 700, 875],       upgradePrice: 150, mortgageValue: 110 },
  /* 24 */ { id: 24, name: 'Kyoto',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 240, rentLevels: [20, 100, 300, 750, 950],      upgradePrice: 150, mortgageValue: 120 },
  /* 25 */ { id: 25, name: 'Maritime Hub',          type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 26 */ { id: 26, name: 'New York',              type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 260, rentLevels: [22, 110, 330, 800, 975],      upgradePrice: 150, mortgageValue: 130 },
  /* 27 */ { id: 27, name: 'Los Angeles',           type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 260, rentLevels: [22, 110, 330, 800, 975],      upgradePrice: 150, mortgageValue: 130 },
  /* 28 */ { id: 28, name: 'World Trade',           type: 'utility', buyPrice: 150,   mortgageValue: 75 },
  /* 29 */ { id: 29, name: 'Chicago',               type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 280, rentLevels: [24, 120, 360, 850, 1025],     upgradePrice: 150, mortgageValue: 140 },
  /* 30 */ { id: 30, name: 'Go To Jail',            type: 'go-to-jail' },
  /* 31 */ { id: 31, name: 'London',                type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100],     upgradePrice: 200, mortgageValue: 150 },
  /* 32 */ { id: 32, name: 'Manchester',            type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100],     upgradePrice: 200, mortgageValue: 150 },
  /* 33 */ { id: 33, name: 'World Chest',           type: 'chest' },
  /* 34 */ { id: 34, name: 'Edinburgh',             type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 320, rentLevels: [28, 150, 450, 1000, 1200],    upgradePrice: 200, mortgageValue: 160 },
  /* 35 */ { id: 35, name: 'Global Airways',        type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 36 */ { id: 36, name: 'Global Event',          type: 'event' },
  /* 37 */ { id: 37, name: 'Zurich',                type: 'country', set: 'dark-blue', country: 'Switzerland', flag: '🇨🇭', buyPrice: 350, rentLevels: [35, 175, 500, 1100, 1300],    upgradePrice: 200, mortgageValue: 175 },
  /* 38 */ { id: 38, name: 'Ransom to Underworld',  type: 'tax',    taxAmount: 100,   taxType: 'flat' },
  /* 39 */ { id: 39, name: 'Singapore',             type: 'country', set: 'dark-blue', country: 'Singapore',   flag: '🇸🇬', buyPrice: 400, rentLevels: [50, 200, 600, 1400, 2000],    upgradePrice: 200, mortgageValue: 200 },
];

// ── Set display colours ────────────────────────────────────────────────────
export const SET_COLORS: Record<string, string> = {
  brown: '#9e6b3e',
  'light-blue': '#4a9ec2',
  pink: '#c05f8c',
  orange: '#c87840',
  red: '#b85555',
  yellow: '#c2a030',
  green: '#3e9460',
  'dark-blue': '#3e5eaa',
};

// ── Monopoly advantages — unlocked when a player owns the full set ─────────
// All bonuses are intentionally mild to preserve game balance.
export const SET_ADVANTAGES: Record<string, string> = {
  'brown':      'Chest reward: win 10% more, lose 10% less',
  'light-blue': '+$10 bonus each time you pass GO',
  'pink':       'Upgrade cost reduced by $10 per city in this set',
  'orange':     'Opponents pay +$10 extra rent on your orange cities',
  'red':        '+$5 bonus rent per upgrade level on your red cities',
  'yellow':     'Earn $20 bonus once per full round (your turn start)',
  'green':      'Earn $15 interest per turn when your balance is ≥ $800',
  'dark-blue':  'Earn $25 passive income at the start of each of your turns',
};

// ── Set sizes (how many city tiles form a full monopoly) ──────────────────
export const SET_SIZES: Record<string, number> = {
  'brown':      2,
  'light-blue': 3,
  'pink':       3,
  'orange':     3,
  'red':        3,
  'yellow':     3,
  'green':      3,
  'dark-blue':  2,
};

export const SET_COUNTRY_NAMES: Record<string, string> = {
  'brown':      'Egypt',
  'light-blue': 'India',
  'pink':       'France',
  'orange':     'Brazil',
  'red':        'Japan',
  'yellow':     'USA',
  'green':      'UK',
  'dark-blue':  'Global Finance',
};

export const PLAYER_COLOR_MAP: Record<string, { hex: string; tailwind: string }> = {
  cyan:    { hex: '#00f5ff', tailwind: 'cyan' },
  magenta: { hex: '#ff00ff', tailwind: 'fuchsia' },
  lime:    { hex: '#00ff88', tailwind: 'lime' },
  amber:   { hex: '#ffcc00', tailwind: 'amber' },
  violet:  { hex: '#8b5cf6', tailwind: 'violet' },
  rose:    { hex: '#ff2d78', tailwind: 'rose' },
};

export const ALL_PLAYER_COLORS = Object.keys(PLAYER_COLOR_MAP) as Array<keyof typeof PLAYER_COLOR_MAP>;

export const CHEST_QUESTIONS: ChestQuestion[] = [
  {
    id: 1, question: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctIndex: 2, reward: 150, penalty: 75,
  },
  {
    id: 2, question: 'Which country has the largest land area?',
    options: ['China', 'USA', 'Canada', 'Russia'],
    correctIndex: 3, reward: 200, penalty: 100,
  },
  {
    id: 3, question: 'What currency does Japan use?',
    options: ['Yuan', 'Yen', 'Won', 'Ringgit'],
    correctIndex: 1, reward: 100, penalty: 50,
  },
  {
    id: 4, question: 'Which river is the longest in the world?',
    options: ['Amazon', 'Yangtze', 'Mississippi', 'Nile'],
    correctIndex: 3, reward: 175, penalty: 75,
  },
  {
    id: 5, question: 'How many countries are in the European Union?',
    options: ['24', '27', '30', '33'],
    correctIndex: 1, reward: 150, penalty: 75,
  },
  {
    id: 6, question: 'What is the smallest country in the world by area?',
    options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'],
    correctIndex: 2, reward: 200, penalty: 100,
  },
  {
    id: 7, question: 'Which country invented paper?',
    options: ['Japan', 'India', 'Egypt', 'China'],
    correctIndex: 3, reward: 125, penalty: 50,
  },
  {
    id: 8, question: "What percentage of Earth's surface is covered by oceans?",
    options: ['51%', '61%', '71%', '81%'],
    correctIndex: 2, reward: 150, penalty: 75,
  },
  {
    id: 9, question: 'Which city is known as the "City of Light"?',
    options: ['Rome', 'London', 'Paris', 'Vienna'],
    correctIndex: 2, reward: 100, penalty: 50,
  },
  {
    id: 10, question: "What is the world's most spoken language by native speakers?",
    options: ['English', 'Spanish', 'Mandarin', 'Hindi'],
    correctIndex: 2, reward: 175, penalty: 75,
  },
  {
    id: 11, question: 'Which country has the most time zones?',
    options: ['Russia', 'USA', 'France', 'China'],
    correctIndex: 2, reward: 200, penalty: 100,
  },
  {
    id: 12, question: 'What is the tallest mountain in the world?',
    options: ['K2', 'Kangchenjunga', 'Lhotse', 'Mount Everest'],
    correctIndex: 3, reward: 100, penalty: 50,
  },
  {
    id: 13, question: 'Which country produces the most coffee?',
    options: ['Colombia', 'Vietnam', 'Brazil', 'Ethiopia'],
    correctIndex: 2, reward: 125, penalty: 50,
  },
  {
    id: 14, question: 'How many continents are on Earth?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2, reward: 100, penalty: 50,
  },
  {
    id: 15, question: 'What is the currency of Switzerland?',
    options: ['Euro', 'Swiss Franc', 'Florin', 'Krone'],
    correctIndex: 1, reward: 150, penalty: 75,
  },
  {
    id: 16, question: 'Which city is the financial capital of India?',
    options: ['Delhi', 'Kolkata', 'Mumbai', 'Chennai'],
    correctIndex: 2, reward: 125, penalty: 50,
  },
  {
    id: 17, question: 'What is the capital of Brazil?',
    options: ['Rio de Janeiro', 'São Paulo', 'Belo Horizonte', 'Brasília'],
    correctIndex: 3, reward: 150, penalty: 75,
  },
  {
    id: 18, question: 'In which Japanese city was the first atomic bomb dropped?',
    options: ['Tokyo', 'Osaka', 'Hiroshima', 'Kyoto'],
    correctIndex: 2, reward: 175, penalty: 75,
  },
];

export const EVENT_CARDS = [
  { message: 'Economic Boom! Collect $100 from the bank.', amount: 100, type: 'gain' as const },
  { message: 'Market Crash! Pay $75 to the bank.', amount: -75, type: 'lose' as const },
  { message: 'Trade Summit! Advance to GO and collect $200.', amount: 200, type: 'move_go' as const },
  { message: 'Tax Rebate! Collect $75 from the bank.', amount: 75, type: 'gain' as const },
  { message: 'Geopolitical Crisis! Go directly to Jail.', amount: 0, type: 'jail' as const },
  { message: 'World Cup Host! Collect $25 from each player.', amount: 25, type: 'collect_all' as const },
  { message: 'Natural Disaster! Pay $125 in relief funds.', amount: -125, type: 'lose' as const },
  { message: 'Foreign Investment! Collect $150 from the bank.', amount: 150, type: 'gain' as const },
  { message: 'Global Recession! Pay $100 to the bank.', amount: -100, type: 'lose' as const },
  { message: 'Currency Devaluation! Pay $50 to each player.', amount: -50, type: 'pay_all' as const },
];

export const STARTING_BALANCE = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_TURNS_MAX = 3;

// Maps tile ID → CSS grid position (1-indexed, 11x11 grid)
export function getTileGridPos(id: number): { row: number; col: number } {
  if (id === 0)  return { row: 11, col: 11 };
  if (id <= 9)   return { row: 11, col: 11 - id };
  if (id === 10) return { row: 11, col: 1 };
  if (id <= 19)  return { row: 11 - (id - 10), col: 1 };
  if (id === 20) return { row: 1,  col: 1 };
  if (id <= 29)  return { row: 1,  col: (id - 20) + 1 };
  if (id === 30) return { row: 1,  col: 11 };
  return { row: (id - 30) + 1, col: 11 };
}

// Transport rent: 25 * (2 ^ (ownedCount - 1))
export function calcTransportRent(ownedCount: number): number {
  return 25 * Math.pow(2, ownedCount - 1);
}

// Utility rent: dice total * multiplier (4 if 1 owned, 10 if both owned)
export function calcUtilityRent(diceTotal: number, ownedCount: number): number {
  return diceTotal * (ownedCount === 2 ? 10 : 4);
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
