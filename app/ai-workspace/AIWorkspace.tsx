'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MessageItem, { type Msg } from './MessageItem';
import SettingsDrawer, { type AIConfig } from './SettingsDrawer';
import ParamsBar, { type Defaults } from './ParamsBar';
import PresetManager from './PresetManager';

type Character = {
  id: string;
  name: string;
  avatar_url: string | null;
  basic_info: Record<string, string> | null;
  sections: Record<string, string> | null;
  bio: string | null;
};
type Style = { id: string; name: string; description: string | null };
type Preset = { id: string; title: string; content: string; category: string };

type Session = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Msg[];
};

const PW_KEY = 'oc-edit-password';
const CFG_KEY = 'oc-ai-config';
const SESS_KEY = 'oc-ai-sessions';
const CUR_KEY = 'oc-ai-current';
const DEF_KEY = 'oc-ai-defaults';

const DEFAULT_CONFIG: AIConfig = {
  baseUrl: '',
  apiKey: '',
  model: '',
  stream: true,
};
const DEFAULT_DEFAULTS: Defaults = {
  characterIds: [],
  presetIds: [],
  worldbookIds: [],
  styleId: '',
  viewpoint: '第三人称',
  wordLimit: '1000',
  extra: '',
};

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function getPassword() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PW_KEY) ?? '';
}

