import { createClient } from '@supabase/supabase-js';

/**
 * 浏览器 & 服务端只读场景使用：anon key。
 * 只能触发被 RLS 允许的读操作，写操作会被拒。
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
  },
);

/** 角色表行类型（前端读用） */
export type Character = {
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
