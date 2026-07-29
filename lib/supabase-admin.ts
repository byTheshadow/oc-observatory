import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function normalizeUrl(u?: string) {
  return (u ?? '').trim().replace(/\/+$/, '');
}

async function readEnv(key: string): Promise<string | undefined> {
  let v: string | undefined = process.env[key];
  if (!v) {
    try {
      const mod: any = await import('@cloudflare/next-on-pages');
      const ctx = mod?.getRequestContext?.();
      v = ctx?.env?.[key];
    } catch {
      // 非 Cloudflare 环境，忽略
    }
  }
  return v;
}

/**
 * 用 service_role key 创建的 Supabase 客户端。
 * 只能在服务端 API 路由里使用，绕过 RLS。绝对不能给到前端。
 */
export async function createAdminClient(): Promise<SupabaseClient> {
  const url = normalizeUrl(await readEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const key = (await readEnv('SUPABASE_SERVICE_ROLE_KEY')) ?? '';
  if (!url || !key) {
    throw new Error('Supabase admin 凭据缺失（URL 或 service_role key）');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
