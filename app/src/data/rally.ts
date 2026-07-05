// Fake data for the Rally app prototype — mirrors the sample data used in
// the design system's ui_kits/app screens.jsx / screens2.jsx / expenses.jsx.

export interface Group {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  live: boolean;
  members: number | null;
}

export const GROUPS: Group[] = [
  { id: 'trail', name: 'Trail Crew', preview: 'Mara: on my way, 5 min', time: '14:32', unread: 3, live: true, members: 6 },
  { id: 'climb', name: 'Weekend Climb', preview: 'Sam shared a location', time: '13:10', unread: 0, live: false, members: 4 },
  { id: 'dev', name: 'Dev Kaur', preview: 'see you there', time: 'Mon', unread: 0, live: false, members: null },
  { id: 'food', name: 'Taco Tuesday', preview: 'You: booking a table', time: 'Sun', unread: 0, live: false, members: 5 },
  { id: 'fam', name: 'Family', preview: 'Mom: call me when free', time: 'Sat', unread: 1, live: false, members: 4 },
];

export interface ThreadMessage {
  id: number;
  author?: string;
  mine?: boolean;
  text?: string;
  live?: boolean;
  loc?: { label: string; meta: string };
}

export const INITIAL_MESSAGES: ThreadMessage[] = [
  { id: 1, author: 'Mara', text: "who's actually coming today?" },
  { id: 2, mine: true, text: 'me! leaving now' },
  { id: 3, author: 'Dev', text: 'same, 10 min out' },
  { id: 4, mine: true, loc: { label: 'The Fountain', meta: '0.4 mi · 6 min walk' }, text: 'meet here?' },
  { id: 5, author: 'Mara', text: 'perfect 👌' },
];

/** Rally's currency was switched to Thai Baht mid-iteration (see chats/chat1.md). */
export const money = (n: number) => (n < 0 ? '-' : '') + 'THB ' + Math.abs(n).toFixed(2);

export interface Category {
  id: string;
  label: string;
  icon: string;
  amount: number;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food & drink', icon: 'utensils', amount: 268.4, color: '#FF5A3C' },
  { id: 'stay', label: 'Stays', icon: 'bed-double', amount: 220.0, color: '#FF7657' },
  { id: 'trans', label: 'Transport', icon: 'car', amount: 84.0, color: '#F5A623' },
  { id: 'gear', label: 'Gear', icon: 'backpack', amount: 40.0, color: '#2E72E8' },
];

export const INCOME = { label: 'Refunds & paid back', icon: 'corner-down-left', amount: 80.0 };

export interface Person {
  name: string;
  paid: number;
  share: number;
}

export const PEOPLE: Person[] = [
  { name: 'You Now', paid: 322.4, share: 153.1 },
  { name: 'Mara Ito', paid: 168.0, share: 153.1 },
  { name: 'Dev Kaur', paid: 122.0, share: 153.1 },
  { name: 'Sam Ng', paid: 0.0, share: 153.1 },
];

export const TOTAL = CATEGORIES.reduce((s, c) => s + c.amount, 0);
export const YOU = PEOPLE[0];

export const RECEIPT = {
  merchant: 'Trailhead Diner',
  date: 'SAT 14:52',
  paidBy: 'You',
  category: 'Food & drink',
  items: [
    ['Big breakfast x4', 52.0],
    ['Cold brew x4', 18.0],
    ['Trail sandwiches x6', 42.0],
    ['Tax & tip', 16.4],
  ] as [string, number][],
  total: 128.4,
};
