import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 100)));
    const sb = await createAdminClient();
    const { data, error } = await sb
      .from('stories')
      .select('id,title,character_ids,word_count,source,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
