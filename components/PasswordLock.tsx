'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const LS_KEY = 'oc-edit-password';

export default function PasswordLock() {
  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    setUnlocked(!!localStorage.getItem(LS_KEY));
  }, []);

  // 打开弹窗时禁止背景滚动
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const submit = async () => {
    if (!input) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        localStorage.setItem(LS_KEY, input);
        setUnlocked(true);
        setOpen(false);
        setInput('');
      } else {
        setError(data.error || '密码不正确');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const lockOut = () => {
    localStorage.removeItem(LS_KEY);
    setUnlocked(false);
  };

  const modal = open && (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 backdrop-blur-sm px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 md:p-8 text-ink-main shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-cn text-lg md:text-xl leading-relaxed">
          我已经等你很久啦
        </h2>
        <p className="mt-2 mb-5 text-sm text-ink-muted leading-relaxed">
          快进来吧，不对不对，你要先输入密码才可以喔！！
        </p>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="请输入密码"
          className="h-11 w-full rounded-lg border border-ink-line px-3 outline-none transition-colors focus:border-ink-accent"
        />
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="h-9 rounded-lg px-4 text-sm text-ink-muted transition-colors hover:bg-ink-soft"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={loading || !input}
            className="h-9 rounded-lg bg-ink-main px-4 text-sm text-white transition-colors hover:bg-ink-main/90 disabled:opacity-50"
          >
            {loading ? '验证中…' : '解锁'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => (unlocked ? lockOut() : setOpen(true))}
        aria-label={unlocked ? '锁定编辑' : '解锁编辑'}
        title={unlocked ? '已解锁 · 点击锁定' : '锁定 · 点击输入密码'}
        className="grid h-9 w-9 place-items-center rounded-full text-white/85 hover:text-white hover:bg-white/10 transition-colors"
      >
        {unlocked ? <UnlockIcon /> : <LockIcon />}
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 7.5-1.8" />
    </svg>
  );
}
