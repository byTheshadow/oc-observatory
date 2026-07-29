import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    // Cloudflare Pages 下优先从请求上下文取；本地或非 CF 环境走 process.env
    let expected: string | undefined = process.env.ADMIN_PASSWORD;
    if (!expected) {
      try {
        const mod: any = await import('@cloudflare/next-on-pages');
        const ctx = mod?.getRequestContext?.();
        expected = ctx?.env?.ADMIN_PASSWORD;
      } catch {
        // 忽略：非 Cloudflare 环境
      }
    }

    if (!expected) {
      return NextResponse.json(
        { ok: false, error: '服务端未配置密码，请联系管理员' },
        { status: 500 },
      );
    }
    if (typeof password === 'string' && password === expected) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: '密码不正确' }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: '请求异常' }, { status: 400 });
  }
}

