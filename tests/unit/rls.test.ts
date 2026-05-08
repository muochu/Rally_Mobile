import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type UserRecord = {
  id: string;
  email: string;
  password: string;
};

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const hasCredentials = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY,
);

const createTestUser = (): UserRecord => {
  const suffix = randomUUID();
  return {
    id: '',
    email: `rls-${suffix}@example.com`,
    password: `Pwd-${suffix}-Aa1!`,
  };
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

describe.skipIf(!hasCredentials)('availability_blocks RLS', () => {
  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let userA: UserRecord;
  let userB: UserRecord;

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    userA = createTestUser();
    userB = createTestUser();

    const createdA = await serviceClient.auth.admin.createUser({
      email: userA.email,
      password: userA.password,
      email_confirm: true,
      user_metadata: { full_name: 'User A' },
    });
    expect(createdA.error).toBeNull();
    expect(createdA.data.user).not.toBeNull();
    userA.id = createdA.data.user?.id ?? '';

    const createdB = await serviceClient.auth.admin.createUser({
      email: userB.email,
      password: userB.password,
      email_confirm: true,
      user_metadata: { full_name: 'User B' },
    });
    expect(createdB.error).toBeNull();
    expect(createdB.data.user).not.toBeNull();
    userB.id = createdB.data.user?.id ?? '';

    const inserted = await serviceClient.from('availability_blocks').insert({
      user_id: userB.id,
      start_time: '2026-05-06T16:00:00.000Z',
      end_time: '2026-05-06T17:30:00.000Z',
      source: 'google',
    });
    expect(inserted.error).toBeNull();
  });

  afterAll(async () => {
    if (isUuid(userB.id)) {
      await serviceClient
        .from('availability_blocks')
        .delete()
        .eq('user_id', userB.id);
      await serviceClient.auth.admin.deleteUser(userB.id);
    }

    if (isUuid(userA.id)) {
      await serviceClient.auth.admin.deleteUser(userA.id);
    }
  });

  it("prevents user A from reading user B's availability blocks", async () => {
    const login = await anonClient.auth.signInWithPassword({
      email: userA.email,
      password: userA.password,
    });
    expect(login.error).toBeNull();

    const query = await anonClient
      .from('availability_blocks')
      .select('id,user_id,start_time,end_time,source,synced_at')
      .eq('user_id', userB.id);

    expect(query.error).toBeNull();
    expect(query.data).toEqual([]);
  });
});
