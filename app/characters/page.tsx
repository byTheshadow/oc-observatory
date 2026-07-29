import { supabase, type Character } from '@/lib/supabase';
import CharacterCard from '@/components/CharacterCard';
import TopNav from '@/components/TopNav';

// Cloudflare Pages 需要 edge runtime
export const runtime = 'edge';
// 每次请求都读最新数据（不做静态缓存，编辑后立即可见）
export const revalidate = 0;

async function loadCharacters(): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('load characters error:', error);
    return [];
  }
  return (data ?? []) as Character[];
}

export default async function CharactersPage() {
  const list = await loadCharacters();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <TopNav />

      {/* 标题区 */}
      <section className="mx-auto max-w-7xl px-6 pt-4 pb-10 text-center md:px-10 md:pt-6 md:pb-14">
        <h1
          className="font-cn font-light tracking-[0.15em] animate-fade-up [animation-delay:0.1s] [animation-fill-mode:both]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
        >
          角色档案
        </h1>
        <p className="mt-3 text-[11px] tracking-[0.4em] text-white/50 md:text-xs animate-fade-up [animation-delay:0.3s] [animation-fill-mode:both]">
          CHARACTERS
        </p>
      </section>

      {/* 卡片区 */}
      <section className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
            {list.map((c, i) => (
              <CharacterCard key={c.id} character={c} delayMs={400 + i * 180} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <p className="text-sm text-white/70">还没有角色数据</p>
      <p className="mt-2 text-xs text-white/40">
        请到 Supabase 检查 characters 表是否有数据
      </p>
    </div>
  );
}
