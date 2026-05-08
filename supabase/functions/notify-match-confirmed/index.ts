import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  matchId: string;
  opponentId: string;
}

serve(async (req: Request): Promise<Response> => {
  try {
    const { matchId, opponentId } = (await req.json()) as RequestBody;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Look up opponent's push token (column added in Phase 7)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', opponentId)
      .single();

    // Send push if token exists (Phase 7 wires this fully)
    const pushToken: string | null = null; // replaced with profile.push_token in Phase 7

    if (pushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: pushToken,
          title: 'Match scheduled',
          body: `${profile?.full_name ?? 'A player'} booked a match with you.`,
          data: { screen: 'match', matchId },
        }),
      });
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
