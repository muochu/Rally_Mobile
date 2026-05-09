// Triggered by Supabase DB webhook on INSERT to schedule_requests
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  record: { id: string; requester_id: string; recipient_id: string };
}

serve(async (req: Request): Promise<Response> => {
  try {
    const { record } = (await req.json()) as WebhookPayload;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const [{ data: requester }, { data: recipient }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', record.requester_id)
        .single(),
      supabase
        .from('profiles')
        .select('push_token')
        .eq('id', record.recipient_id)
        .single(),
    ]);

    if (recipient?.push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.push_token,
          title: 'New match request',
          body: `${requester?.full_name ?? 'Someone'} wants to play tennis with you.`,
          data: { screen: '/(tabs)/matches', requestId: record.id },
          sound: 'default',
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
