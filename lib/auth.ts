/**
 * 服务端密码校验通用函数。
 * 请求头带 x-admin-password: <明文密码>，与环境变量 ADMIN_PASSWORD 比对。
 */

async function getAdminPassword(): Promise<string | undefined> {
  let expected: string | undefined = process.env.ADMIN_PASSWORD;
  if (!expected) {
    try {
      const mod: any = await import('@cloudflare/next-on-pages');
      const ctx = mod?.getRequestContext?.();
      expected = ctx?.env?.ADMIN_PASSWORD;
    } catch {
      // 非 Cloudflare 环境，忽略
    }
  }
  return expected;
}

export async function verifyAdmin(
  req: Request,
): Promise<{ ok: boolean; error?: string }> {
  const expected = await getAdminPassword();
  if (!expected) {
    return { ok: false, error: '服务端未配置密码' };
  }
  const header = req.headers.get('x-admin-password') ?? '';
  if (header && header === expected) {
    return { ok: true };
  }
  return { ok: false, error: '密码不正确或未提供' };
}
