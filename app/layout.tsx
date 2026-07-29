import type { Metadata } from 'next';
import { Cormorant_Garamond, Noto_Serif_SC } from 'next/font/google';
import './globals.css';

// 英文衬线：主标题斜体气质
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// 中文衬线：正文与标题
const cn = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-cn',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '龙鼠历险',
  description: '此地无声，尚有山海。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${display.variable} ${cn.variable}`}>
      <body className="font-cn">{children}</body>
    </html>
  );
}
