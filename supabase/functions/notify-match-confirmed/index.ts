import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  matchId: string;
  opponentId: string;
}

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

serve(async (req: Request): Promise<Response> => {
  try {
    const { matchId, opponentId } = (await req.json()) as RequestBody;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, push_token')
      .eq('id', opponentId)
      .single();

    if (profile?.push_token) {
      await sendPush(
        profile.push_token,
        'Match confirmed!',
        `${profile.full_name} booked a tennis match with you.`,
        { screen: `/match/${matchId}` },
      );
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
