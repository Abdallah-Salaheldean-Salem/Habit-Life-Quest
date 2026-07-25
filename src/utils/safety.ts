/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Safety helpers for the debuff module. This app tracks behavior; it does not
 * diagnose or treat anything. Some withdrawals are medically dangerous, and
 * free-text fields can contain someone's worst night — these helpers exist so
 * the UI can respond appropriately.
 */

// Substances whose withdrawal can be medically dangerous (seizures, delirium
// tremens). Naming one must surface a medical-supervision notice.
const DANGEROUS_WITHDRAWAL = [
  'alcohol', 'alcoholism', 'drinking', 'beer', 'wine', 'liquor', 'vodka', 'whiskey', 'whisky',
  'benzo', 'benzodiazepine', 'xanax', 'alprazolam', 'valium', 'diazepam', 'klonopin',
  'clonazepam', 'ativan', 'lorazepam',
];

export function needsMedicalNotice(name: string): boolean {
  const n = name.toLowerCase();
  return DANGEROUS_WITHDRAWAL.some((w) => n.includes(w));
}

// Signals of acute distress / self-harm. Detection routes to crisis resources
// and suppresses any gamification of that entry.
const DISTRESS = [
  'suicide', 'suicidal', 'kill myself', 'killing myself', 'end my life', 'end it all',
  'take my life', 'self harm', 'self-harm', 'hurt myself', 'harming myself', 'want to die',
  'wanna die', 'better off dead', 'no reason to live', "don't want to be here",
];

export function containsDistress(text: string): boolean {
  const t = text.toLowerCase();
  return DISTRESS.some((w) => t.includes(w));
}

export interface CrisisResource {
  region: string;
  name: string;
  contact: string;
}

// A small, non-exhaustive set. findahelpline.com covers most regions.
export const CRISIS_RESOURCES: CrisisResource[] = [
  { region: 'International', name: 'Find a Helpline', contact: 'findahelpline.com' },
  { region: 'US', name: '988 Suicide & Crisis Lifeline', contact: 'call or text 988' },
  { region: 'UK & ROI', name: 'Samaritans', contact: 'call 116 123' },
  { region: 'Egypt', name: 'Behman crisis line', contact: '+20 (0)2 27563 111' },
];
