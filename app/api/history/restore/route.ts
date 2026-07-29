import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 把某条历史里的 old_content 恢复回目标字段。
 * body: { historyId, editorName? }
 * 恢复前的当前值会再存一条历史，以便再次回退。
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const { historyId, editorName } = await req.json();
    if (!historyId) {
      return NextResponse.json({ ok: false, error: '参数缺失' }, { status: 400 });
    }

    const sb = await createAdminClient();
    const { data: hist, error: hErr } = await sb
      .from('history_logs')
      .select('*')
      .eq('id', historyId)
      .single();
    if (hErr || !hist) {
      return NextResponse.json({ ok: false, error: '历史记录不存在' }, { status: 404 });
    }
    if (hist.target_type !== 'character') {
      return NextResponse.json({ ok: false, error: '暂不支持的类型' }, { status: 400 });
    }

    const { data: row, error: rErr } = await sb
      .from('characters')
      .select('*')
      .eq('id', hist.target_id)
      .single();
    if (rErr || !row) {
      return NextResponse.json({ ok: false, error: '目标不存在' }, { status: 404 });
    }

    const field = hist.field_name as string;
    const restoreValue = hist.old_content ?? '';
    let currentValue = '';
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (field === 'avatar_url' || field === 'bio' || field === 'name') {
      currentValue = (row as any)[field] ?? '';
      updatePayload[field] = restoreValue;
    } else if (field.startsWith('basic_info.')) {
      const key = field.slice('basic_info.'.length);
      const bi: Record<string, string> = { ...(row.basic_info ?? {}) };
      currentValue = bi[key] ?? '';
      bi[key] = String(restoreValue);
      updatePayload.basic_info = bi;
    } else if (field.startsWith('sections.')) {
      const key = field.slice('sections.'.length);
      const sec: Record<string, string> = { ...(row.sections ?? {}) };
      currentValue = sec[key] ?? '';
      sec[key] = String(restoreValue);
      updatePayload.sections = sec;
    } else {
      return NextResponse.json(
        { ok: false, error: `不支持的字段：${field}` },
        { status: 400 },
      );
    }

    const { error: updErr } = await sb
      .from('characters')
      .update(updatePayload)
      .eq('id', hist.target_id);
    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    if (currentValue !== '' && currentValue !== null && currentValue !== undefined) {
      await sb.from('history_logs').insert({
        target_type: 'character',
        target_id: hist.target_id,
        field_name: field,
        old_content: String(currentValue),
        editor_name: (editorName || '协作者') + '（恢复操作）',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
