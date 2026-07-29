import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

/**
 * 上传角色立绘到 Supabase Storage（bucket: oc-images），返回 public url。
 * 使用 multipart/form-data:
 *   - file: File
 *   - characterId: string  （用于文件命名前缀）
 * 需要 x-admin-password 头。
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const characterId = String(form.get('characterId') ?? '');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: '未收到文件' }, { status: 400 });
    }
    if (!characterId) {
      return NextResponse.json({ ok: false, error: '缺少 characterId' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: '图片超过 8MB' }, { status: 400 });
    }

    // 从文件名取后缀，退到 mime 猜
    const rawName = (file as any).name ?? 'upload';
    const dotIdx = rawName.lastIndexOf('.');
    const extFromName = dotIdx >= 0 ? rawName.slice(dotIdx + 1).toLowerCase() : '';
    const mime = file.type || '';
    const ext =
      extFromName ||
      (mime.includes('png') ? 'png' :
       mime.includes('webp') ? 'webp' :
       mime.includes('gif') ? 'gif' :
       mime.includes('jpeg') ? 'jpg' : 'jpg');

    const path = `avatars/${characterId}/${Date.now()}.${ext}`;
    const buf = await file.arrayBuffer();

    const sb = await createAdminClient();
    const { error: upErr } = await sb.storage
      .from('oc-images')
      .upload(path, buf, {
        contentType: mime || 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      });
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const { data: pub } = sb.storage.from('oc-images').getPublicUrl(path);
    return NextResponse.json({ ok: true, url: pub.publicUrl, path });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? '上传失败' },
      { status: 500 },
    );
  }
}
