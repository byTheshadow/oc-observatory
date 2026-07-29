'use client';

import { useEffect, useState } from 'react';
import HoldToEnter from '@/components/HoldToEnter';
import PasswordLock from '@/components/PasswordLock';

// TODO: 后续把首页背景图 URL 填到这里；为空时用深色渐变兜底
const BG_IMAGE_URL = 'https://img3.tofaka.com/autoupload/amqnh/20260729/ygCN/1456X816/metro.ant_Two_extremely_cute_chibi_boys_taking_a_nap_together_47396ccf-c6a2-4df9-b552-29d98d41d471_3.png/webp';

export default function Home() {
  // 鼠标位置：用于背景视差
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth  - 0.5) * 2; // -1 ~ 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#0a0a0a] text-white">
      {/* 背景层（Ken Burns 缓慢缩放 + 鼠标视差） */}
      <div
        className="absolute inset-[-4%] bg-cover bg-center animate-ken-burns"
        style={{
          backgroundImage: BG_IMAGE_URL
            ? `url(${BG_IMAGE_URL})`
            : 'linear-gradient(135deg, #171412 0%, #2a2520 45%, #14110f 100%)',
          transform: `translate3d(${mouse.x * -8}px, ${mouse.y * -8}px, 0)`,
          transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* 深色蒙层 + 顶部/底部渐晕 */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

      {/* 光标柔光（仅桌面） */}
      <CursorGlow />

      {/* 左上：站名 */}
      <div className="absolute left-6 top-6 md:left-10 md:top-8 animate-fade-up [animation-delay:0.1s] [animation-fill-mode:both]">
        <span className="font-display italic text-xl md:text-2xl tracking-wide text-white/95">
          龙鼠历险
        </span>
      </div>

      {/* 右上：密码锁 */}
      <div className="absolute right-6 top-6 md:right-10 md:top-8 animate-fade-up [animation-delay:0.2s] [animation-fill-mode:both]">
        <PasswordLock />
      </div>

      {/* 中央：主标题 + 副标题 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
        <h1
          className="font-cn font-light text-white leading-[1.15] tracking-[0.08em]"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}
        >
          <span className="block animate-fade-up [animation-delay:0.5s] [animation-fill-mode:both]">
            此地无声
          </span>
          <span className="block mt-1 md:mt-2 animate-fade-up [animation-delay:0.85s] [animation-fill-mode:both]">
            尚有山海
          </span>
        </h1>
        <p className="mt-8 md:mt-10 text-[11px] md:text-sm text-white/70 tracking-[0.4em] animate-fade-up [animation-delay:1.2s] [animation-fill-mode:both]">
          WHERE STORIES BEGIN
        </p>
      </div>

      {/* 底部中央：按住启程 */}
      <div className="absolute inset-x-0 bottom-10 md:bottom-14 flex justify-center animate-fade-up [animation-delay:1.5s] [animation-fill-mode:both]">
        <HoldToEnter href="/characters" />
      </div>

      {/* 底部左侧：站点铭牌 */}
      <div className="absolute left-6 bottom-8 md:left-10 md:bottom-10 animate-fade-up [animation-delay:1.7s] [animation-fill-mode:both]">
        <span className="text-[10px] md:text-xs tracking-[0.3em] text-white/45">
          EST. 2026 · 龙鼠历险
        </span>
      </div>
    </main>
  );
}

/** 桌面端鼠标柔光；触屏设备自动关闭 */
function CursorGlow() {
  const [pos, setPos] = useState({ x: -400, y: -400 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const leave = () => setVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseleave', leave);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-10 h-[420px] w-[420px] rounded-full transition-opacity duration-500"
      style={{
        left: pos.x - 210,
        top:  pos.y - 210,
        opacity: visible ? 0.35 : 0,
        background: 'radial-gradient(circle, rgba(255,255,255,0.20) 0%, transparent 60%)',
        mixBlendMode: 'screen',
      }}
    />
  );
}
