import { NextResponse } from 'next/server';

// Cloudflare Pages 需要 edge runtime
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return NextResponse.json({ ok: false, error: '服务端未配置密码' }, { status: 500 });
    }
    if (typeof password === 'string' && password === expected) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: '请求异常' }, { status: 400 });
  }
}
