'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/characters', label: '角色' },
  { href: '/stories', label: '短打' },
  { href: '/ai-workspace', label: 'AI 工作台' },
];

export default function TopNav({ backHref = '/' }: { backHref?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
      {/* 左：返回 */}
      <Link
        href={backHref}
        className="group flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        aria-label="返回"
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

      {/* 中：桌面 nav（手机隐藏） */}
      <nav className="hidden items-center gap-6 md:flex">
        {NAV_ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={
              isActive(it.href)
                ? 'text-sm tracking-widest text-white'
                : 'text-sm tracking-widest text-white/55 transition-colors hover:text-white/90'
            }
          >
            {it.label}
          </Link>
        ))}
      </nav>

      {/* 中：手机上显示站名（桌面隐藏） */}
      <span className="font-display italic text-lg text-white/85 md:hidden">
        龙鼠历险
      </span>

      {/* 右：手机端菜单按钮（桌面隐藏，保留 w-[54px] 宽度以维持对称布局） */}
      <div className="flex w-[54px] justify-end">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          aria-label={isOpen ? '关闭菜单' : '打开菜单'}
        >
          {isOpen ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
        {/* 桌面端隐藏按钮，但保留空占位保持与左侧返回按钮的宽度对称 */}
        <span aria-hidden className="hidden md:block w-[54px]" />
      </div>

      {/* 手机端下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-6 right-6 z-50 mt-2 rounded-xl border border-white/10 bg-neutral-900/95 p-4 shadow-xl backdrop-blur-md md:hidden">
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setIsOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm tracking-widest transition-colors ${
                  isActive(it.href)
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
