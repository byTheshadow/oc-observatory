'use client';

import { useState } from 'react';

type Style = {
  id: string;
  name: string;
  description: string | null;
  is_preset?: boolean;
};

const PW_KEY = 'oc-edit-password';
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

export default function StyleManager({
  initialItems,
  onChange,
  onClose,
}: {
  initialItems: Style[];
  onChange: (list: Style[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Style[]>(initialItems);
  const [editing, setEditing] = useState<null | Style | 'new'>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Style | null>(null);

  const readOnly = editing !== null && editing !== 'new' && !!editing.is_preset;

  function startNew() {
    setEditing('new');
    setName('');
    setDesc('');
    setErr(null);
  }
  function startEdit(it: Style) {
    setEditing(it);
    setName(it.name);
    setDesc(it.description ?? '');
    setErr(null);
  }
  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const body: any = { name, description: desc };
      if (editing && editing !== 'new') body.id = editing.id;
      const j = await postJSON('/api/styles/save', body);
      const saved: Style = j.data;
      const next =
        editing === 'new'
          ? [saved, ...items]
          : items.map((x) => (x.id === saved.id ? saved : x));
      setItems(next);
      onChange(next);
      setEditing(null);
    } catch (e: any) {
      setErr(e?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  }
  async function doDelete(it: Style) {
    try {
      await postJSON('/api/styles/delete', { id: it.id });
      const next = items.filter((x) => x.id !== it.id);
      setItems(next);
      onChange(next);
      setConfirmDel(null);
      if (editing !== 'new' && editing?.id === it.id) setEditing(null);
    } catch (e: any) {
      alert(e?.message ?? '删除失败');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl"
      >
        {/* 左：列表 */}
        <div className="flex w-64 flex-col border-r border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <h4 className="text-sm tracking-[0.2em] text-white/85">文风</h4>
            <button
              onClick={onClose}
              className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:border-white/35"
            >
              关闭
            </button>
          </div>
          <button
            onClick={startNew}
            className="mx-3 mb-2 rounded-md border border-white/15 py-1.5 text-xs text-white/85 hover:bg-white/5"
          >
            + 新建
          </button>
          <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {items.length === 0 && (
              <li className="px-2 py-4 text-xs text-white/40">还没有条目</li>
            )}
            {items.map((it) => {
              const active = editing !== 'new' && editing?.id === it.id;
              return (
                <li key={it.id}>
                  <button
                    onClick={() => startEdit(it)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/75 hover:bg-white/5'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{it.name}</span>
                    {it.is_preset && (
                      <span className="shrink-0 rounded-sm border border-white/20 px-1 py-px text-[9px] tracking-widest text-white/50">
                        预置
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 右：编辑 */}
        <div className="flex flex-1 flex-col">
          {!editing ? (
            <div className="grid flex-1 place-items-center text-sm text-white/40">
              选择左侧文风查看，或新建
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-5 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] tracking-[0.25em] text-white/45">
                    名称
                  </span>
                  {readOnly && (
                    <span className="rounded-sm border border-white/20 px-1 py-px text-[9px] tracking-widest text-white/50">
                      预置 · 只读
                    </span>
                  )}
                </div>
                <input
                  value={name}
                  readOnly={readOnly}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：清冷叙事"
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="px-5 pt-3 text-[11px] tracking-[0.25em] text-white/45">
                  描述
                </span>
                <textarea
                  value={desc}
                  readOnly={readOnly}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="例：语言优美克制，注重心理描写和环境氛围…"
                  className="flex-1 resize-none border-b border-white/10 bg-transparent p-5 text-sm leading-[1.9] text-white outline-none placeholder:text-white/25"
                />
              </div>
              {err && (
                <p className="border-t border-red-400/30 bg-red-500/10 px-5 py-2 text-xs text-red-300">
                  {err}
                </p>
              )}
              <div className="flex items-center justify-between px-5 py-3">
                <div>
                  {editing !== 'new' && !editing.is_preset && (
                    <button
                      onClick={() => setConfirmDel(editing as Style)}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/70 hover:border-red-400/60 hover:text-red-300"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/75"
                  >
                    {readOnly ? '关闭' : '取消'}
                  </button>
                  {!readOnly && (
                    <button
                      onClick={save}
                      disabled={!name.trim() || saving}
                      className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black disabled:opacity-40"
                    >
                      {saving ? '保存中…' : '保存'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-6">
            <h5 className="text-base text-white">删除这个文风？</h5>
            <p className="mt-2 text-sm text-white/60">
              「{confirmDel.name}」将被永久删除。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDel(null)}
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/75"
              >
                取消
              </button>
              <button
                onClick={() => doDelete(confirmDel)}
                className="rounded-full bg-red-500/90 px-4 py-1.5 text-xs text-white"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
