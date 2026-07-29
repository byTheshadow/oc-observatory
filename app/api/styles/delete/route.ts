import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 删除一条文风。预置（is_preset=true）不允许删除。
 * body: { id }
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少 id' }, { status: 400 });
    }
    const sb = await createAdminClient();
    const { data: cur, error: e0 } = await sb
      .from('writing_styles')
      .select('is_preset')
      .eq('id', id)
      .single();
    if (e0) {
      return NextResponse.json({ ok: false, error: e0.message }, { status: 500 });
    }
    if (cur?.is_preset) {
      return NextResponse.json(
        { ok: false, error: '预置文风不可删除' },
        { status: 400 },
      );
    }
    const { error } = await sb.from('writing_styles').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
