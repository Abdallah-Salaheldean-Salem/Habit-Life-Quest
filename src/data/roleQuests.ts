/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuestDraft } from '../types';

/**
 * Role quests — the "act as if" habits that turn a trait goal into daily
 * rehearsal. Personality moves through repeated behaviour, so each Big-Five
 * facet gets a couple of concrete, one-tap quests you can bind and do. Keyed
 * by the facet strings in TRAITS.
 */
export const ROLE_QUESTS: Record<string, QuestDraft[]> = {
  // ---- Conscientiousness ----
  Industriousness: [
    {
      title: 'Eat the frog',
      stat: 'mind', difficulty: 'normal', type: 'daily', target: 1, tier: 1,
      description: 'Do the hardest or most-avoided task first, before anything else.',
      intention: { cue: 'the moment I sit at my desk', location: 'my desk', minVersion: 'ten minutes on the hardest task' },
    },
    {
      title: 'Shutdown ritual',
      stat: 'career', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'End the workday by writing tomorrow’s single most important task.',
      intention: { cue: 'before I close the laptop', location: 'my desk', minVersion: 'write one task for tomorrow' },
    },
  ],
  Orderliness: [
    {
      title: '10-minute reset',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Return one space — desk, kitchen, inbox — to order.',
      intention: { cue: 'after dinner', location: 'one room', minVersion: 'clear one surface' },
    },
    {
      title: 'Plan tomorrow tonight',
      stat: 'career', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Lay out tomorrow’s three priorities before bed.',
      intention: { cue: 'as part of the evening wind-down', location: 'notebook / planner', minVersion: 'jot the top three' },
    },
  ],
  'Self-Discipline': [
    {
      title: 'Feet on the floor',
      stat: 'body', difficulty: 'normal', type: 'daily', target: 1, tier: 1,
      description: 'Up at the first alarm — no snooze.',
      intention: { cue: 'when the alarm sounds', location: 'bedroom', minVersion: 'sit up and stand within a minute' },
    },
    {
      title: 'Pause the impulse',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Wait ten minutes before an unplanned buy or scroll.',
      intention: { cue: 'when I reach for the impulse', location: 'anywhere', minVersion: 'a single ten-minute pause' },
    },
  ],

  // ---- Openness ----
  Curiosity: [
    {
      title: 'One real question',
      stat: 'mind', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Ask someone something you genuinely don’t know.',
      intention: { cue: 'in the first conversation of the day', location: 'wherever I am', minVersion: 'one honest question' },
    },
    {
      title: 'Explore the unfamiliar',
      stat: 'mind', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Fifteen minutes on a topic outside your lane.',
      intention: { cue: 'on the commute or a break', location: 'phone / book', minVersion: 'read one paragraph' },
    },
  ],
  Creativity: [
    {
      title: 'Make one small thing',
      stat: 'hobby', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Sketch, write, build, riff — finish something tiny.',
      intention: { cue: 'after the day’s work is done', location: 'my making space', minVersion: 'one rough draft or doodle' },
    },
    {
      title: 'Capture an idea',
      stat: 'hobby', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Write down one idea before it evaporates.',
      intention: { cue: 'whenever a thought sparks', location: 'notes app', minVersion: 'one line captured' },
    },
  ],
  Depth: [
    {
      title: 'Read something hard',
      stat: 'mind', difficulty: 'normal', type: 'daily', target: 1, tier: 1,
      description: 'Sit with a demanding text, not a feed.',
      intention: { cue: 'after Isha / before bed', location: 'reading chair', minVersion: 'one page, slowly' },
    },
    {
      title: 'Think on paper',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Write to work out what you actually think about one thing.',
      intention: { cue: 'once the house is quiet', location: 'journal', minVersion: 'three honest sentences' },
    },
  ],

  // ---- Extraversion ----
  Assertiveness: [
    {
      title: 'Say the thing',
      stat: 'spirit', difficulty: 'normal', type: 'daily', target: 1, tier: 1,
      description: 'Voice one opinion or need you’d normally swallow.',
      intention: { cue: 'when I notice myself holding back', location: 'in the room / on the call', minVersion: 'state it once, plainly' },
    },
    {
      title: 'Make the ask',
      stat: 'career', difficulty: 'normal', type: 'weekly', target: 1, tier: 1,
      description: 'Request something you want — help, feedback, an intro.',
      intention: { cue: 'once this week', location: 'in person or a message', minVersion: 'send one direct ask' },
    },
  ],
  Enthusiasm: [
    {
      title: 'Bring the energy',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Greet someone first, warmly and by name.',
      intention: { cue: 'the first person I see', location: 'home / lab', minVersion: 'one warm hello' },
    },
    {
      title: 'Share a win',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Tell someone about something good, yours or theirs.',
      intention: { cue: 'over a meal or a break', location: 'in person', minVersion: 'name one good thing out loud' },
    },
  ],
  Sociability: [
    {
      title: 'Reach out first',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Message or call one person before they contact you.',
      intention: { cue: 'mid-morning', location: 'phone', minVersion: 'one message sent' },
    },
    {
      title: 'Show up in person',
      stat: 'hobby', difficulty: 'normal', type: 'weekly', target: 1, tier: 1,
      description: 'Attend one gathering, class, or meetup.',
      intention: { cue: 'once this week', location: 'out of the house', minVersion: 'go, even for 30 minutes' },
    },
  ],

  // ---- Agreeableness ----
  Compassion: [
    {
      title: 'One kind act',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Do one small, deliberate thing for someone else.',
      intention: { cue: 'when I spot a chance to help', location: 'anywhere', minVersion: 'one small kindness' },
    },
    {
      title: 'Listen all the way',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Have one conversation where you don’t interrupt or plan your reply.',
      intention: { cue: 'the next real conversation', location: 'in person', minVersion: 'let them finish, once' },
    },
  ],
  Politeness: [
    {
      title: 'Thank someone specifically',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Thank one person and name exactly what for.',
      intention: { cue: 'when someone helps, however small', location: 'anywhere', minVersion: 'one specific thank-you' },
    },
    {
      title: 'Assume good faith',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Take one irritation and reframe the other person’s intent charitably.',
      intention: { cue: 'when I feel the flash of annoyance', location: 'anywhere', minVersion: 'reframe it once' },
    },
  ],
  Trust: [
    {
      title: 'Delegate one thing',
      stat: 'career', difficulty: 'normal', type: 'weekly', target: 1, tier: 1,
      description: 'Hand off a task and let someone else own it.',
      intention: { cue: 'once this week', location: 'work / home', minVersion: 'give away one task' },
    },
    {
      title: 'Give first',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Offer help or credit before it’s asked for.',
      intention: { cue: 'when someone’s working on something', location: 'anywhere', minVersion: 'one unprompted offer' },
    },
  ],

  // ---- Emotional Stability ----
  'Even Temper': [
    {
      title: 'Name it to tame it',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Label the feeling before you react to it.',
      intention: { cue: 'when the heat rises', location: 'anywhere', minVersion: 'name the emotion silently' },
    },
    {
      title: 'Pause before replying',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Take one breath before responding to something charged.',
      intention: { cue: 'before I hit send or speak', location: 'anywhere', minVersion: 'one full breath first' },
    },
  ],
  Resilience: [
    {
      title: 'One hard thing on purpose',
      stat: 'body', difficulty: 'normal', type: 'daily', target: 1, tier: 1,
      description: 'Choose a small discomfort — a cold finish, a tough set, a hard start.',
      intention: { cue: 'once during the day', location: 'anywhere', minVersion: 'thirty seconds of discomfort' },
    },
    {
      title: 'Reframe the setback',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Take one thing that went wrong and write what it taught you.',
      intention: { cue: 'in the evening review', location: 'journal', minVersion: 'one lesson written' },
    },
  ],
  Contentment: [
    {
      title: 'Three gratitudes',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Name three specific things — the coffee, the call, the finished task.',
      intention: { cue: 'first thing or last thing', location: 'journal', minVersion: 'one specific gratitude' },
    },
    {
      title: 'Savor one moment',
      stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
      description: 'Stop and fully take in one ordinary good moment.',
      intention: { cue: 'when something small is nice', location: 'anywhere', minVersion: 'thirty seconds, no phone' },
    },
  ],
};
