'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type StoryRow = {
  id: string;
  title: string;
  character_ids: string[];
  word_count: number;
  source: string;
  created_at: string;
  updated_at: string;
};
export type CharacterLite = { id: string; name: string };

const PW_KEY = 'oc-edit-password';
function getPassword() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PW_KEY) ?? '';
}
async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': getPassword(),
    },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({ ok: false, error: '响应异常' }));
  if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}

export default function StoriesList({
  initialStories,
  characters,
}: {
  initialStories: StoryRow[];
  characters: CharacterLite[];
}) {
  const router = useRouter();
  const [list] = useState<StoryRow[]>(initialStories);
  const [unlocked, setUnlocked] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setUnlocked(!!getPassword());
    const onStorage = () => setUnlocked(!!getPassword());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const charMap = new Map(characters.map((c) => [c.id, c.name]));

  async function createEmpty() {
    if (creating) return;
    setCreating(true);
    try {
      const j = await postJSON('/api/stories/create', {
        title: '未命名短打',
        content: '',
        characterIds: [],
        source: 'manual',
      });
      router.push(`/stories/${j.id}?edit=1`);
    } catch (e: any) {
      alert(e?.message ?? '创建失败');
      setCreating(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 md:pb-32">
      {unlocked && (
        <div className="mb-10 flex justify-center">
          <button
            onClick={createEmpty}
            disabled={creating}
            className="rounded-full border border-white/20 bg-white/[0.03] px-6 py-2 text-xs tracking-[0.3em] text-white/85 transition hover:border-white/45 hover:bg-white/[0.08] disabled:opacity-50"
          >
            {creating ? '创建中…' : '+ 新建短打'}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-sm text-white/70">还没有短打</p>
          {unlocked ? (
            <p className="mt-2 text-xs text-white/40">点上方&ldquo;新建短打&rdquo;开始</p>
          ) : (
            <p className="mt-2 text-xs text-white/40">解锁后可以新建</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {list.map((s) => (
            <Link
              key={s.id}
              href={`/stories/${s.id}`}
              className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25 hover:bg-white/[0.06] md:p-7"
            >
              <h3 className="font-cn text-lg tracking-[0.1em] text-white/90 group-hover:text-white md:text-xl">
                {s.title || '未命名短打'}
              </h3>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] tracking-widest text-white/45">
                <span>{new Date(s.updated_at).toLocaleDateString('zh-CN')}</span>
                <span className="text-white/20">·</span>
                <span>{s.word_count} 字</span>
                {s.source === 'ai_workspace' && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-white/60">AI 归档</span>
                  </>
                )}
              </div>

              {s.character_ids.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.character_ids.map((cid) => (
                    <span
                      key={cid}
                      className="rounded-full border border-white/15 px-3 py-1 text-[11px] tracking-widest text-white/70"
                    >
                      {charMap.get(cid) ?? '未知角色'}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
