import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export const runtime = 'edge';

function normalizeBase(url: string) {
  return url.trim().replace(/\/+$/, '');
}

/**
 * 转发到 openai 兼容 /chat/completions。
 * body: {
 *   baseUrl, apiKey, model,
 *   messages: [{role, content}],
 *   stream?: boolean,
 *   temperature?: number,
 *   max_tokens?: number,
 * }
 * stream=true 时返回 SSE 流；否则返回 JSON。
 * 服务端不保存任何字段。
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      baseUrl,
      apiKey,
      model,
      messages,
      stream = true,
      temperature,
      max_tokens,
    } = body ?? {};

    if (!baseUrl || !apiKey || !model || !Array.isArray(messages)) {
      return NextResponse.json(
        { ok: false, error: '缺少 baseUrl / apiKey / model / messages' },
        { status: 400 },
      );
    }

    const url = `${normalizeBase(String(baseUrl))}/chat/completions`;
    const payload: Record<string, unknown> = {
      model,
      messages,
      stream,
    };
    if (typeof temperature === 'number') payload.temperature = temperature;
    if (typeof max_tokens === 'number' && max_tokens > 0)
      payload.max_tokens = max_tokens;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json(
        {
          ok: false,
          error: `上游 ${upstream.status}: ${errText.slice(0, 500)}`,
        },
        { status: 502 },
      );
    }

    // 流式：直接透传 SSE
    if (stream) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // 非流式：拿完整 JSON 再回
    const json = await upstream.json();
    const content =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.text ??
      '';
    return NextResponse.json({ ok: true, content, raw: json });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '请求异常' },
      { status: 500 },
    );
  }
}
