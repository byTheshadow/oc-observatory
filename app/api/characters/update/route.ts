import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 更新角色单字段并写入 history_logs。
 * body: { id, field, value, editorName? }
 * field 支持：
 *   - 'avatar_url' / 'bio' / 'name' （顶级列）
 *   - 'basic_info.<key>'            （jsonb 子字段）
 *   - 'sections.<key>'              （jsonb 子字段）
 * value 传 null 或 undefined 表示删除该子字段（顶级列则设为 null/空串）。
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const { id, field, value, editorName } = await req.json();
    if (!id || typeof field !== 'string') {
      return NextResponse.json({ ok: false, error: '参数缺失' }, { status: 400 });
    }

    const sb = await createAdminClient();

    // 读当前行，用来算旧值
    const { data: row, error: readErr } = await sb
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();
    if (readErr || !row) {
      return NextResponse.json({ ok: false, error: '角色不存在' }, { status: 404 });
    }

    let oldContent = '';
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (field === 'avatar_url' || field === 'bio' || field === 'name') {
      oldContent = (row as any)[field] ?? '';
      updatePayload[field] = value ?? '';
    } else if (field.startsWith('basic_info.')) {
      const key = field.slice('basic_info.'.length);
      const bi: Record<string, string> = { ...(row.basic_info ?? {}) };
      oldContent = bi[key] ?? '';
      if (value === null || value === undefined) {
        delete bi[key];
      } else {
        bi[key] = String(value);
      }
      updatePayload.basic_info = bi;
    } else if (field.startsWith('sections.')) {
      const key = field.slice('sections.'.length);
      const sec: Record<string, string> = { ...(row.sections ?? {}) };
      oldContent = sec[key] ?? '';
      if (value === null || value === undefined) {
        delete sec[key];
      } else {
        sec[key] = String(value);
      }
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
      .eq('id', id);
    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    // 旧值非空才记录，避免"从无到有"也塞一条空历史
    if (oldContent !== '' && oldContent !== null && oldContent !== undefined) {
      await sb.from('history_logs').insert({
        target_type: 'character',
        target_id: id,
        field_name: field,
        old_content: String(oldContent),
        editor_name: editorName || '协作者',
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