export default function AIWorkspace({
  initial,
}: {
  initial: {
    characters: Character[];
    styles: Style[];
    presets: Preset[];
    worldbooks: Preset[];
  };
}) {
  const [characters] = useState<Character[]>(initial.characters);
  const [styles] = useState<Style[]>(initial.styles);
  const [presets, setPresets] = useState<Preset[]>(initial.presets);
  const [worldbooks, setWorldbooks] = useState<Preset[]>(initial.worldbooks);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [defaults, setDefaults] = useState<Defaults>(DEFAULT_DEFAULTS);
  const [unlocked, setUnlocked] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presetMgr, setPresetMgr] = useState<null | 'preset' | 'worldbook'>(null);

  const [input, setInput] = useState('');
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 初始化
  useEffect(() => {
    try {
      const c = localStorage.getItem(CFG_KEY);
      if (c) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(c) });
      const s = localStorage.getItem(SESS_KEY);
      if (s) setSessions(JSON.parse(s));
      const cur = localStorage.getItem(CUR_KEY);
      if (cur) setCurrentId(cur);
      const d = localStorage.getItem(DEF_KEY);
      if (d) setDefaults({ ...DEFAULT_DEFAULTS, ...JSON.parse(d) });
    } catch {}
    setUnlocked(!!getPassword());
  }, []);

  // 持久化
  useEffect(() => {
    try {
      localStorage.setItem(SESS_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);
  useEffect(() => {
    if (currentId) localStorage.setItem(CUR_KEY, currentId);
  }, [currentId]);
  useEffect(() => {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);
  useEffect(() => {
    try {
      localStorage.setItem(DEF_KEY, JSON.stringify(defaults));
    } catch {}
  }, [defaults]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentId) ?? null,
    [sessions, currentId],
  );

  /* ---------- 会话操作 ---------- */
  const newSession = useCallback(() => {
    const id = uuid();
    const s: Session = {
      id,
      title: `新对话 ${sessions.length + 1}`,
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [s, ...prev]);
    setCurrentId(id);
    setSidebarOpen(false);
  }, [sessions.length]);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentId === id) setCurrentId('');
    },
    [currentId],
  );
  const renameSession = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s)),
    );
  }, []);

  function updateCurrentMessages(fn: (m: Msg[]) => Msg[]) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentId
          ? { ...s, messages: fn(s.messages), updatedAt: Date.now() }
          : s,
      ),
    );
  }

  /* ---------- system prompt ---------- */
  function buildSystemPrompt() {
    const parts: string[] = [
      '你正在协助一个原创角色（OC）创作项目：龙鼠历险。请根据以下设定进行创作。',
    ];
    const selChars = characters.filter((c) =>
      defaults.characterIds.includes(c.id),
    );
    if (selChars.length) {
      parts.push('【角色设定】');
      for (const c of selChars) {
        const lines: string[] = [`## ${c.name}`];
        if (c.basic_info && Object.keys(c.basic_info).length) {
          const bi = Object.entries(c.basic_info)
            .map(([k, v]) => `${k}：${v}`)
            .join('；');
          lines.push(`基础：${bi}`);
        }
        if (c.sections) {
          for (const [k, v] of Object.entries(c.sections)) {
            if (v) lines.push(`${k}：${v}`);
          }
        }
        parts.push(lines.join('\n'));
      }
    }
    const selPre = presets.filter((p) => defaults.presetIds.includes(p.id));
    if (selPre.length) {
      parts.push('【补充人设】');
      for (const p of selPre) parts.push(`## ${p.title}\n${p.content}`);
    }
    const selWb = worldbooks.filter((p) =>
      defaults.worldbookIds.includes(p.id),
    );
    if (selWb.length) {
      parts.push('【世界观 / 其他设定】');
      for (const w of selWb) parts.push(`## ${w.title}\n${w.content}`);
    }
    const style = styles.find((s) => s.id === defaults.styleId);
    if (style) {
      parts.push(`【文风】${style.name}${style.description ? '：' + style.description : ''}`);
    }
    if (defaults.viewpoint) parts.push(`【叙述视角】${defaults.viewpoint}`);
    if (defaults.wordLimit && defaults.wordLimit !== 'unlimited') {
      parts.push(`【字数要求】约 ${defaults.wordLimit} 字`);
    }
    if (defaults.extra?.trim()) {
      parts.push(`【附加条件】\n${defaults.extra.trim()}`);
    }
    return parts.join('\n\n');
  }

  /* ---------- 流式解析 ---------- */
  async function callChat(
    messagesForApi: { role: string; content: string }[],
    onDelta: (t: string) => void,
    onDone: () => void,
    onError: (e: string) => void,
  ) {
    if (!config.baseUrl || !config.apiKey || !config.model) {
      onError('请先在左下"设置"里填写 Base URL / API Key / 模型');
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getPassword(),
        },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
          messages: messagesForApi,
          stream: config.stream,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/event-stream')) {
        const j = await res.json();
        if (j.ok && j.content) onDelta(j.content);
        onDone();
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const data = t.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta =
              json?.choices?.[0]?.delta?.content ??
              json?.choices?.[0]?.message?.content ??
              '';
            if (delta) onDelta(delta);
          } catch {}
        }
      }
      onDone();
    } catch (e: any) {
      if (e?.name === 'AbortError') onDone();
      else onError(e?.message ?? '请求失败');
    } finally {
      abortRef.current = null;
    }
  }

  /* ---------- 发送 / 重发 ---------- */
  function ensureSessionForSend(): string {
    if (currentSession) return currentSession.id;
    const id = uuid();
    const s: Session = {
      id,
      title: `新对话 ${sessions.length + 1}`,
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [s, ...prev]);
    setCurrentId(id);
    return id;
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const sid = ensureSessionForSend();
    const userMsg: Msg = {
      id: uuid(),
      role: 'user',
      variants: [text.trim()],
      variantIndex: 0,
      createdAt: Date.now(),
    };
    const aiMsg: Msg = {
      id: uuid(),
      role: 'assistant',
      variants: [''],
      variantIndex: 0,
      createdAt: Date.now(),
    };

    // 追加两条消息 + 自动改标题（若为首条）
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sid) return s;
        const firstUser = !s.messages.some((m) => m.role === 'user');
        return {
          ...s,
          title: firstUser ? text.trim().slice(0, 20) || s.title : s.title,
          updatedAt: Date.now(),
          messages: [...s.messages, userMsg, aiMsg],
        };
      }),
    );
    setInput('');
    setStreamingMsgId(aiMsg.id);

    // 构建 API messages
    const history = (currentSession?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.variants[m.variantIndex] ?? '',
    }));
    const sys = buildSystemPrompt();
    const apiMessages = [
      ...(sys ? [{ role: 'system', content: sys }] : []),
      ...history,
      { role: 'user', content: text.trim() },
    ];

    await callChat(
      apiMessages,
      (delta) => appendVariantByMsgId(aiMsg.id, delta),
      () => setStreamingMsgId(null),
      (err) => {
        appendVariantByMsgId(aiMsg.id, `\n\n[请求失败：${err}]`);
        setStreamingMsgId(null);
      },
    );
  }

  function appendVariantByMsgId(msgId: string, delta: string) {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        messages: s.messages.map((m) => {
          if (m.id !== msgId) return m;
          const idx = m.variantIndex;
          const vs = [...m.variants];
          vs[idx] = (vs[idx] ?? '') + delta;
          return { ...m, variants: vs };
        }),
      })),
    );
  }

  async function reroll(msgId: string) {
    if (!currentSession) return;
    const idx = currentSession.messages.findIndex((m) => m.id === msgId);
    if (idx < 0 || currentSession.messages[idx].role !== 'assistant') return;

    // 追加新 variant，并把 index 指过去
    updateCurrentMessages((msgs) =>
      msgs.map((m) => {
        if (m.id !== msgId) return m;
        return {
          ...m,
          variants: [...m.variants, ''],
          variantIndex: m.variants.length,
        };
      }),
    );
    setStreamingMsgId(msgId);

    // 构建到该 assistant 之前的所有消息（用各自当前 variant）
    const priorMessages = currentSession.messages
      .slice(0, idx)
      .map((m) => ({
        role: m.role,
        content: m.variants[m.variantIndex] ?? '',
      }));
    const sys = buildSystemPrompt();
    const apiMessages = [
      ...(sys ? [{ role: 'system', content: sys }] : []),
      ...priorMessages,
    ];

    await callChat(
      apiMessages,
      (delta) => appendVariantByMsgId(msgId, delta),
      () => setStreamingMsgId(null),
      (err) => {
        appendVariantByMsgId(msgId, `\n\n[请求失败：${err}]`);
        setStreamingMsgId(null);
      },
    );
  }

  function switchVariant(msgId: string, index: number) {
    updateCurrentMessages((msgs) =>
      msgs.map((m) =>
        m.id === msgId ? { ...m, variantIndex: index } : m,
      ),
    );
  }
  function deleteMessage(msgId: string) {
    updateCurrentMessages((msgs) => msgs.filter((m) => m.id !== msgId));
  }
  async function editUserMessage(msgId: string, newText: string) {
    if (!currentSession) return;
    const idx = currentSession.messages.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    // 覆盖该消息，删除其后所有消息
    const kept = currentSession.messages.slice(0, idx);
    const edited: Msg = {
      ...currentSession.messages[idx],
      variants: [newText],
      variantIndex: 0,
    };
    const aiMsg: Msg = {
      id: uuid(),
      role: 'assistant',
      variants: [''],
      variantIndex: 0,
      createdAt: Date.now(),
    };
    updateCurrentMessages(() => [...kept, edited, aiMsg]);
    setStreamingMsgId(aiMsg.id);

    const history = kept.map((m) => ({
      role: m.role,
      content: m.variants[m.variantIndex] ?? '',
    }));
    const sys = buildSystemPrompt();
    const apiMessages = [
      ...(sys ? [{ role: 'system', content: sys }] : []),
      ...history,
      { role: 'user', content: newText },
    ];
    await callChat(
      apiMessages,
      (delta) => appendVariantByMsgId(aiMsg.id, delta),
      () => setStreamingMsgId(null),
      (err) => {
        appendVariantByMsgId(aiMsg.id, `\n\n[请求失败：${err}]`);
        setStreamingMsgId(null);
      },
    );
  }

  function stopStreaming() {
    abortRef.current?.abort();
    setStreamingMsgId(null);
  }

  /* ---------- 自动滚动到底部 ---------- */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentSession?.messages, streamingMsgId]);

  /* ---------- 键盘 ---------- */
  function onInputKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !(e.nativeEvent as any).isComposing
    ) {
      e.preventDefault();
      if (!streamingMsgId) sendMessage(input);
    }
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0b0b0c] text-white">
      {/* 侧栏 · 桌面常驻 */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#0f0f11] transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link
            href="/characters"
            className="text-xs tracking-[0.3em] text-white/60 hover:text-white"
          >
            ← 龙鼠历险
          </Link>
          <button
            className="rounded-md p-1 text-white/60 hover:bg-white/5 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="收起侧栏"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <button
          onClick={newSession}
          className="mx-3 mb-3 flex items-center justify-center gap-2 rounded-lg border border-white/15 py-2 text-sm text-white/90 hover:bg-white/5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新对话
        </button>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 && (
            <p className="px-2 py-4 text-xs text-white/40">还没有对话</p>
          )}
          <ul className="space-y-1">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                active={s.id === currentId}
                onClick={() => {
                  setCurrentId(s.id);
                  setSidebarOpen(false);
                }}
                onRename={(t) => renameSession(s.id, t)}
                onDelete={() => deleteSession(s.id)}
              />
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 px-3 py-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            AI 服务设置
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 主区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2 md:px-4">
          <button
            className="rounded-md p-2 text-white/70 hover:bg-white/5 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开侧栏"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <ParamsBar
              characters={characters}
              styles={styles}
              presets={presets}
              worldbooks={worldbooks}
              defaults={defaults}
              onChange={setDefaults}
              onManagePresets={() => setPresetMgr('preset')}
              onManageWorldbooks={() => setPresetMgr('worldbook')}
              config={config}
            />
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
            {(!currentSession || currentSession.messages.length === 0) && (
              <EmptyState
                onQuickStart={(text) => sendMessage(text)}
              />
            )}
            {currentSession?.messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                streaming={streamingMsgId === m.id}
                onReroll={() => reroll(m.id)}
                onDelete={() => deleteMessage(m.id)}
                onSwitchVariant={(i) => switchVariant(m.id, i)}
                onEditUserSubmit={(t) => editUserMessage(m.id, t)}
              />
            ))}
          </div>
        </div>

        {/* 输入区 */}
        <div className="border-t border-white/10 bg-[#0b0b0c] px-3 py-3 md:px-4 md:py-4">
          <div className="mx-auto max-w-3xl">
            {!unlocked && (
              <p className="mb-2 text-center text-xs text-white/50">
                未解锁编辑模式，回到角色页点右上锁 → 输入密码后可使用
              </p>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-white/[0.04] p-2 focus-within:border-white/35">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKey}
                rows={1}
                placeholder="给 AI 说点什么…（Enter 发送 / Shift+Enter 换行）"
                className="flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/30"
                style={{
                  maxHeight: 200,
                  minHeight: 36,
                }}
              />
              <div className="flex items-center gap-1">
                <label className="hidden md:flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/60">
                  <input
                    type="checkbox"
                    checked={config.stream}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, stream: e.target.checked }))
                    }
                  />
                  流式
                </label>
                {streamingMsgId ? (
                  <button
                    onClick={stopStreaming}
                    className="rounded-full bg-white/15 px-4 py-2 text-xs text-white hover:bg-white/25"
                  >
                    停止
                  </button>
                ) : (
                  <button
                    disabled={!input.trim() || !unlocked}
                    onClick={() => sendMessage(input)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-white/85 disabled:opacity-40"
                  >
                    发送
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] tracking-widest text-white/25">
              内容由 AI 生成，服务端不保存 Key 与对话
            </p>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <SettingsDrawer
          config={config}
          onChange={setConfig}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {presetMgr && (
        <PresetManager
          category={presetMgr}
          initialItems={presetMgr === 'preset' ? presets : worldbooks}
          onChange={(list) => {
            if (presetMgr === 'preset') setPresets(list);
            else setWorldbooks(list);
          }}
          onClose={() => setPresetMgr(null)}
        />
      )}
    </div>
  );
}

