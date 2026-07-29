'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/characters', label: '角色' },
  { href: '/stories', label: '短打' },
  { href: '/ai-workspace', label: 'AI 工作台' },
];

export default function TopNav({ backHref = '/' }: { backHref?: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
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

      {/* 右：占位保持对称 */}
      <span aria-hidden className="w-[54px]" />
    </header>
  );
}
