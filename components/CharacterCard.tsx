'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Character } from '@/lib/supabase';

type Props = {
  character: Character;
  delayMs?: number;
};

export default function CharacterCard({ character, delayMs = 0 }: Props) {
  const { id, name, avatar_url, basic_info } = character;
  const subtitle =
    basic_info?.['字'] ? `字 · ${basic_info['字']}` :
    basic_info?.['外号'] ? basic_info['外号'] :
    basic_info?.['本体'] || '';

  return (
    <Link
      href={`/characters/${id}`}
      aria-label={`查看 ${name}`}
      className="group block animate-fade-up [animation-fill-mode:both]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-all duration-500 hover:border-white/25 hover:bg-white/[0.04] hover:shadow-[0_20px_60px_-20px_rgba(255,255,255,0.15)]">
        {/* 立绘区 9:16 */}
        <div className="relative aspect-[9/16] w-full overflow-hidden bg-gradient-to-br from-[#1a1815] via-[#221e19] to-[#0f0d0b]">
          {avatar_url ? (
            <Image
              src={avatar_url}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              priority={false}
            />
          ) : (
            <PlaceholderArt name={name} />
          )}

          {/* 底部渐晕，让名字更清晰 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          {/* 名字与副标题 */}
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <h2
              className="font-cn font-light leading-tight tracking-[0.12em] text-white transition-transform duration-500 group-hover:translate-y-[-2px]"
              style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.5rem)' }}
            >
              {name}
            </h2>
            {subtitle && (
              <p className="mt-2 text-[11px] tracking-[0.3em] text-white/60 md:text-xs">
                {subtitle}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 text-[10px] tracking-[0.35em] text-white/40 transition-colors group-hover:text-white/80 md:text-xs">
              <span>进入档案</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.6"
                   strokeLinecap="round" strokeLinejoin="round"
                   className="transition-transform duration-500 group-hover:translate-x-1">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

/** 无立绘时的占位：中央大字 + 微光晕 */
function PlaceholderArt({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        aria-hidden
        className="absolute h-2/3 w-2/3 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)',
        }}
      />
      <span
        className="font-cn text-white/15 tracking-[0.3em]"
        style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
      >
        {name?.[0] ?? '—'}
      </span>
    </div>
  );
}
