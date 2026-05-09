// Cron Edge Function — invoke via pg_cron every 15 minutes
// Handles: 24h match reminders, 15min match reminders, 48h request expiry
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sendPush = async (
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> => {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
  });
};

serve(async (): Promise<Response> => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();

    // 24h reminder window: matches starting in 23h45m – 24h15m
    const h24start = new Date(
      now.getTime() + 23.75 * 3600 * 1000,
    ).toISOString();
    const h24end = new Date(now.getTime() + 24.25 * 3600 * 1000).toISOString();

    // 15min reminder window: matches starting in 14m45s – 15m15s
    const min15start = new Date(
      now.getTime() + 14.75 * 60 * 1000,
    ).toISOString();
    const min15end = new Date(now.getTime() + 15.25 * 60 * 1000).toISOString();

    const [
      { data: upcoming24h },
      { data: upcoming15m },
      { data: expiredRequests },
    ] = await Promise.all([
      supabase
        .from('matches')
        .select(
          'id, player_a, player_b, profiles!matches_player_a_fkey(push_token), profiles!matches_player_b_fkey(push_token)',
        )
        .eq('status', 'upcoming')
        .gte('start_time', h24start)
        .lte('start_time', h24end),
      supabase
        .from('matches')
        .select('id, player_a, player_b')
        .eq('status', 'upcoming')
        .gte('start_time', min15start)
        .lte('start_time', min15end),
      supabase
        .from('schedule_requests')
        .select(
          'id, requester_id, profiles!schedule_requests_requester_id_fkey(push_token)',
        )
        .eq('status', 'pending')
        .lte('expires_at', now.toISOString()),
    ]);

    // Send 24h reminders
    for (const match of upcoming24h ?? []) {
      const tokens = [
        (match.profiles as unknown as { push_token: string | null }[])?.[0]
          ?.push_token,
      ].filter(Boolean) as string[];
      for (const token of tokens) {
        await sendPush(
          token,
          'Match tomorrow',
          "You have a tennis match in 24 hours. Don't forget!",
          {
            screen: '/(tabs)/matches',
            matchId: match.id,
          },
        );
      }
    }

    // Send 15min reminders
    for (const match of upcoming15m ?? []) {
      const { data: players } = await supabase
        .from('profiles')
        .select('push_token')
        .in('id', [match.player_a, match.player_b]);

      for (const p of players ?? []) {
        if (p.push_token) {
          await sendPush(
            p.push_token,
            'Match starting soon!',
            'Your tennis match starts in 15 minutes.',
            {
              screen: '/(tabs)/matches',
              matchId: match.id,
            },
          );
        }
      }
    }

    // Expire pending requests older than 48h
    for (const req of expiredRequests ?? []) {
      await supabase
        .from('schedule_requests')
        .update({ status: 'expired' })
        .eq('id', req.id);

      const token = (
        req.profiles as unknown as { push_token: string | null } | null
      )?.push_token;
      if (token) {
        await sendPush(
          token,
          'Request expired',
          'Your match request expired after 48 hours.',
          {
            screen: '/(tabs)/matches',
            requestId: req.id,
          },
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
