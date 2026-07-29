import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const info: any = {
    has_url: !!url,
    url_prefix: url ? url.slice(0, 30) : null,
    has_anon_key: !!key,
    key_length: key ? key.length : 0,
  };

  if (!url || !key) {
    info.error = 'env not injected';
    return NextResponse.json(info);
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error, count } = await supabase
      .from('characters')
      .select('id, name', { count: 'exact' });

    info.query_error = error?.message ?? null;
    info.count = count;
    info.rows = data;
  } catch (e: any) {
    info.exception = e?.message ?? String(e);
  }
  return NextResponse.json(info);
}
