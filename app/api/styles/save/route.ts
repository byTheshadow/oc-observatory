import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 新增或更新一条文风。
 * body: { id?, name, description? }
 * 有 id 就更新；预置（is_preset=true）不允许修改。
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const { id, name, description } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ ok: false, error: '缺少 name' }, { status: 400 });
    }
    const sb = await createAdminClient();
    if (id) {
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
          { ok: false, error: '预置文风不可修改' },
          { status: 400 },
        );
      }
      const { data, error } = await sb
        .from('writing_styles')
        .update({
          name: String(name).trim(),
          description: description ?? '',
        })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data });
    } else {
      const { data, error } = await sb
        .from('writing_styles')
        .insert({
          name: String(name).trim(),
          description: description ?? '',
          is_preset: false,
        })
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
