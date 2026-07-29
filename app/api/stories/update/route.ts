import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

function countChars(s: string): number {
  return (s || '').replace(/\s+/g, '').length;
}

const ALLOWED = new Set(['title', 'content', 'character_ids']);

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? '');
    const field = String(body?.field ?? '');
    const editor = String(body?.editor ?? '协作者');
    if (!id || !ALLOWED.has(field)) {
      return NextResponse.json(
        { ok: false, error: '参数不合法' },
        { status: 400 },
      );
    }
    const sb = await createAdminClient();

    // 读旧值用于历史存档
    const { data: old, error: readErr } = await sb
      .from('stories')
      .select('title,content,character_ids')
      .eq('id', id)
      .single();
    if (readErr) throw readErr;

    // 组装 patch
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (field === 'title') {
      patch.title = String(body?.value ?? '').trim() || '未命名短打';
    } else if (field === 'content') {
      const content = String(body?.value ?? '');
      patch.content = content;
      patch.word_count = countChars(content);
    } else if (field === 'character_ids') {
      patch.character_ids = Array.isArray(body?.value)
        ? body.value.filter((x: any) => typeof x === 'string')
        : [];
    }

    // 记录历史（旧值有内容才记）
    const oldVal =
      field === 'character_ids'
        ? JSON.stringify((old as any)?.character_ids ?? [])
        : String((old as any)?.[field] ?? '');
    const shouldLog =
      field === 'character_ids' ? oldVal !== '[]' : oldVal !== '';
    if (shouldLog) {
      await sb.from('history_logs').insert({
        target_type: 'story',
        target_id: id,
        field_name: field,
        old_content: oldVal,
        editor_name: editor,
      });
    }

    const { error } = await sb.from('stories').update(patch).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
