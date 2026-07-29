'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

const PW_KEY = 'oc-edit-password';
const THEME_KEY = 'oc-story-theme';
const FONT_KEY = 'oc-story-font';
const SIZE_KEY = 'oc-story-size';

type Theme = 'dark' | 'light';
type FontKind = 'song' | 'kai' | 'hei';
type SizeKind = 's' | 'm' | 'l';

type Story = {
  id: string;
  title: string;
  content: string;
  character_ids: string[];
  word_count: number;
  source: string;
  created_at: string;
  updated_at: string;
};
type CharacterLite = { id: string; name: string };

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

const FONT_CONFIG: Record<
  FontKind,
  { className: string; style: React.CSSProperties; label: string }
> = {
  song: { className: 'font-cn', style: {}, label: '宋' },
  kai: {
    className: '',
    style: { fontFamily: '"KaiTi", "STKaiti", "楷体", serif' },
    label: '楷',
  },
  hei: {
    className: '',
    style: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif',
    },
    label: '黑',
  },
};

const SIZE_PX: Record<SizeKind, number> = { s: 15, m: 17, l: 19 };

export default function StoryDetail({
  initial,
  characters,
  initialEdit,
}: {
  initial: Story;
  characters: CharacterLite[];
  initialEdit: boolean;
}) {
  const router = useRouter();
  const [story, setStory] = useState<Story>(initial);
  const [unlocked, setUnlocked] = useState(false);
  const [editing, setEditing] = useState(false);

  const [theme, setTheme] = useState<Theme>('dark');
  const [font, setFont] = useState<FontKind>('song');
  const [size, setSize] = useState<SizeKind>('m');

  useEffect(() => {
    const pw = !!getPassword();
    setUnlocked(pw);
    if (initialEdit && pw) setEditing(true);
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark' || t === 'light') setTheme(t);
    const f = localStorage.getItem(FONT_KEY);
    if (f === 'song' || f === 'kai' || f === 'hei') setFont(f);
    const s = localStorage.getItem(SIZE_KEY);
    if (s === 's' || s === 'm' || s === 'l') setSize(s);
    const onStorage = () => setUnlocked(!!getPassword());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [initialEdit]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(FONT_KEY, font);
    } catch {}
  }, [font]);
  useEffect(() => {
    try {
      localStorage.setItem(SIZE_KEY, size);
    } catch {}
  }, [size]);

  const isDark = theme === 'dark';
  const pageBg = isDark
    ? 'bg-[#0a0a0a] text-white'
    : 'bg-[#f4efe4] text-neutral-800';
  const paperBg = isDark
    ? 'bg-white/[0.02] border border-white/10'
    : 'bg-white/70 border border-neutral-300/50 shadow-sm';
  const titleColor = isDark ? 'text-white/95' : 'text-neutral-900';
  const metaColor = isDark ? 'text-white/45' : 'text-neutral-500';
  const bodyColor = isDark ? 'text-white/85' : 'text-neutral-800';

  const fontCfg = FONT_CONFIG[font];
  const fontSize = SIZE_PX[size];

  const charMap = useMemo(
    () => new Map(characters.map((c) => [c.id, c.name])),
    [characters],
  );
  const paragraphs = useMemo(() => story.content.split('\n'), [story.content]);

  /* ---------- 编辑草稿 ---------- */
  const [draftTitle, setDraftTitle] = useState(story.title);
  const [draftContent, setDraftContent] = useState(story.content);
  const [draftCharIds, setDraftCharIds] = useState<string[]>(
    story.character_ids || [],
  );
  const [saving, setSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [history, setHistory] = useState<
    | { field: 'title' | 'content' | 'character_ids'; label: string }
    | null
  >(null);

  function enterEdit() {
    setDraftTitle(story.title);
    setDraftContent(story.content);
    setDraftCharIds(story.character_ids || []);
    setEditing(true);
  }

  const dirty =
    draftTitle !== story.title ||
    draftContent !== story.content ||
    JSON.stringify(draftCharIds) !==
      JSON.stringify(story.character_ids || []);

  function tryExit() {
    if (dirty) setShowConfirmExit(true);
    else setEditing(false);
  }

  async function doSave() {
    setSaving(true);
    try {
      if (draftTitle !== story.title) {
        await postJSON('/api/stories/update', {
          id: story.id,
          field: 'title',
          value: draftTitle,
        });
      }
      if (draftContent !== story.content) {
        await postJSON('/api/stories/update', {
          id: story.id,
          field: 'content',
          value: draftContent,
        });
      }
      if (
        JSON.stringify(draftCharIds) !==
        JSON.stringify(story.character_ids || [])
      ) {
        await postJSON('/api/stories/update', {
          id: story.id,
          field: 'character_ids',
          value: draftCharIds,
        });
      }
      const wc = draftContent.replace(/\s+/g, '').length;
      setStory({
        ...story,
        title: draftTitle,
        content: draftContent,
        character_ids: draftCharIds,
        word_count: wc,
        updated_at: new Date().toISOString(),
      });
      setEditing(false);
    } catch (e: any) {
      alert(e?.message ?? '保存失败');
    } finally {
      setSaving(false);
      setShowConfirmSave(false);
    }
  }

  async function doDelete() {
    try {
      await postJSON('/api/stories/delete', { id: story.id });
      router.push('/stories');
    } catch (e: any) {
      alert(e?.message ?? '删除失败');
      setShowConfirmDelete(false);
    }
  }

  function toggleChar(id: string) {
    setDraftCharIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <main className={`min-h-screen transition-colors ${pageBg}`}>
      <TopNav backHref="/stories" />

      <div className="mx-auto max-w-3xl px-6 pb-32 md:px-8">
        <div className={`rounded-2xl ${paperBg} p-6 md:p-10 transition-colors`}>
          {/* 标题栏 */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="标题"
                  className={
                    isDark
                      ? `w-full border-b border-white/15 bg-transparent pb-2 text-2xl font-light tracking-[0.1em] text-white outline-none focus:border-white/40 md:text-3xl ${fontCfg.className}`
                      : `w-full border-b border-neutral-300 bg-transparent pb-2 text-2xl font-light tracking-[0.1em] text-neutral-900 outline-none focus:border-neutral-500 md:text-3xl ${fontCfg.className}`
                  }
                  style={fontCfg.style}
                />
              ) : (
                <h1
                  className={`text-2xl font-light tracking-[0.1em] md:text-3xl ${titleColor} ${fontCfg.className}`}
                  style={fontCfg.style}
                >
                  {story.title || '未命名短打'}
                </h1>
              )}
              <div
                className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] tracking-widest ${metaColor}`}
              >
                <span>
                  {new Date(story.updated_at).toLocaleDateString('zh-CN')}
                </span>
                <span className="opacity-40">·</span>
                <span>
                  {editing
                    ? draftContent.replace(/\s+/g, '').length
                    : story.word_count}{' '}
                  字
                </span>
                {story.source === 'ai_workspace' && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>AI 归档</span>
                  </>
                )}
              </div>
            </div>

            {unlocked && (
              <div className="flex shrink-0 items-center gap-1">
                {!editing ? (
                  <IconBtn title="编辑" onClick={enterEdit} isDark={isDark}>
                    <PencilIcon />
                  </IconBtn>
                ) : (
                  <IconBtn
                    title="删除"
                    onClick={() => setShowConfirmDelete(true)}
                    isDark={isDark}
                    danger
                  >
                    <TrashIcon />
                  </IconBtn>
                )}
              </div>
            )}
          </div>

          {/* 关联角色 */}
          {editing ? (
            <div className="mb-6">
              <div
                className={`mb-2 flex items-center gap-3 text-[11px] tracking-widest ${metaColor}`}
              >
                <span>关联角色</span>
                <button
                  className="underline-offset-4 hover:underline"
                  onClick={() =>
                    setHistory({ field: 'character_ids', label: '关联角色' })
                  }
                >
                  查看历史
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {characters.map((c) => {
                  const on = draftCharIds.includes(c.id);
                  const cls = on
                    ? isDark
                      ? 'bg-white text-black'
                      : 'bg-neutral-800 text-white'
                    : isDark
                    ? 'border border-white/20 text-white/70 hover:border-white/40'
                    : 'border border-neutral-400 text-neutral-600 hover:border-neutral-600';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChar(c.id)}
                      className={`rounded-full px-3 py-1 text-[11px] tracking-widest transition ${cls}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
                {characters.length === 0 && (
                  <span className={`text-[11px] ${metaColor}`}>
                    （还没有角色可选）
                  </span>
                )}
              </div>
            </div>
          ) : (
            story.character_ids.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {story.character_ids.map((cid) => (
                  <span
                    key={cid}
                    className={
                      isDark
                        ? 'rounded-full border border-white/15 px-3 py-1 text-[11px] tracking-widest text-white/70'
                        : 'rounded-full border border-neutral-300 px-3 py-1 text-[11px] tracking-widest text-neutral-600'
                    }
                  >
                    {charMap.get(cid) ?? '未知角色'}
                  </span>
                ))}
              </div>
            )
          )}

          {/* 正文 */}
          {editing ? (
            <div>
              <div
                className={`mb-2 flex flex-wrap items-center gap-3 text-[11px] tracking-widest ${metaColor}`}
              >
                <span>正文</span>
                <button
                  className="underline-offset-4 hover:underline"
                  onClick={() =>
                    setHistory({ field: 'content', label: '正文' })
                  }
                >
                  查看历史
                </button>
                <span className="opacity-40">·</span>
                <button
                  className="underline-offset-4 hover:underline"
                  onClick={() =>
                    setHistory({ field: 'title', label: '标题' })
                  }
                >
                  标题历史
                </button>
              </div>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={Math.max(
                  12,
                  Math.min(40, draftContent.split('\n').length + 3),
                )}
                placeholder="把你的短打写在这里……"
                className={
                  isDark
                    ? `w-full resize-y rounded-md border border-white/15 bg-black/40 p-4 text-white outline-none focus:border-white/40 ${fontCfg.className}`
                    : `w-full resize-y rounded-md border border-neutral-300 bg-white/80 p-4 text-neutral-800 outline-none focus:border-neutral-500 ${fontCfg.className}`
                }
                style={{
                  ...fontCfg.style,
                  fontSize: `${fontSize}px`,
                  lineHeight: 2,
                }}
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowConfirmSave(true)}
                  disabled={!dirty || saving}
                  className={
                    isDark
                      ? 'rounded-full bg-white px-5 py-2 text-xs tracking-widest text-black transition hover:bg-white/85 disabled:opacity-40'
                      : 'rounded-full bg-neutral-900 px-5 py-2 text-xs tracking-widest text-white transition hover:bg-neutral-700 disabled:opacity-40'
                  }
                >
                  保存
                </button>
                <button
                  onClick={tryExit}
                  className={
                    isDark
                      ? 'rounded-full border border-white/20 px-5 py-2 text-xs tracking-widest text-white/80 hover:border-white/40'
                      : 'rounded-full border border-neutral-400 px-5 py-2 text-xs tracking-widest text-neutral-600 hover:border-neutral-600'
                  }
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <article
              className={`${bodyColor} ${fontCfg.className}`}
              style={{
                ...fontCfg.style,
                fontSize: `${fontSize}px`,
                lineHeight: 2.1,
              }}
            >
              {story.content.trim() === '' ? (
                <p className={metaColor}>（这篇短打还没有正文）</p>
              ) : (
                paragraphs.map((line, i) => (
                  <p
                    key={i}
                    style={{
                      textIndent: line.trim() ? '2em' : 0,
                      marginBottom: line.trim() ? '0.8em' : '0.4em',
                      minHeight: '1em',
                    }}
                  >
                    {line || '\u00A0'}
                  </p>
                ))
              )}
            </article>
          )}
        </div>
      </div>

      <ReadingToolbar
        theme={theme}
        setTheme={setTheme}
        font={font}
        setFont={setFont}
        size={size}
        setSize={setSize}
      />

      {showConfirmSave && (
        <ConfirmDialog
          title="保存修改？"
          desc="此操作会为改动字段写入历史存档，可随时恢复。"
          confirmText={saving ? '保存中…' : '确认保存'}
          onConfirm={doSave}
          onCancel={() => setShowConfirmSave(false)}
        />
      )}
      {showConfirmExit && (
        <ConfirmDialog
          title="放弃未保存的修改？"
          desc="你刚才的编辑将会丢失。"
          confirmText="放弃"
          danger
          onConfirm={() => {
            setEditing(false);
            setShowConfirmExit(false);
          }}
          onCancel={() => setShowConfirmExit(false)}
        />
      )}
      {showConfirmDelete && (
        <ConfirmDialog
          title="删除这篇短打？"
          desc={`「${story.title || '未命名短打'}」将被永久删除，包括所有历史记录。`}
          confirmText="确认删除"
          danger
          onConfirm={doDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}

      {history && (
        <HistoryPanel
          targetId={story.id}
          field={history.field}
          label={history.label}
          unlocked={unlocked}
          characters={characters}
          onClose={() => setHistory(null)}
          onRestored={() => {
            if (typeof window !== 'undefined') window.location.reload();
          }}
        />
      )}
    </main>
  );
}

