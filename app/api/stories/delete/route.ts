import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? '');
    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少 id' }, { status: 400 });
    }
    const sb = await createAdminClient();
    const { error } = await sb.from('stories').delete().eq('id', id);
    if (error) throw error;
    // 顺手清掉这条短打的所有历史
    await sb
      .from('history_logs')
      .delete()
      .eq('target_type', 'story')
      .eq('target_id', id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
