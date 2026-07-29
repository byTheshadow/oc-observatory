'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const HOLD_DURATION = 800; // 长按毫秒数

export default function HoldToEnter({ href }: { href: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const tick = (t: number) => {
    if (startRef.current == null) startRef.current = t;
    const elapsed = t - startRef.current;
    const p = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(p);
    if (p < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else if (!doneRef.current) {
      doneRef.current = true;
      setTimeout(() => router.push(href), 140);
    }
  };

  const start = () => {
    if (doneRef.current) return;
    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (doneRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setProgress(0);
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const size = 56;
  const stroke = 1.5;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        aria-label="按住启程"
        className="relative grid place-items-center rounded-full transition-transform active:scale-95"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          {/* 背景圈 */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={stroke}
          />
          {/* 进度圈 */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: progress === 0 ? 'stroke-dashoffset 300ms ease-out' : 'none' }}
          />
        </svg>
        {/* 中心小点 */}
        <span className="absolute h-1.5 w-1.5 rounded-full bg-white/85" />
      </button>
      <span className="text-[10px] md:text-xs tracking-[0.35em] text-white/75">
        按住启程
      </span>
    </div>
  );
}
