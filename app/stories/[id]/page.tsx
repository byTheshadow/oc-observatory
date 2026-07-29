import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import StoryDetail from './StoryDetail';

export const runtime = 'edge';
export const revalidate = 0;

type CharLite = { id: string; name: string };

async function loadStory(id: string) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

async function loadCharacters(): Promise<CharLite[]> {
  const { data } = await supabase
    .from('characters')
    .select('id,name')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  return (data ?? []) as CharLite[];
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit?: string };
}) {
  const [story, characters] = await Promise.all([
    loadStory(params.id),
    loadCharacters(),
  ]);
  if (!story) notFound();
  return (
    <StoryDetail
      initial={story}
      characters={characters}
      initialEdit={searchParams?.edit === '1'}
    />
  );
}
