import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, type Character } from '@/lib/supabase';
import CharacterDetail from './CharacterDetail';

export const runtime = 'edge';
export const revalidate = 0;

async function loadCharacter(id: string): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Character;
}

export default async function CharacterDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const character = await loadCharacter(params.id);
  if (!character) notFound();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 顶部导航 */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link
          href="/characters"
          className="group flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          aria-label="返回角色列表"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:-translate-x-0.5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="tracking-widest">返回</span>
        </Link>
        <span className="font-display italic text-lg md:text-xl text-white/90">
          龙鼠历险
        </span>
        <span aria-hidden className="w-[52px] md:w-[64px]" />
      </header>

      <CharacterDetail initial={character} />
    </main>
  );
}
