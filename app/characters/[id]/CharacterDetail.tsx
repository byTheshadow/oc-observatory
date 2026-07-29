'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { Character } from '@/lib/supabase';

/* ---------- 常量 ---------- */

const PW_KEY = 'oc-edit-password';

// 分段的推荐顺序；DB 里没有的键不会显示，DB 里多出来的键会追加到末尾
const SECTION_ORDER = [
  '外貌',
  '衣着',
  '性格 · 关键词',
  '性格 · 详细',
  '背景经历',
  '行为逻辑',
];

const BASIC_ORDER = ['字', '外号', '本体', '年龄', '外貌年龄'];

/* ---------- 工具函数 ---------- */

function getPassword(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(PW_KEY) ?? '';
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
  if (!res.ok || !j.ok) throw new Error(j.error || '请求失败');
  return j;
}

/* ---------- 主组件 ---------- */

export default function CharacterDetail({ initial }: { initial: Character }) {
  const [character, setCharacter] = useState<Character>(initial);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(!!getPassword());
    const onStorage = () => setUnlocked(!!getPassword());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* 派发：更新单字段 */
  async function updateField(field: string, value: string | null) {
    await postJSON('/api/characters/update', {
      id: character.id,
      field,
      value,
    });
    // 本地同步（乐观刷新）
    setCharacter((prev) => {
      const next = { ...prev };
      if (field === 'avatar_url' || field === 'name' || field === 'bio') {
        (next as any)[field] = value ?? '';
      } else if (field.startsWith('basic_info.')) {
        const key = field.slice('basic_info.'.length);
        const bi = { ...(prev.basic_info ?? {}) };
        if (value === null) delete bi[key];
        else bi[key] = value;
        next.basic_info = bi;
      } else if (field.startsWith('sections.')) {
        const key = field.slice('sections.'.length);
        const sec = { ...(prev.sections ?? {}) };
        if (value === null) delete sec[key];
        else sec[key] = value;
        next.sections = sec;
      }
      return next;
    });
  }

  /* basic_info 有序渲染 */
  const basicEntries = useMemo(() => {
    const bi = character.basic_info ?? {};
    const known = BASIC_ORDER.filter((k) => k in bi).map((k) => [k, bi[k]] as const);
    const extras = Object.entries(bi).filter(([k]) => !BASIC_ORDER.includes(k));
    return [...known, ...extras];
  }, [character.basic_info]);

  const sectionEntries = useMemo(() => {
    const sec = character.sections ?? {};
    const known = SECTION_ORDER.filter((k) => k in sec).map((k) => [k, sec[k]] as const);
    const extras = Object.entries(sec).filter(([k]) => !SECTION_ORDER.includes(k));
    return [...known, ...extras];
  }, [character.sections]);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 md:px-10 md:pb-32">
      {/* 顶栏：名字 + 只读状态 */}
      <div className="mb-8 flex flex-col items-center text-center md:mb-12">
        <h1
          className="font-cn font-light tracking-[0.15em] animate-fade-up [animation-fill-mode:both]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
        >
          {character.name}
        </h1>
        <p className="mt-3 text-[11px] tracking-[0.4em] text-white/50 animate-fade-up [animation-delay:0.15s] [animation-fill-mode:both]">
          {unlocked ? 'EDIT MODE' : 'READ ONLY'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-14">
        {/* 左侧：立绘 + basic_info */}
        <div className="space-y-8">
          <AvatarBlock
            character={character}
            unlocked={unlocked}
            onChange={(url) => updateField('avatar_url', url)}
          />
          <BasicInfoBlock
            characterId={character.id}
            entries={basicEntries}
            unlocked={unlocked}
            onUpdate={updateField}
          />
        </div>

        {/* 右侧：sections */}
        <div className="space-y-8">
          {sectionEntries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-white/50">
              还没有分段内容
            </div>
          ) : (
            sectionEntries.map(([key, val]) => (
              <SectionBlock
                key={key}
                characterId={character.id}
                sectionKey={key}
                value={val ?? ''}
                unlocked={unlocked}
                onUpdate={(v) => updateField(`sections.${key}`, v)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 立绘块 ---------- */

function AvatarBlock({
  character,
  unlocked,
  onChange,
}: {
  character: Character;
  unlocked: boolean;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('characterId', character.id);
      const res = await fetch('/api/characters/upload-image', {
        method: 'POST',
        headers: { 'x-admin-password': getPassword() },
        body: form,
      });
      const j = await res.json().catch(() => ({ ok: false, error: '响应异常' }));
      if (!res.ok || !j.ok) throw new Error(j.error || '上传失败');
      await onChange(j.url);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (e: any) {
      setErr(e?.message ?? '上传失败');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="relative">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1815] via-[#221e19] to-[#0f0d0b]">
        {character.avatar_url ? (
          <Image
            src={character.avatar_url}
            alt={character.name}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-white/20">
            <span className="font-cn text-6xl tracking-[0.3em]">
              {character.name?.[0] ?? '—'}
            </span>
          </div>
        )}

        {unlocked && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-3 right-3 rounded-full bg-black/60 px-4 py-2 text-xs tracking-widest text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-60"
          >
            {uploading ? '上传中…' : '更换立绘'}
          </button>
        )}

        {showSaved && (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] tracking-widest text-black">
            已更新
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}

/* ---------- basic_info 表 ---------- */

function BasicInfoBlock({
  characterId,
  entries,
  unlocked,
  onUpdate,
}: {
  characterId: string;
  entries: readonly (readonly [string, string])[];
  unlocked: boolean;
  onUpdate: (field: string, value: string | null) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-cn text-sm tracking-[0.3em] text-white/80">基础信息</h3>
        <span className="text-[10px] tracking-[0.3em] text-white/30">BASIC</span>
      </div>
      <ul className="divide-y divide-white/5">
        {entries.map(([k, v]) => (
          <BasicInfoRow
            key={k}
            characterId={characterId}
            fieldKey={k}
            value={v ?? ''}
            unlocked={unlocked}
            onSave={(nv) => onUpdate(`basic_info.${k}`, nv)}
          />
        ))}
        {entries.length === 0 && (
          <li className="py-3 text-sm text-white/40">无</li>
        )}
      </ul>
    </div>
  );
}

function BasicInfoRow({
  characterId,
  fieldKey,
  value,
  unlocked,
  onSave,
}: {
  characterId: string;
  fieldKey: string;
  value: string;
  unlocked: boolean;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const dirty = draft !== value;

  function beginEdit() {
    setDraft(value);
    setEditing(true);
  }
  function tryExit() {
    if (dirty) setShowConfirmExit(true);
    else setEditing(false);
  }
  async function doSave() {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e: any) {
      alert(e?.message ?? '保存失败');
    } finally {
      setSaving(false);
      setShowConfirmSave(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-4">
        <div className="w-20 shrink-0 pt-1 text-xs tracking-[0.25em] text-white/50">
          {fieldKey}
        </div>

        <div className="flex-1 min-w-0">
          {!editing ? (
            <p className="text-sm text-white/90 whitespace-pre-wrap break-words">
              {value || <span className="text-white/30">—</span>}
            </p>
          ) : (
            <div>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setShowConfirmSave(true)}
                  disabled={!dirty || saving}
                  className="rounded-full bg-white px-4 py-1.5 text-xs tracking-widest text-black transition hover:bg-white/85 disabled:opacity-40"
                >
                  保存
                </button>
                <button
                  onClick={tryExit}
                  className="rounded-full border border-white/20 px-4 py-1.5 text-xs tracking-widest text-white/80 hover:border-white/40"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {unlocked && !editing && (
            <IconButton title="编辑" onClick={beginEdit}>
              <PencilIcon />
            </IconButton>
          )}
          <IconButton title="历史" onClick={() => setShowHistory(true)}>
            <ClockIcon />
          </IconButton>
        </div>
      </div>

      {showConfirmSave && (
        <ConfirmDialog
          title="保存修改？"
          desc={`「${fieldKey}」将被更新。此操作会写入历史存档，可随时恢复。`}
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
      {showHistory && (
        <HistoryPanel
          targetType="character"
          targetId={characterId}
          field={`basic_info.${fieldKey}`}
          label={fieldKey}
          unlocked={unlocked}
          onClose={() => setShowHistory(false)}
        />
      )}
    </li>
  );
}

/* ---------- sections 长文本块 ---------- */

function SectionBlock({
  characterId,
  sectionKey,
  value,
  unlocked,
  onUpdate,
}: {
  characterId: string;
  sectionKey: string;
  value: string;
  unlocked: boolean;
  onUpdate: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const dirty = draft !== value;

  function beginEdit() {
    setDraft(value);
    setEditing(true);
  }
  function tryExit() {
    if (dirty) setShowConfirmExit(true);
    else setEditing(false);
  }
  async function doSave() {
    setSaving(true);
    try {
      await onUpdate(draft);
      setEditing(false);
    } catch (e: any) {
      alert(e?.message ?? '保存失败');
    } finally {
      setSaving(false);
      setShowConfirmSave(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-cn text-base tracking-[0.25em] text-white/85">
          {sectionKey}
        </h3>
        <div className="flex items-center gap-1">
          {unlocked && !editing && (
            <IconButton title="编辑" onClick={beginEdit}>
              <PencilIcon />
            </IconButton>
          )}
          <IconButton title="历史" onClick={() => setShowHistory(true)}>
            <ClockIcon />
          </IconButton>
        </div>
      </div>

      {!editing ? (
        <p className="whitespace-pre-wrap text-sm leading-[2] text-white/80 md:text-[15px]">
          {value || <span className="text-white/30">（暂无内容）</span>}
        </p>
      ) : (
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(6, Math.min(24, draft.split('\n').length + 2))}
            className="w-full resize-y rounded-md border border-white/15 bg-black/40 p-3 text-sm leading-[1.9] text-white outline-none focus:border-white/40"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowConfirmSave(true)}
              disabled={!dirty || saving}
              className="rounded-full bg-white px-5 py-2 text-xs tracking-widest text-black transition hover:bg-white/85 disabled:opacity-40"
            >
              保存
            </button>
            <button
              onClick={tryExit}
              className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-widest text-white/80 hover:border-white/40"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {showConfirmSave && (
        <ConfirmDialog
          title="保存修改？"
          desc={`「${sectionKey}」将被更新。此操作会写入历史存档，可随时恢复。`}
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
      {showHistory && (
        <HistoryPanel
          targetType="character"
          targetId={characterId}
          field={`sections.${sectionKey}`}
          label={sectionKey}
          unlocked={unlocked}
          onClose={() => setShowHistory(false)}
        />
      )}
    </section>
  );
}

/* ---------- 历史面板 ---------- */

type HistoryItem = {
  id: string;
  target_type: string;
  target_id: string;
  field_name: string;
  old_content: string;
  editor_name: string | null;
  created_at: string;
};

function HistoryPanel({
  targetType,
  targetId,
  field,
  label,
  unlocked,
  onClose,
}: {
  targetType: 'character' | 'story';
  targetId: string;
  field: string;
  label: string;
  unlocked: boolean;
  onClose: () => void;
}) {
  const [list, setList] = useState<HistoryItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<
    | { kind: 'restore'; id: string }
    | { kind: 'delete'; id: string }
    | null
  >(null);

  async function load() {
    setErr(null);
    try {
      const j = await postJSON('/api/history/list', {
        targetType,
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
      // 刷新页面拿最新数据
      if (typeof window !== 'undefined') window.location.reload();
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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl">
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
                    <span>{new Date(h.created_at).toLocaleString('zh-CN')}</span>
                    <span className="text-white/20">·</span>
                    <span>{h.editor_name || '协作者'}</span>
                  </div>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-[1.9] text-white/75">
                    {h.old_content || <span className="text-white/30">（空）</span>}
                  </p>
                  {unlocked && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setConfirming({ kind: 'restore', id: h.id })}
                        className="rounded-full bg-white px-3 py-1 text-[11px] tracking-widest text-black hover:bg-white/85"
                      >
                        恢复此版本
                      </button>
                      <button
                        onClick={() => setConfirming({ kind: 'delete', id: h.id })}
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
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-6 shadow-2xl"
      >
        <h5 className="font-cn text-base tracking-[0.15em] text-white">{title}</h5>
        {desc && <p className="mt-2 text-sm leading-relaxed text-white/60">{desc}</p>}
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

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
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

function ClockIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
