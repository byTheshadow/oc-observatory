import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export const runtime = 'edge';

/** 去掉末尾斜杠，把常见的 openai 兼容根路径统一 */
function normalizeBase(url: string) {
  return url.trim().replace(/\/+$/, '');
}

/**
 * 拉模型列表，透传到用户填的 openai 兼容 endpoint。
 * body: { baseUrl, apiKey }
 * 服务端不保存 baseUrl / apiKey。
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const { baseUrl, apiKey } = await req.json();
    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { ok: false, error: '缺少 baseUrl 或 apiKey' },
        { status: 400 },
      );
    }
    const base = normalizeBase(String(baseUrl));
    const url = `${base}/models`;
    const upstream = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: `上游 ${upstream.status}: ${text.slice(0, 300)}` },
        { status: 502 },
      );
    }
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, error: '上游响应不是 JSON' },
        { status: 502 },
      );
    }
    // openai 兼容格式一般是 { data: [{ id, ... }] }
    const rawList: any[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.models)
      ? json.models
      : Array.isArray(json)
      ? json
      : [];
    const ids = rawList
      .map((m: any) => (typeof m === 'string' ? m : m?.id ?? m?.name))
      .filter((v: any) => typeof v === 'string' && v.length > 0);
    return NextResponse.json({ ok: true, models: ids });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
