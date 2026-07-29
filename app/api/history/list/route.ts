import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 拉某目标某字段的历史。
 * body: { targetType, targetId, field? }
 * field 不传就返回该目标全部历史（用于列表面板）。
 */
export async function POST(req: Request) {
  try {
    const { targetType, targetId, field } = await req.json();
    if (!targetType || !targetId) {
      return NextResponse.json({ ok: false, error: '参数缺失' }, { status: 400 });
    }
    const sb = await createAdminClient();
    let q = sb
      .from('history_logs')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (field) q = q.eq('field_name', field);
    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
