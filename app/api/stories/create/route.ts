import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

function countChars(s: string): number {
  return (s || '').replace(/\s+/g, '').length;
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? '').trim() || '未命名短打';
    const content = String(body?.content ?? '');
    const characterIds = Array.isArray(body?.characterIds)
      ? body.characterIds.filter((x: any) => typeof x === 'string')
      : [];
    const source = body?.source === 'ai_workspace' ? 'ai_workspace' : 'manual';

    const sb = await createAdminClient();
    const { data, error } = await sb
      .from('stories')
      .insert({
        title,
        content,
        character_ids: characterIds,
        word_count: countChars(content),
        source,
      })
      .select('id')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data!.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
