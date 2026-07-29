'use client';

import { useEffect, useRef, useState } from 'react';

export type Defaults = {
  characterIds: string[];
  presetIds: string[];
  worldbookIds: string[];
  styleId: string;
  viewpoint: string;
  wordLimit: string; // '500'|'1000'|'2000'|'3000'|'unlimited'|自填
  extra: string;
};

type Character = { id: string; name: string };
type Style = { id: string; name: string; description: string | null };
type Preset = { id: string; title: string; content: string };

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
  config: { model: string };
}) {
  const [openPanel, setOpenPanel] = useState<
    null | 'char' | 'preset' | 'world' | 'style' | 'view' | 'word' | 'extra'
  >(null);

  function togglePanel(k: any) {
    setOpenPanel((cur) => (cur === k ? null : k));
  }
  function patch(p: Partial<Defaults>) {
    onChange({ ...defaults, ...p });
  }

  const chipCls =
    'shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] tracking-wider text-white/80 hover:border-white/35 whitespace-nowrap';

  const selChars = characters.filter((c) =>
    defaults.characterIds.includes(c.id),
  );
  const selPresets = presets.filter((p) =>
    defaults.presetIds.includes(p.id),
  );
  const selWorlds = worldbooks.filter((p) =>
    defaults.worldbookIds.includes(p.id),
  );
  const style = styles.find((s) => s.id === defaults.styleId);

  return (
    <div className="relative flex items-center gap-2 py-1">
      <div className={chipCls + ' cursor-default opacity-80'}>
        模型：{config.model || '未选'}
      </div>

      <Chip
        label="人设"
        summary={selChars.map((c) => c.name).join('、') || '未选'}
        onClick={() => togglePanel('char')}
      />
      <Chip
        label="自定义人设"
        summary={selPresets.map((p) => p.title).join('、') || `${presets.length} 项`}
        onClick={() => togglePanel('preset')}
      />
      <Chip
        label="世界书"
        summary={selWorlds.map((p) => p.title).join('、') || `${worldbooks.length} 项`}
        onClick={() => togglePanel('world')}
      />
      <Chip
        label="文风"
        summary={style?.name || '未选'}
        onClick={() => togglePanel('style')}
      />
      <Chip
        label="视角"
        summary={defaults.viewpoint || '未选'}
        onClick={() => togglePanel('view')}
      />
      <Chip
        label="字数"
        summary={defaults.wordLimit === 'unlimited' ? '不限' : `≈${defaults.wordLimit}`}
        onClick={() => togglePanel('word')}
      />
      <Chip
        label="附加条件"
        summary={defaults.extra ? '已填' : '无'}
        onClick={() => togglePanel('extra')}
      />

      {openPanel && (
        <Panel onClose={() => setOpenPanel(null)}>
          {openPanel === 'char' && (
            <MultiPick
              title="选择官方角色"
              items={characters.map((c) => ({ id: c.id, label: c.name }))}
              selected={defaults.characterIds}
              onChange={(ids) => patch({ characterIds: ids })}
            />
          )}
          {openPanel === 'preset' && (
            <MultiPickWithManage
              title="选择自定义人设"
              items={presets.map((p) => ({ id: p.id, label: p.title }))}
              selected={defaults.presetIds}
              onChange={(ids) => patch({ presetIds: ids })}
              onManage={onManagePresets}
              manageLabel="管理自定义人设"
            />
          )}
          {openPanel === 'world' && (
            <MultiPickWithManage
              title="选择世界书 / 其他设定"
              items={worldbooks.map((p) => ({ id: p.id, label: p.title }))}
              selected={defaults.worldbookIds}
              onChange={(ids) => patch({ worldbookIds: ids })}
              onManage={onManageWorldbooks}
              manageLabel="管理世界书"
            />
          )}
          {openPanel === 'style' && (
            <SinglePick
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
            />
          )}
          {openPanel === 'view' && (
            <SinglePick
              title="叙述视角"
              items={VIEWPOINTS.map((v) => ({ id: v, label: v }))}
              selected={defaults.viewpoint}
              onChange={(v) => patch({ viewpoint: v })}
            />
          )}
          {openPanel === 'word' && (
            <WordPanel
              value={defaults.wordLimit}
              onChange={(v) => patch({ wordLimit: v })}
            />
          )}
          {openPanel === 'extra' && (
            <ExtraPanel
              value={defaults.extra}
              onChange={(v) => patch({ extra: v })}
            />
          )}
        </Panel>
      )}
    </div>
  );
}

/* ---------- 单元 ---------- */

function Chip({
  label,
  summary,
  onClick,
}: {
  label: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] tracking-wider text-white/85 hover:border-white/35"
    >
      <span className="text-white/50">{label}</span>
      <span className="mx-1 text-white/25">·</span>
      <span className="max-w-[10rem] truncate align-bottom">{summary}</span>
    </button>
  );
}

function Panel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute left-0 top-[100%] z-30 mt-2 w-[min(90vw,20rem)] rounded-xl border border-white/15 bg-[#141416] p-4 shadow-2xl"
    >
      {children}
    </div>
  );
}

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
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-white/85 hover:bg-white/5">
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
      <ul className="max-h-64 space-y-1 overflow-y-auto">
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
              <span>
                <span className="block">{it.label}</span>
                {it.hint && (
                  <span className="block text-[11px] text-white/40">{it.hint}</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
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
        rows={6}
        placeholder="例：加入一段江边夜话；池不晚偶尔冒出仓鼠碎念…"
        className="w-full resize-y rounded-md border border-white/15 bg-black/40 p-2 text-sm text-white outline-none focus:border-white/40"
      />
    </div>
  );
}
