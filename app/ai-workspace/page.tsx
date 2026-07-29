import { supabase } from '@/lib/supabase';
import AIWorkspace from './AIWorkspace';

export const runtime = 'edge';
export const revalidate = 0;

async function loadInitial() {
  const [c, s, p] = await Promise.all([
    supabase
      .from('characters')
      .select('id,name,avatar_url,basic_info,sections,bio,sort_order')
      .order('sort_order', { ascending: true }),
    supabase.from('writing_styles').select('id,name,description,is_preset'),
    supabase
      .from('custom_presets')
      .select('id,title,content,category')
      .order('created_at', { ascending: false }),
  ]);
  const presets = (p.data ?? []) as any[];
  return {
    characters: (c.data ?? []) as any[],
    styles: (s.data ?? []) as any[],
    presets: presets.filter((x) => x.category === 'preset'),
    worldbooks: presets.filter((x) => x.category === 'worldbook'),
  };
}

export default async function Page() {
  const initial = await loadInitial();
  return <AIWorkspace initial={initial} />;
}
