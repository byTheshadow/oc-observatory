import { createClient } from '@supabase/supabase-js';

/** 去掉尾部空格和斜杠，避免拼路径时出双斜杠导致 Invalid path 报错 */
function normalizeUrl(u?: string) {
  return (u ?? '').trim().replace(/\/+$/, '');
}

const SUPABASE_URL = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false },
});

/** 角色表行类型（前端读用） */
export type Character = {1150
  id: string;
  name: string;
  avatar_url: string | null;
  basic_info: Record<string, string>;
  bio: string;
  sections: Record<string, string>;
  gallery: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};
