import type { Tile, ChestQuestion } from './types';

export const TILES: Tile[] = [
  { id: 0, name: 'GO', type: 'go' },
  {
    id: 1, name: 'Egypt', type: 'country', set: 'brown', flag: '🇪🇬',
    buyPrice: 60, rentLevels: [2, 10, 30, 90, 160], upgradePrice: 50, mortgageValue: 30,
    advantage: '+5% bonus on Chest rewards',
  },
  { id: 2, name: 'World Chest', type: 'chest' },
  {
    id: 3, name: 'Morocco', type: 'country', set: 'brown', flag: '🇲🇦',
    buyPrice: 60, rentLevels: [4, 20, 60, 180, 320], upgradePrice: 50, mortgageValue: 30,
    advantage: 'Reduce tax payments by $10',
  },
  { id: 4, name: 'Income Tax', type: 'tax', taxAmount: 200 },
  { id: 5, name: 'Silk Road', type: 'transport', buyPrice: 200, rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  {
    id: 6, name: 'Greece', type: 'country', set: 'light-blue', flag: '🇬🇷',
    buyPrice: 100, rentLevels: [6, 30, 90, 270, 400], upgradePrice: 50, mortgageValue: 50,
    advantage: 'Collect $15 bonus when passing GO',
  },
  { id: 7, name: 'Global Event', type: 'event' },
  {
    id: 8, name: 'Turkey', type: 'country', set: 'light-blue', flag: '🇹🇷',
    buyPrice: 100, rentLevels: [6, 30, 90, 270, 400], upgradePrice: 50, mortgageValue: 50,
    advantage: 'Roll one extra die when leaving Jail',
  },
  {
    id: 9, name: 'Croatia', type: 'country', set: 'light-blue', flag: '🇭🇷',
    buyPrice: 120, rentLevels: [8, 40, 100, 300, 450], upgradePrice: 50, mortgageValue: 60,
    advantage: 'Rent reduced by $5 when paying opponents',
  },
  { id: 10, name: 'Jail', type: 'jail' },
  {
    id: 11, name: 'France', type: 'country', set: 'pink', flag: '🇫🇷',
    buyPrice: 140, rentLevels: [10, 50, 150, 450, 625], upgradePrice: 100, mortgageValue: 70,
    advantage: 'Upgrade costs reduced by $10',
  },
  { id: 12, name: 'Global Bank', type: 'utility', buyPrice: 150, mortgageValue: 75 },
  {
    id: 13, name: 'Italy', type: 'country', set: 'pink', flag: '🇮🇹',
    buyPrice: 140, rentLevels: [10, 50, 150, 450, 625], upgradePrice: 100, mortgageValue: 70,
    advantage: 'Earn $20 each time any player passes your property',
  },
  {
    id: 14, name: 'Spain', type: 'country', set: 'pink', flag: '🇪🇸',
    buyPrice: 160, rentLevels: [12, 60, 180, 500, 700], upgradePrice: 100, mortgageValue: 80,
    advantage: 'Free chest redraw once per round',
  },
  { id: 15, name: 'Trade Route', type: 'transport', buyPrice: 200, rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  {
    id: 16, name: 'Brazil', type: 'country', set: 'orange', flag: '🇧🇷',
    buyPrice: 180, rentLevels: [14, 70, 200, 550, 750], upgradePrice: 100, mortgageValue: 90,
    advantage: '$25 bonus from passing GO on your full set',
  },
  { id: 17, name: 'World Chest', type: 'chest' },
  {
    id: 18, name: 'Argentina', type: 'country', set: 'orange', flag: '🇦🇷',
    buyPrice: 180, rentLevels: [14, 70, 200, 550, 750], upgradePrice: 100, mortgageValue: 90,
    advantage: 'Double rent for one turn after upgrade',
  },
  {
    id: 19, name: 'Mexico', type: 'country', set: 'orange', flag: '🇲🇽',
    buyPrice: 200, rentLevels: [16, 80, 220, 600, 800], upgradePrice: 100, mortgageValue: 100,
    advantage: 'Immune to tax once per game',
  },
  { id: 20, name: 'Free Parking', type: 'free-parking' },
  {
    id: 21, name: 'Japan', type: 'country', set: 'red', flag: '🇯🇵',
    buyPrice: 220, rentLevels: [18, 90, 250, 700, 875], upgradePrice: 150, mortgageValue: 110,
    advantage: 'Tech bonus: +$30 per upgrade level on rent',
  },
  { id: 22, name: 'Global Event', type: 'event' },
  {
    id: 23, name: 'South Korea', type: 'country', set: 'red', flag: '🇰🇷',
    buyPrice: 220, rentLevels: [18, 90, 250, 700, 875], upgradePrice: 150, mortgageValue: 110,
    advantage: 'Teleport to nearest transport tile once per game',
  },
  {
    id: 24, name: 'China', type: 'country', set: 'red', flag: '🇨🇳',
    buyPrice: 240, rentLevels: [20, 100, 300, 750, 950], upgradePrice: 150, mortgageValue: 120,
    advantage: 'Trade deal: steal $50 from richest player once per game',
  },
  { id: 25, name: 'Maritime Hub', type: 'transport', buyPrice: 200, rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  {
    id: 26, name: 'USA', type: 'country', set: 'yellow', flag: '🇺🇸',
    buyPrice: 260, rentLevels: [22, 110, 330, 800, 975], upgradePrice: 150, mortgageValue: 130,
    advantage: 'Stock market: roll dice for $10–$60 bonus once per round',
  },
  {
    id: 27, name: 'Canada', type: 'country', set: 'yellow', flag: '🇨🇦',
    buyPrice: 260, rentLevels: [22, 110, 330, 800, 975], upgradePrice: 150, mortgageValue: 130,
    advantage: 'Natural resources: +$20 bonus from event cards',
  },
  { id: 28, name: 'World Trade', type: 'utility', buyPrice: 150, mortgageValue: 75 },
  {
    id: 29, name: 'Australia', type: 'country', set: 'yellow', flag: '🇦🇺',
    buyPrice: 280, rentLevels: [24, 120, 360, 850, 1025], upgradePrice: 150, mortgageValue: 140,
    advantage: 'Outback immunity: 25% chance to avoid Jail',
  },
  { id: 30, name: 'Go To Jail', type: 'go-to-jail' },
  {
    id: 31, name: 'UK', type: 'country', set: 'green', flag: '🇬🇧',
    buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100], upgradePrice: 200, mortgageValue: 150,
    advantage: 'Financial hub: earn $25 interest per turn on $1000+ balance',
  },
  {
    id: 32, name: 'Germany', type: 'country', set: 'green', flag: '🇩🇪',
    buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100], upgradePrice: 200, mortgageValue: 150,
    advantage: 'Engineering: upgrade costs reduced by $15',
  },
  { id: 33, name: 'World Chest', type: 'chest' },
  {
    id: 34, name: 'Netherlands', type: 'country', set: 'green', flag: '🇳🇱',
    buyPrice: 320, rentLevels: [28, 150, 450, 1000, 1200], upgradePrice: 200, mortgageValue: 160,
    advantage: 'Tulip trade: draw 2 chest cards, keep best',
  },
  { id: 35, name: 'Global Airways', type: 'transport', buyPrice: 200, rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  { id: 36, name: 'Global Event', type: 'event' },
  {
    id: 37, name: 'Switzerland', type: 'country', set: 'dark-blue', flag: '🇨🇭',
    buyPrice: 350, rentLevels: [35, 175, 500, 1100, 1300], upgradePrice: 200, mortgageValue: 175,
    advantage: 'Swiss bank: earn $40 interest per turn (passive)',
  },
  { id: 38, name: 'Luxury Tax', type: 'tax', taxAmount: 100 },
  {
    id: 39, name: 'Singapore', type: 'country', set: 'dark-blue', flag: '🇸🇬',
    buyPrice: 400, rentLevels: [50, 200, 600, 1400, 2000], upgradePrice: 200, mortgageValue: 200,
    advantage: 'Smart city: collect $100 when any player rolls doubles',
  },
];

export const SET_COLORS: Record<string, string> = {
  brown: '#c8602a',
  'light-blue': '#00d4ff',
  pink: '#ff2d78',
  orange: '#ff7700',
  red: '#ff2222',
  yellow: '#ffcc00',
  green: '#00cc44',
  'dark-blue': '#0055ff',
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
  if (id === 0) return { row: 11, col: 11 };
  if (id <= 9) return { row: 11, col: 11 - id };
  if (id === 10) return { row: 11, col: 1 };
  if (id <= 19) return { row: 11 - (id - 10), col: 1 };
  if (id === 20) return { row: 1, col: 1 };
  if (id <= 29) return { row: 1, col: (id - 20) + 1 };
  if (id === 30) return { row: 1, col: 11 };
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