/* ---------- 阅读设置浮动栏 ---------- */

function ReadingToolbar({
  theme,
  setTheme,
  font,
  setFont,
  size,
  setSize,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  font: FontKind;
  setFont: (f: FontKind) => void;
  size: SizeKind;
  setSize: (s: SizeKind) => void;
}) {
  const isDark = theme === 'dark';
  const wrap = isDark
    ? 'border-white/15 bg-black/70 text-white/85 backdrop-blur'
    : 'border-neutral-300 bg-white/90 text-neutral-700 shadow-md';
  const btnBase = 'rounded px-2 py-1 text-[11px] tracking-widest transition';
  const on = isDark ? 'bg-white text-black' : 'bg-neutral-800 text-white';
  const off = isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-200';

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 flex flex-col gap-2 rounded-2xl border p-2 ${wrap}`}
    >
      <div className="flex items-center gap-1">
        <span className="px-1 text-[10px] opacity-60">主题</span>
        <button
          className={`${btnBase} ${theme === 'dark' ? on : off}`}
          onClick={() => setTheme('dark')}
        >
          深
        </button>
        <button
          className={`${btnBase} ${theme === 'light' ? on : off}`}
          onClick={() => setTheme('light')}
        >
          浅
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="px-1 text-[10px] opacity-60">字体</span>
        {(['song', 'kai', 'hei'] as FontKind[]).map((f) => (
          <button
            key={f}
            className={`${btnBase} ${font === f ? on : off}`}
            onClick={() => setFont(f)}
          >
            {FONT_CONFIG[f].label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="px-1 text-[10px] opacity-60">字号</span>
        {(['s', 'm', 'l'] as SizeKind[]).map((s) => (
          <button
            key={s}
            className={`${btnBase} ${size === s ? on : off}`}
            onClick={() => setSize(s)}
          >
            {s === 's' ? '小' : s === 'm' ? '中' : '大'}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- 历史面板 ---------- */

type HistoryItem = {
  id: string;
  field_name: string;
  old_content: string;
  editor_name: string | null;
  created_at: string;
};

function HistoryPanel({
  targetId,
  field,
  label,
  unlocked,
  characters,
  onClose,
  onRestored,
}: {
  targetId: string;
  field: 'title' | 'content' | 'character_ids';
  label: string;
  unlocked: boolean;
  characters: CharacterLite[];
  onClose: () => void;
  onRestored: () => void;
}) {
  const [list, setList] = useState<HistoryItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<
    { kind: 'restore'; id: string } | { kind: 'delete'; id: string } | null
  >(null);

  const charMap = useMemo(
    () => new Map(characters.map((c) => [c.id, c.name])),
    [characters],
  );

  async function load() {
    setErr(null);
    try {
      const j = await postJSON('/api/history/list', {
        targetType: 'story',
        targetId,
        field,
      });
      setList(j.data as HistoryItem[]);
    } catch (e: any) {
      setErr(e?.message ?? '加载失败');
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doRestore(id: string) {
    try {
      await postJSON('/api/history/restore', { historyId: id });
      setConfirming(null);
      onClose();
      onRestored();
    } catch (e: any) {
      alert(e?.message ?? '恢复失败');
    }
  }
  async function doDelete(id: string) {
    try {
      await postJSON('/api/history/delete', { historyId: id });
      setConfirming(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? '删除失败');
    }
  }

  function renderOld(v: string) {
    if (field === 'character_ids') {
      try {
        const arr = JSON.parse(v) as string[];
        if (!arr || arr.length === 0) return '（无关联角色）';
        return arr.map((id) => charMap.get(id) ?? id).join('、');
      } catch {
        return v;
      }
    }
    return v || '（空）';
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-[#111] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h4 className="font-cn text-sm tracking-[0.25em] text-white/90">
              历史存档 · {label}
            </h4>
            <p className="mt-1 text-[10px] tracking-[0.3em] text-white/40">
              HISTORY LOGS
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-white/35 hover:text-white"
          >
            关闭
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          {err && <p className="text-sm text-red-400">{err}</p>}
          {!list && !err && <p className="text-sm text-white/50">加载中…</p>}
          {list && list.length === 0 && (
            <p className="text-sm text-white/40">尚无历史记录</p>
          )}
          {list && list.length > 0 && (
            <ul className="space-y-3">
              {list.map((h) => (
                <li
                  key={h.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] tracking-widest text-white/50">
                    <span>
                      {new Date(h.created_at).toLocaleString('zh-CN')}
                    </span>
                    <span className="text-white/20">·</span>
                    <span>{h.editor_name || '协作者'}</span>
                  </div>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-[1.9] text-white/75">
                    {renderOld(h.old_content)}
                  </p>
                  {unlocked && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() =>
                          setConfirming({ kind: 'restore', id: h.id })
                        }
                        className="rounded-full bg-white px-3 py-1 text-[11px] tracking-widest text-black hover:bg-white/85"
                      >
                        恢复此版本
                      </button>
                      <button
                        onClick={() =>
                          setConfirming({ kind: 'delete', id: h.id })
                        }
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] tracking-widest text-white/70 hover:border-red-400/60 hover:text-red-300"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {confirming?.kind === 'restore' && (
        <ConfirmDialog
          title="恢复此版本？"
          desc="当前内容会被替换成这条历史记录，同时把当前值另存一条历史，方便回退。"
          confirmText="确认恢复"
          onConfirm={() => doRestore(confirming.id)}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming?.kind === 'delete' && (
        <ConfirmDialog
          title="删除这条历史？"
          desc="删除后无法找回。"
          confirmText="确认删除"
          danger
          onConfirm={() => doDelete(confirming.id)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/* ---------- 确认弹窗 ---------- */

function ConfirmDialog({
  title,
  desc,
  confirmText = '确认',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  desc?: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-6 text-white shadow-2xl"
      >
        <h5 className="font-cn text-base tracking-[0.15em]">{title}</h5>
        {desc && (
          <p className="mt-2 text-sm leading-relaxed text-white/60">{desc}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs tracking-widest text-white/75 hover:border-white/40"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={
              danger
                ? 'rounded-full bg-red-500/90 px-4 py-1.5 text-xs tracking-widest text-white hover:bg-red-500'
                : 'rounded-full bg-white px-4 py-1.5 text-xs tracking-widest text-black hover:bg-white/85'
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 小图标按钮 ---------- */

function IconBtn({
  title,
  onClick,
  children,
  isDark,
  danger,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  isDark: boolean;
  danger?: boolean;
}) {
  const base = 'grid h-9 w-9 place-items-center rounded-full transition';
  const cls = danger
    ? isDark
      ? 'text-white/50 hover:bg-red-500/20 hover:text-red-300'
      : 'text-neutral-500 hover:bg-red-100 hover:text-red-600'
    : isDark
    ? 'text-white/60 hover:bg-white/10 hover:text-white'
    : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900';
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${base} ${cls}`}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" />
    </svg>
  );
}
