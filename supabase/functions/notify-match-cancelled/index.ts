// Triggered by Supabase DB webhook on UPDATE to matches (status → cancelled)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  record: { id: string; player_a: string; player_b: string; status: string };
  old_record: { status: string };
}

serve(async (req: Request): Promise<Response> => {
  try {
    const { record, old_record } = (await req.json()) as WebhookPayload;

    if (record.status !== 'cancelled' || old_record.status === 'cancelled') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // We don't know who cancelled — notify both players and each side filters via app state
    const [{ data: playerA }, { data: playerB }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, push_token')
        .eq('id', record.player_a)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, push_token')
        .eq('id', record.player_b)
        .single(),
    ]);

    const pushPayloads = [
      playerA?.push_token && {
        to: playerA.push_token,
        title: 'Match cancelled',
        body: `Your match with ${playerB?.full_name ?? 'your opponent'} was cancelled.`,
        data: { screen: '/(tabs)/matches', matchId: record.id },
        sound: 'default',
      },
      playerB?.push_token && {
        to: playerB.push_token,
        title: 'Match cancelled',
        body: `Your match with ${playerA?.full_name ?? 'your opponent'} was cancelled.`,
        data: { screen: '/(tabs)/matches', matchId: record.id },
        sound: 'default',
      },
    ].filter(Boolean);

    await Promise.all(
      pushPayloads.map((payload) =>
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      ),
    );

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
