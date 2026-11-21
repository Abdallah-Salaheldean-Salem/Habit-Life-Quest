// Habit Quest push reminders — delivered even when the app is closed.
//
// Actions (POST JSON { action, ... }):
//   vapid        -> { publicKey }  (generated once, kept in hq_push_config,
//                                   which only this function's service role reads)
//   subscribe    -> store this device for the signed-in character, with its
//                   timezone and reminder times                       [needs login]
//   prefs        -> update this device's timezone and reminder times    [needs login]
//   unsubscribe  -> remove this device                                  [needs login]
//   test         -> send this device a sample of tonight's reminder     [needs login]
//   tick         -> send due reminders (pg_cron every 15 min, with the cron token)
//
// Reminder wording is built from the character's cloud save (see messages.ts);
// no action accepts message text from the caller. Deploy with verify_jwt off:
// the cron call carries no JWT, and user actions verify the token themselves.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { buildMessage, cleanPrefs, dueKinds, localNow, type Kind, type LastSent, type Message } from './messages.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// deno-lint-ignore no-explicit-any
type Json = any;
interface Sub { endpoint: string; user_id: string; p256dh: string; auth: string; tz: string; prefs: Json; last_sent: LastSent }

// ---- VAPID keys ----------------------------------------------------------------
let vapidReady: Promise<string> | null = null;
function vapid(): Promise<string> {
  if (!vapidReady) {
    vapidReady = (async () => {
      let { data } = await db.from('hq_push_config').select('public_key,private_key').eq('id', 1).single();
      if (!data?.public_key || !data?.private_key) {
        const keys = webpush.generateVAPIDKeys();
        // Only fill if still empty, so two cold starts can't overwrite each other.
        await db.from('hq_push_config').update({ public_key: keys.publicKey, private_key: keys.privateKey }).eq('id', 1).is('public_key', null);
        ({ data } = await db.from('hq_push_config').select('public_key,private_key').eq('id', 1).single());
      }
      webpush.setVapidDetails(SUPABASE_URL, data!.public_key, data!.private_key);
      return data!.public_key as string;
    })().catch((e) => {
      vapidReady = null;
      throw e;
    });
  }
  return vapidReady;
}

async function send(sub: Sub, msg: Message): Promise<boolean> {
  await vapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ url: '/', ...msg }),
      { TTL: 60 * 60 * 6, urgency: 'normal' },
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await db.from('hq_push_subscriptions').delete().eq('endpoint', sub.endpoint); // device gone
    else console.warn('push failed', status, (err as Error).message);
    return false;
  }
}

// ---- Helpers -------------------------------------------------------------------
async function userFrom(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data?.user?.id ?? null;
}

async function loadSave(userId: string): Promise<Json> {
  const { data } = await db.from('saves').select('data').eq('user_id', userId).maybeSingle();
  return data?.data ?? {};
}

const cleanTz = (tz: unknown) => (typeof tz === 'string' && tz.length < 64 && /^[A-Za-z0-9_+\-/]+$/.test(tz) ? tz : 'UTC');

async function tick() {
  const { data: subs } = await db.from('hq_push_subscriptions').select('*');
  const saves = new Map<string, Json>();
  let sent = 0;
  for (const s of (subs || []) as Sub[]) {
    const now = localNow(s.tz || 'UTC');
    const lastSent: LastSent = s.last_sent || {};
    const due = dueKinds(cleanPrefs(s.prefs), now.hhmm, now.date, lastSent);
    if (!due.length) continue;
    // Claim first, so a slow or repeated tick can't double-send.
    const claimed: LastSent = { ...lastSent };
    for (const k of due) claimed[k] = now.date;
    await db.from('hq_push_subscriptions').update({ last_sent: claimed }).eq('endpoint', s.endpoint);
    if (!saves.has(s.user_id)) saves.set(s.user_id, await loadSave(s.user_id));
    for (const k of due as Kind[]) {
      const msg = buildMessage(k, saves.get(s.user_id), now.date);
      if (msg && (await send(s, msg))) sent++;
    }
  }
  return { sent };
}

// ---- Entry -----------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body: Json = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }
  try {
    if (body.action === 'vapid') return json({ publicKey: await vapid() });

    if (body.action === 'tick') {
      const { data } = await db.from('hq_push_config').select('cron_token').eq('id', 1).single();
      if (!data?.cron_token || body.token !== data.cron_token) return json({ error: 'forbidden' }, 403);
      return json(await tick());
    }

    const userId = await userFrom(req);
    if (!userId) return json({ error: 'sign in to sync first' }, 401);
    const endpoint = String(body.endpoint || body.subscription?.endpoint || '');

    switch (body.action) {
      case 'subscribe': {
        const sub = body.subscription;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'bad subscription' }, 400);
        if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return json({ error: 'bad subscription' }, 400);
        const { error } = await db.from('hq_push_subscriptions').upsert(
          {
            endpoint: sub.endpoint, user_id: userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
            tz: cleanTz(body.tz), prefs: cleanPrefs(body.prefs), user_agent: String(body.userAgent || '').slice(0, 300),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' },
        );
        return error ? json({ error: error.message }, 500) : json({ ok: true });
      }
      case 'prefs': {
        const { error } = await db.from('hq_push_subscriptions')
          .update({ tz: cleanTz(body.tz), prefs: cleanPrefs(body.prefs), updated_at: new Date().toISOString() })
          .eq('endpoint', endpoint).eq('user_id', userId);
        return error ? json({ error: error.message }, 500) : json({ ok: true });
      }
      case 'unsubscribe': {
        await db.from('hq_push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', userId);
        return json({ ok: true });
      }
      case 'test': {
        const { data } = await db.from('hq_push_subscriptions').select('*').eq('endpoint', endpoint).eq('user_id', userId).maybeSingle();
        if (!data) return json({ error: 'not subscribed' }, 404);
        const sub = data as Sub;
        const today = localNow(sub.tz).date;
        const sample = buildMessage('daily', await loadSave(userId), today);
        const ok = await send(sub, {
          title: 'Reminders are on ✓',
          body: sample ? `They'll sound like this: “${sample.title}. ${sample.body}”` : "You'll get your reminders here, even when the app is closed.",
          tag: 'hq-test',
        });
        return json({ ok });
      }
      default:
        return json({ error: 'unknown action' }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
