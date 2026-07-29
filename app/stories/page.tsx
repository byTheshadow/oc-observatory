import TopNav from '@/components/TopNav';
import StoriesList, { type StoryRow, type CharacterLite } from './StoriesList';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const revalidate = 0;

async function loadCharacters(): Promise<CharacterLite[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('id,name')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.error('load characters error:', error);
    return [];
  }
  return (data ?? []) as CharacterLite[];
}

async function loadStories(): Promise<StoryRow[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id,title,character_ids,word_count,source,created_at,updated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('load stories error:', error);
    return [];
  }
  return (data ?? []) as StoryRow[];
}

export default async function StoriesPage() {
  const [stories, characters] = await Promise.all([
    loadStories(),
    loadCharacters(),
  ]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <TopNav />

      <section className="mx-auto max-w-7xl px-6 pt-4 pb-8 text-center md:px-10 md:pt-6 md:pb-12">
        <h1
          className="font-cn font-light tracking-[0.15em] animate-fade-up [animation-fill-mode:both]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
        >
          短打放映室
        </h1>
        <p className="mt-3 text-[11px] tracking-[0.4em] text-white/50 animate-fade-up [animation-delay:0.15s] [animation-fill-mode:both]">
          STORIES
        </p>
      </section>

      <StoriesList initialStories={stories} characters={characters} />
    </main>
  );
}
