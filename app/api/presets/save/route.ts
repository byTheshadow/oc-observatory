import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 新增或更新一条自定义人设 / 世界书条目。
 * body: { id?, title, content, category: 'preset' | 'worldbook' }
 * 有 id 就更新，没有就插入。
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const { id, title, content, category } = await req.json();
    if (!title || !category) {
      return NextResponse.json(
        { ok: false, error: '缺少 title 或 category' },
        { status: 400 },
      );
    }
    if (category !== 'preset' && category !== 'worldbook') {
      return NextResponse.json(
        { ok: false, error: 'category 只能是 preset 或 worldbook' },
        { status: 400 },
      );
    }
    const sb = await createAdminClient();
    if (id) {
      const { data, error } = await sb
        .from('custom_presets')
        .update({ title, content: content ?? '', category })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data });
    } else {
      const { data, error } = await sb
        .from('custom_presets')
        .insert({ title, content: content ?? '', category })
        .select()
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data });
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
