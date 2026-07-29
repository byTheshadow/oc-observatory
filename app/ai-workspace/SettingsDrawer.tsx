'use client';

import { useState } from 'react';

export type AIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  stream: boolean;
};

const PW_KEY = 'oc-edit-password';
function getPassword() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PW_KEY) ?? '';
}

export default function SettingsDrawer({
  config,
  onChange,
  onClose,
}: {
  config: AIConfig;
  onChange: (c: AIConfig) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<AIConfig>(config);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function fetchModels() {
    setErr(null);
    setMsg(null);
    if (!local.baseUrl || !local.apiKey) {
      setErr('先填写 Base URL 和 API Key');
      return;
    }
    setLoadingModels(true);
    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getPassword(),
        },
        body: JSON.stringify({
          baseUrl: local.baseUrl,
          apiKey: local.apiKey,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setModels(j.models || []);
      setMsg(`拉到 ${j.models?.length ?? 0} 个模型`);
    } catch (e: any) {
      setErr(e?.message ?? '拉取失败');
    } finally {
      setLoadingModels(false);
    }
  }

  function save() {
    onChange(local);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-white/15 bg-[#111] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h4 className="text-sm tracking-[0.25em] text-white/90">
              AI 服务设置
            </h4>
            <p className="mt-1 text-[10px] tracking-[0.3em] text-white/40">
              仅保存在你的浏览器
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-white/35"
          >
            关闭
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <Field label="Base URL">
            <input
              value={local.baseUrl}
              onChange={(e) =>
                setLocal((c) => ({ ...c, baseUrl: e.target.value }))
              }
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
            <p className="mt-1 text-[11px] text-white/40">
              OpenAI 兼容端点根路径。末尾不用带斜杠。
            </p>
          </Field>

          <Field label="API Key">
            <input
              type="password"
              value={local.apiKey}
              onChange={(e) =>
                setLocal((c) => ({ ...c, apiKey: e.target.value }))
              }
              placeholder="sk-..."
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Key 只存本机 localStorage，服务端不会保存。
            </p>
          </Field>

          <Field label="模型">
            <div className="flex gap-2">
              <select
                value={local.model}
                onChange={(e) =>
                  setLocal((c) => ({ ...c, model: e.target.value }))
                }
                className="flex-1 rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              >
                <option value="" className="bg-[#111]">
                  （选择或手动输入）
                </option>
                {models.map((m) => (
                  <option key={m} value={m} className="bg-[#111]">
                    {m}
                  </option>
                ))}
                {local.model && !models.includes(local.model) && (
                  <option value={local.model} className="bg-[#111]">
                    {local.model}（当前）
                  </option>
                )}
              </select>
              <button
                onClick={fetchModels}
                disabled={loadingModels}
                className="rounded-md border border-white/15 px-3 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                {loadingModels ? '拉取中…' : '拉取列表'}
              </button>
            </div>
            <input
              value={local.model}
              onChange={(e) =>
                setLocal((c) => ({ ...c, model: e.target.value }))
              }
              placeholder="或手动输入模型 ID"
              className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
          </Field>

          <Field label="流式输出">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={local.stream}
                onChange={(e) =>
                  setLocal((c) => ({ ...c, stream: e.target.checked }))
                }
              />
              开启后回复会一段段推过来
            </label>
          </Field>

          {err && (
            <p className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {err}
            </p>
          )}
          {msg && !err && (
            <p className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70">
              {msg}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/75"
          >
            取消
          </button>
          <button
            onClick={save}
            className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black hover:bg-white/85"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] tracking-[0.25em] text-white/50">
        {label}
      </div>
      {children}
    </div>
  );
}
