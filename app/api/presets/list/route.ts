import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 拉自定义人设或世界书条目。
 * body: { category?: 'preset' | 'worldbook' }  不传则全部
 */
export async function POST(req: Request) {
  try {
    const { category } = await req.json().catch(() => ({}));
    const sb = await createAdminClient();
    let q = sb
      .from('custom_presets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (category) q = q.eq('category', category);
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
