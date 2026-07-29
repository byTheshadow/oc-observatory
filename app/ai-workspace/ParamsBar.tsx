'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type Defaults = {
  characterIds: string[];
  presetIds: string[];
  worldbookIds: string[];
  styleId: string;
  viewpoint: string;
  wordLimit: string;
  extra: string;
};

type Character = { id: string; name: string };
type Style = { id: string; name: string; description: string | null };
type Preset = { id: string; title: string; content: string };

type PanelKey =
  | 'char'
  | 'preset'
  | 'world'
  | 'style'
  | 'view'
  | 'word'
  | 'extra';

const VIEWPOINTS = ['第一人称', '第三人称', '全知'];
const WORD_PRESETS = ['500', '1000', '2000', '3000', 'unlimited'];

export default function ParamsBar({
  characters,
  styles,
  presets,
  worldbooks,
  defaults,
  onChange,
  onManagePresets,
  onManageWorldbooks,
  onManageStyles,
  config,
}: {
  characters: Character[];
  styles: Style[];
  presets: Preset[];
  worldbooks: Preset[];
  defaults: Defaults;
  onChange: (d: Defaults) => void;
  onManagePresets: () => void;
  onManageWorldbooks: () => void;
  onManageStyles: () => void;
  config: { model: string };
}) {
  const [open, setOpen] = useState<{
    key: PanelKey;
    rect: DOMRect;
  } | null>(null);

  function openPanel(key: PanelKey, el: HTMLElement) {
    setOpen({ key, rect: el.getBoundingClientRect() });
  }
  function close() {
    setOpen(null);
  }
  function patch(p: Partial<Defaults>) {
    onChange({ ...defaults, ...p });
  }

  const selChars = characters.filter((c) =>
    defaults.characterIds.includes(c.id),
  );
  const selPresets = presets.filter((p) => defaults.presetIds.includes(p.id));
  const selWorlds = worldbooks.filter((p) =>
    defaults.worldbookIds.includes(p.id),
  );
  const style = styles.find((s) => s.id === defaults.styleId);

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] tracking-wider text-white/60 whitespace-nowrap">
        模型 · {config.model || '未选'}
      </span>

      <Chip
        label="人设"
        summary={selChars.map((c) => c.name).join('、') || '未选'}
        active={open?.key === 'char'}
        onOpen={(el) => openPanel('char', el)}
      />
      <Chip
        label="自定义人设"
        summary={
          selPresets.map((p) => p.title).join('、') || `共 ${presets.length} 项`
        }
        active={open?.key === 'preset'}
        onOpen={(el) => openPanel('preset', el)}
      />
      <Chip
        label="世界书"
        summary={
          selWorlds.map((p) => p.title).join('、') ||
          `共 ${worldbooks.length} 项`
        }
        active={open?.key === 'world'}
        onOpen={(el) => openPanel('world', el)}
      />
      <Chip
        label="文风"
        summary={style?.name || '未选'}
        active={open?.key === 'style'}
        onOpen={(el) => openPanel('style', el)}
      />
      <Chip
        label="视角"
        summary={defaults.viewpoint || '未选'}
        active={open?.key === 'view'}
        onOpen={(el) => openPanel('view', el)}
      />
      <Chip
        label="字数"
        summary={
          defaults.wordLimit === 'unlimited' ? '不限' : `≈${defaults.wordLimit}`
        }
        active={open?.key === 'word'}
        onOpen={(el) => openPanel('word', el)}
      />
      <Chip
        label="附加条件"
        summary={defaults.extra ? '已填' : '无'}
        active={open?.key === 'extra'}
        onOpen={(el) => openPanel('extra', el)}
      />

      {open && (
        <PortalPanel anchorRect={open.rect} onClose={close}>
          {open.key === 'char' && (
            <MultiPick
              title="选择官方角色"
              items={characters.map((c) => ({ id: c.id, label: c.name }))}
              selected={defaults.characterIds}
              onChange={(ids) => patch({ characterIds: ids })}
            />
          )}
          {open.key === 'preset' && (
            <MultiPickWithManage
              title="选择自定义人设"
              items={presets.map((p) => ({ id: p.id, label: p.title }))}
              selected={defaults.presetIds}
              onChange={(ids) => patch({ presetIds: ids })}
              onManage={onManagePresets}
              manageLabel="管理自定义人设"
            />
          )}
          {open.key === 'world' && (
            <MultiPickWithManage
              title="选择世界书 / 其他设定"
              items={worldbooks.map((p) => ({ id: p.id, label: p.title }))}
              selected={defaults.worldbookIds}
              onChange={(ids) => patch({ worldbookIds: ids })}
              onManage={onManageWorldbooks}
              manageLabel="管理世界书"
            />
          )}
          {open.key === 'style' && (
            <SinglePickWithManage
              title="选择文风"
              items={[
                { id: '', label: '（不指定）' },
                ...styles.map((s) => ({
                  id: s.id,
                  label: s.name,
                  hint: s.description ?? undefined,
                })),
              ]}
              selected={defaults.styleId}
              onChange={(id) => patch({ styleId: id })}
              onManage={onManageStyles}
              manageLabel="管理文风"
            />
          )}
          {open.key === 'view' && (
            <SinglePick
              title="叙述视角"
              items={VIEWPOINTS.map((v) => ({ id: v, label: v }))}
              selected={defaults.viewpoint}
              onChange={(v) => patch({ viewpoint: v })}
            />
          )}
          {open.key === 'word' && (
            <WordPanel
              value={defaults.wordLimit}
              onChange={(v) => patch({ wordLimit: v })}
            />
          )}
          {open.key === 'extra' && (
            <ExtraPanel
              value={defaults.extra}
              onChange={(v) => patch({ extra: v })}
            />
          )}
        </PortalPanel>
      )}
    </div>
  );
}