/* ---------- 会话行 ---------- */
function SessionRow({
  session,
  active,
  onClick,
  onRename,
  onDelete,
}: {
  session: Session;
  active: boolean;
  onClick: () => void;
  onRename: (t: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-2 text-sm ${
          active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5'
        }`}
      >
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onRename(draft.trim() || session.title);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setDraft(session.title);
                setEditing(false);
              }
            }}
            className="flex-1 rounded bg-black/40 px-2 py-1 text-sm text-white outline-none"
          />
        ) : (
          <button
            onClick={onClick}
            className="min-w-0 flex-1 truncate text-left"
            title={session.title}
          >
            {session.title}
          </button>
        )}
        <button
          className="opacity-0 transition group-hover:opacity-100"
          title="重命名"
          onClick={() => {
            setDraft(session.title);
            setEditing(true);
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        <button
          className="opacity-0 transition group-hover:opacity-100 hover:text-red-300"
          title="删除"
          onClick={() => setConfirmDel(true)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" />
          </svg>
        </button>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-6">
            <h5 className="text-base text-white">删除这个对话？</h5>
            <p className="mt-2 text-sm text-white/60">
              「{session.title}」将被移除，无法恢复。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDel(false)}
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/75"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setConfirmDel(false);
                }}
                className="rounded-full bg-red-500/90 px-4 py-1.5 text-xs text-white"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/* ---------- 空状态 ---------- */
function EmptyState({
  onQuickStart,
}: {
  onQuickStart: (text: string) => void;
}) {
  const tips = [
    '写一段玉元一和池不晚初次见面的场景',
    '池不晚被封印的记忆碎片回闪，写内心独白',
    '两人在山门夜话，玉元一嘴硬吐真情',
  ];
  return (
    <div className="mt-16 text-center">
      <h2 className="font-cn text-2xl tracking-[0.15em] text-white/90">
        AI 工作台
      </h2>
      <p className="mt-3 text-xs tracking-[0.3em] text-white/40">
        AI WORKSPACE
      </p>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/60">
        在顶部选择人设、文风、视角与字数，然后开始对话。<br />
        对话记录只保存在你的浏览器里。
      </p>
      <div className="mx-auto mt-8 grid max-w-xl gap-2 sm:grid-cols-2">
        {tips.map((t) => (
          <button
            key={t}
            onClick={() => onQuickStart(t)}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm text-white/75 hover:border-white/25 hover:bg-white/[0.06]"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
