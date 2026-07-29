'use client';

import { useState } from 'react';

export type Msg = {
  id: string;
  role: 'user' | 'assistant';
  variants: string[];
  variantIndex: number;
  createdAt: number;
};

export default function MessageItem({
  message,
  streaming,
  onReroll,
  onDelete,
  onSwitchVariant,
  onEditUserSubmit,
}: {
  message: Msg;
  streaming: boolean;
  onReroll: () => void;
  onDelete: () => void;
  onSwitchVariant: (i: number) => void;
  onEditUserSubmit: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const content = message.variants[message.variantIndex] ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmEditExit, setConfirmEditExit] = useState(false);

  const showTyping = streaming && content.length === 0;

  function beginEdit() {
    setDraft(content);
    setEditing(true);
  }
  function tryExit() {
    if (draft !== content) setConfirmEditExit(true);
    else setEditing(false);
  }
  function copy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content);
    }
  }

  return (
    <div className={`group mb-6 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block max-w-full rounded-2xl px-4 py-3 text-left text-sm leading-[1.85] ${
            isUser
              ? 'bg-white text-black'
              : 'bg-white/[0.05] text-white/90 border border-white/10'
          }`}
        >
          {editing ? (
            <div className="min-w-[240px]">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={Math.max(3, Math.min(16, draft.split('\n').length + 1))}
                className={`w-full resize-y rounded-md p-2 text-sm outline-none ${
                  isUser
                    ? 'bg-black/5 text-black border border-black/10'
                    : 'bg-black/40 text-white border border-white/15'
                }`}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={tryExit}
                  className={`rounded-full px-3 py-1 text-[11px] tracking-widest ${
                    isUser
                      ? 'border border-black/15 text-black/70'
                      : 'border border-white/20 text-white/70'
                  }`}
                >
                  取消
                </button>
                <button
                  disabled={!draft.trim() || draft === content}
                  onClick={() => {
                    onEditUserSubmit(draft.trim());
                    setEditing(false);
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] tracking-widest disabled:opacity-40 ${
                    isUser
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  保存并重发
                </button>
              </div>
            </div>
          ) : showTyping ? (
            <TypingDots />
          ) : (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          )}
        </div>

        {/* 操作条 */}
        {!editing && (
          <div
            className={`mt-1 flex items-center gap-2 text-[11px] text-white/40 ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            {!isUser && message.variants.length > 1 && (
              <div className="flex items-center gap-1 text-white/50">
                <button
                  disabled={message.variantIndex <= 0}
                  onClick={() =>
                    onSwitchVariant(Math.max(0, message.variantIndex - 1))
                  }
                  className="rounded px-1 hover:bg-white/10 disabled:opacity-30"
                  aria-label="上一版本"
                >
                  ‹
                </button>
                <span>
                  {message.variantIndex + 1}/{message.variants.length}
                </span>
                <button
                  disabled={message.variantIndex >= message.variants.length - 1}
                  onClick={() =>
                    onSwitchVariant(
                      Math.min(
                        message.variants.length - 1,
                        message.variantIndex + 1,
                      ),
                    )
                  }
                  className="rounded px-1 hover:bg-white/10 disabled:opacity-30"
                  aria-label="下一版本"
                >
                  ›
                </button>
              </div>
            )}
            {!isUser && (
              <>
                <ActionBtn onClick={copy} title="复制">复制</ActionBtn>
                <ActionBtn
                  onClick={onReroll}
                  title="重新生成"
                  disabled={streaming}
                >
                  重 roll
                </ActionBtn>
              </>
            )}
            {isUser && (
              <ActionBtn onClick={beginEdit} title="编辑并重发">
                编辑
              </ActionBtn>
            )}
            <ActionBtn onClick={() => setConfirmDel(true)} title="删除">
              删除
            </ActionBtn>
          </div>
        )}
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-6">
            <h5 className="text-base text-white">删除这条消息？</h5>
            <p className="mt-2 text-sm text-white/60">
              删除后无法恢复。这不会影响其他消息。
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

      {confirmEditExit && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-6">
            <h5 className="text-base text-white">放弃编辑？</h5>
            <p className="mt-2 text-sm text-white/60">刚才的修改将会丢失。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmEditExit(false)}
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/75"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setConfirmEditExit(false);
                }}
                className="rounded-full bg-red-500/90 px-4 py-1.5 text-xs text-white"
              >
                放弃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="rounded px-1.5 py-0.5 text-[11px] tracking-widest text-white/45 transition hover:bg-white/10 hover:text-white/85 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/50 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/50 [animation-delay:180ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/50 [animation-delay:360ms]" />
    </span>
  );
}