/* ---------- 胶囊 ---------- */

function Chip({
  label,
  summary,
  active,
  onOpen,
}: {
  label: string;
  summary: string;
  active: boolean;
  onOpen: (el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <button
      ref={ref}
      onClick={() => ref.current && onOpen(ref.current)}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] tracking-wider whitespace-nowrap transition ${
        active
          ? 'border-white/50 bg-white/10 text-white'
          : 'border-white/15 text-white/85 hover:border-white/35'
      }`}
    >
      <span className="text-white/50">{label}</span>
      <span className="mx-1 text-white/25">·</span>
      <span className="inline-block max-w-[10rem] truncate align-bottom">
        {summary}
      </span>
    </button>
  );
}

/* ---------- Portal 面板 ---------- */

function PortalPanel({
  anchorRect,
  onClose,
  children,
}: {
  anchorRect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    width: number;
    placement: 'below' | 'above';
  } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
    const gutter = 8;
    const width = Math.min(360, vw - gutter * 2);
    let left = anchorRect.left;
    if (left + width > vw - gutter) left = vw - gutter - width;
    if (left < gutter) left = gutter;

    const spaceBelow = vh - anchorRect.bottom - gutter;
    const spaceAbove = anchorRect.top - gutter;
    const preferBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
    const placement: 'below' | 'above' = preferBelow ? 'below' : 'above';
    const maxHeight = Math.min(
      480,
      Math.max(180, placement === 'below' ? spaceBelow : spaceAbove),
    );
    const top =
      placement === 'below'
        ? anchorRect.bottom + gutter
        : Math.max(gutter, anchorRect.top - gutter - maxHeight);

    setPos({ top, left, maxHeight, width, placement });
  }, [anchorRect]);

  useEffect(() => {
    function onDoc(e: Event) {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!mounted || !pos) return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[95] rounded-xl border border-white/15 bg-[#141416] p-4 shadow-2xl"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ---------- 各面板 ---------- */

function MultiPick({
  title,
  items,
  selected,
  onChange,
}: {
  title: string;
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }
  return (
    <div>
      <h5 className="mb-2 text-xs tracking-[0.25em] text-white/60">{title}</h5>
      {items.length === 0 ? (
        <p className="text-xs text-white/40">空</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/85 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={selected.includes(it.id)}
                  onChange={() => toggle(it.id)}
                />
                <span className="truncate">{it.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MultiPickWithManage(
  props: Parameters<typeof MultiPick>[0] & {
    onManage: () => void;
    manageLabel: string;
  },
) {
  return (
    <div>
      <MultiPick {...props} />
      <button
        onClick={props.onManage}
        className="mt-3 w-full rounded-md border border-white/15 py-1.5 text-xs text-white/80 hover:bg-white/5"
      >
        {props.manageLabel}
      </button>
    </div>
  );
}

function SinglePick({
  title,
  items,
  selected,
  onChange,
}: {
  title: string;
  items: { id: string; label: string; hint?: string }[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <h5 className="mb-2 text-xs tracking-[0.25em] text-white/60">{title}</h5>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id || '_none'}>
            <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm text-white/85 hover:bg-white/5">
              <input
                type="radio"
                name="single-pick"
                checked={selected === it.id}
                onChange={() => onChange(it.id)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block">{it.label}</span>
                {it.hint && (
                  <span className="block text-[11px] text-white/40">
                    {it.hint}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SinglePickWithManage(
  props: Parameters<typeof SinglePick>[0] & {
    onManage: () => void;
    manageLabel: string;
  },
) {
  return (
    <div>
      <SinglePick {...props} />
      <button
        onClick={props.onManage}
        className="mt-3 w-full rounded-md border border-white/15 py-1.5 text-xs text-white/80 hover:bg-white/5"
      >
        {props.manageLabel}
      </button>
    </div>
  );
}

function WordPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = !WORD_PRESETS.includes(value);
  const [custom, setCustom] = useState(isCustom ? value : '');
  return (
    <div>
      <h5 className="mb-2 text-xs tracking-[0.25em] text-white/60">字数上限</h5>
      <ul className="space-y-1">
        {WORD_PRESETS.map((w) => (
          <li key={w}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/85 hover:bg-white/5">
              <input
                type="radio"
                name="word"
                checked={!isCustom && value === w}
                onChange={() => onChange(w)}
              />
              <span>{w === 'unlimited' ? '不限' : `约 ${w} 字`}</span>
            </label>
          </li>
        ))}
        <li>
          <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/85">
            <input
              type="radio"
              name="word"
              checked={isCustom}
              onChange={() => onChange(custom || '1500')}
            />
            自填：
            <input
              type="text"
              value={custom}
              onChange={(e) => {
                const v = e.target.value.trim();
                setCustom(v);
                if (v) onChange(v);
              }}
              placeholder="例：1500"
              className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
        </li>
      </ul>
    </div>
  );
}

function ExtraPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h5 className="mb-2 text-xs tracking-[0.25em] text-white/60">附加条件</h5>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="例：加入一段江边夜话…"
        className="w-full resize-y rounded-md border border-white/15 bg-black/40 p-2 text-sm text-white outline-none focus:border-white/40"
      />
    </div>
  );
}
