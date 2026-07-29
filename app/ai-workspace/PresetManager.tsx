'use client';

import { useState } from 'react';

type Item = { id: string; title: string; content: string; category: string };

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

export default function PresetManager({
  category,
  initialItems,
  onChange,
  onClose,
}: {
  category: 'preset' | 'worldbook';
  initialItems: Item[];
  onChange: (list: Item[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [editing, setEditing] = useState<null | Item | 'new'>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Item | null>(null);

  const label = category === 'preset' ? '自定义人设' : '世界书 / 其他设定';

  function startNew() {
    setEditing('new');
    setTitle('');
    setContent('');
    setErr(null);
  }
  function startEdit(it: Item) {
    setEditing(it);
    setTitle(it.title);
    setContent(it.content);
    setErr(null);
  }
  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const body: any = { title, content, category };
      if (editing && editing !== 'new') body.id = editing.id;
      const j = await postJSON('/api/presets/save', body);
      const saved: Item = j.data;
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
  async function doDelete(it: Item) {
    try {
      await postJSON('/api/presets/delete', { id: it.id });
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
            <h4 className="text-sm tracking-[0.2em] text-white/85">{label}</h4>
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
            {items.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => startEdit(it)}
                  className={`block w-full truncate rounded-md px-2 py-2 text-left text-sm ${
                    editing !== 'new' && editing?.id === it.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/75 hover:bg-white/5'
                  }`}
                >
                  {it.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 右：编辑 */}
        <div className="flex flex-1 flex-col">
          {!editing ? (
            <div className="grid flex-1 place-items-center text-sm text-white/40">
              选择左侧条目查看，或新建
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-5 py-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="标题"
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  category === 'preset'
                    ? '例：一位善用符纸的少女道士，冷淡话少…'
                    : '例：星洲宗内部禁忌 / 灵脉分布 / 御剑规矩…'
                }
                className="flex-1 resize-none border-b border-white/10 bg-transparent p-5 text-sm leading-[1.9] text-white outline-none placeholder:text-white/25"
              />
              {err && (
                <p className="border-t border-red-400/30 bg-red-500/10 px-5 py-2 text-xs text-red-300">
                  {err}
                </p>
              )}
              <div className="flex items-center justify-between px-5 py-3">
                <div>
                  {editing !== 'new' && (
                    <button
                      onClick={() => setConfirmDel(editing as Item)}
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
                    取消
                  </button>
                  <button
                    onClick={save}
                    disabled={!title.trim() || saving}
                    className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black disabled:opacity-40"
                  >
                    {saving ? '保存中…' : '保存'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-6">
            <h5 className="text-base text-white">删除这个条目？</h5>
            <p className="mt-2 text-sm text-white/60">
              「{confirmDel.title}」将被永久删除。
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
