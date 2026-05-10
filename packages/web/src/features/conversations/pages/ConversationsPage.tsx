import { useEffect, useRef, useState } from "react";
import { Button, ChatConversationListItem, ChipButton, Icons, Skeleton, Toast } from "@baindar/ui";
import type { Conversation, Document } from "@baindar/sdk";
import { useProfileName } from "../../profile";
import { AppSidebar } from "../../library/components/AppSidebar";
import { useLibraryDocuments } from "../../library/hooks/useLibraryDocuments";
import { useLibraryShelves } from "../../library/hooks/useLibraryShelves";
import { ConversationChatPane } from "../components/ConversationChatPane";
import {
  ConversationDeleteDialog,
  ConversationRenameDialog,
} from "../components/ConversationDialogs";
import { useConversations } from "../hooks/useConversations";

export function ConversationsPage() {
  const reader = useProfileName();
  const { documents, uploading, uploadDocument, toast } = useLibraryDocuments();
  const { shelves } = useLibraryShelves(documents);
  const [filter, setFilter] = useState<"all" | "reader" | "binder">("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const { conversations, selected, selectedId, status, error, select, create, rename, remove } =
    useConversations();

  const visible = conversations.filter((conversation) => {
    if (filter === "reader") return conversation.primaryDocId !== null;
    if (filter === "binder") return conversation.primaryDocId === null;
    return true;
  });

  return (
    <main className="flex h-dvh min-h-screen overflow-hidden bg-bd-bg text-bd-fg">
      <AppSidebar
        reader={reader}
        uploading={uploading}
        onUpload={uploadDocument}
        shelves={shelves}
      />

      <section className="flex min-w-0 flex-1 overflow-hidden">
        <div
          className={[
            "min-w-0 flex-1 overflow-y-auto px-6 pb-8 pt-16 lg:px-12 lg:py-8",
            selected ? "hidden xl:block" : "",
          ].join(" ")}
        >
          <div className="mx-auto flex h-full max-w-5xl flex-col">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="t-label-s text-bd-fg-muted">
                  Conversations · {conversations.length} · across your binder
                </div>
                <h1 className="mt-1 font-display text-[clamp(34px,5vw,48px)] font-normal leading-[1.05] tracking-[0]">
                  What you've talked through.
                </h1>
              </div>
              <button
                type="button"
                className="bd-btn bd-btn-pill bd-btn-primary bd-btn-md"
                onClick={() => void create()}
              >
                <Icons.Plus size={14} />
                New conversation
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
              <ChipButton
                variant={filter === "all" ? "active" : "filled"}
                onClick={() => setFilter("all")}
              >
                All · {conversations.length}
              </ChipButton>
              <ChipButton
                variant={filter === "reader" ? "active" : "outline"}
                onClick={() => setFilter("reader")}
              >
                From a passage · {conversations.filter((item) => item.primaryDocId).length}
              </ChipButton>
              <ChipButton
                variant={filter === "binder" ? "active" : "outline"}
                onClick={() => setFilter("binder")}
              >
                Whole binder · {conversations.filter((item) => !item.primaryDocId).length}
              </ChipButton>
            </div>

            {error && (
              <p className="t-body-s mt-4 rounded-md bg-bd-surface-hover px-4 py-3 text-error">
                {error}
              </p>
            )}

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
              {status === "loading" ? (
                <ConversationSkeleton />
              ) : visible.length === 0 ? (
                <EmptyList onCreate={() => void create()} />
              ) : (
                visible.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === selectedId}
                    menuOpen={menuId === conversation.id}
                    onSelect={() => {
                      setMenuId(null);
                      select(conversation.id);
                    }}
                    onMore={() =>
                      setMenuId((current) => (current === conversation.id ? null : conversation.id))
                    }
                    onRename={() => {
                      setMenuId(null);
                      setRenameTarget(conversation);
                    }}
                    onDelete={() => {
                      setMenuId(null);
                      setDeleteTarget(conversation);
                    }}
                    onCloseMenu={() => setMenuId(null)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {selected ? (
          <div className="flex min-h-0 w-full shrink-0 overflow-hidden xl:w-[55%] xl:border-l xl:border-bd-border">
            <ConversationChatPane
              key={selected.id}
              conversation={selected}
              onClose={() => select(null)}
            />
          </div>
        ) : (
          <ConversationInsights
            conversations={conversations}
            documents={documents}
            onCreate={() => void create()}
          />
        )}
      </section>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2">
          <Toast iconStart={<Icons.Check size={18} color="var(--success)" />}>{toast}</Toast>
        </div>
      )}

      {renameTarget && (
        <ConversationRenameDialog
          conversation={renameTarget}
          onCancel={() => setRenameTarget(null)}
          onSave={async (title) => {
            await rename(renameTarget.id, title);
            setRenameTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConversationDeleteDialog
          conversation={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await remove(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </main>
  );
}

function ConversationRow({
  conversation,
  active,
  menuOpen,
  onSelect,
  onMore,
  onRename,
  onDelete,
  onCloseMenu,
}: {
  conversation: Conversation;
  active: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMore: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCloseMenu: () => void;
}) {
  return (
    <div className="relative">
      <ChatConversationListItem
        active={active}
        conversation={{
          id: conversation.id,
          title: conversation.title,
          source: conversation.primaryDocId ? "Reader conversation" : "Binder-wide",
          when: relativeDate(conversation.lastActivityAt),
          preview: conversation.primaryDocId
            ? "Started from a passage in the reader"
            : "Across documents, notes, and highlights",
        }}
        moreLabel={`Actions for ${conversation.title}`}
        onClick={onSelect}
        onMore={onMore}
      />
      {menuOpen && (
        <ConversationActionsMenu onClose={onCloseMenu} onRename={onRename} onDelete={onDelete} />
      )}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton shape="circle" width={36} height={36} />
          <div className="min-w-0 flex-1">
            <Skeleton width="62%" height={18} />
            <Skeleton width="38%" height={12} className="mt-2" />
            <Skeleton width="78%" height={14} className="mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyList({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-col justify-center gap-4">
      <p className="font-reading text-[18px] leading-[1.6] text-bd-fg-subtle">
        No conversations match this view.
      </p>
      <button
        type="button"
        className="bd-btn bd-btn-pill bd-btn-secondary bd-btn-sm"
        onClick={onCreate}
      >
        Start a conversation
      </button>
    </div>
  );
}

function ConversationInsights({
  conversations,
  documents,
  onCreate,
}: {
  conversations: readonly Conversation[];
  documents: readonly Document[] | null;
  onCreate: () => void;
}) {
  const sources = getSourceRows(conversations, documents).slice(0, 6);
  const suggestionSource = sources[0]?.title ?? "your binder";

  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-bd-border px-7 py-8 xl:block">
      <div className="t-label-s mb-3 text-bd-fg-muted">By source</div>
      <div className="flex flex-col gap-1">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-3 rounded-md px-3 py-2">
            <span className="t-body-m min-w-0 flex-1 truncate text-bd-fg-subtle">
              {source.title}
            </span>
            <span className="font-mono text-[11px] text-bd-fg-muted">{source.count}</span>
          </div>
        ))}
      </div>

      <div className="t-label-s mb-3 mt-8 text-bd-fg-muted">Suggestions</div>
      <div className="rounded-xl bg-bd-surface-raised px-4 py-3.5">
        <p className="t-body-s m-0 leading-6 text-bd-fg-subtle">
          Start from {suggestionSource}, or ask a binder-wide question across your sources.
        </p>
        <Button
          size="sm"
          variant="secondary"
          iconStart={<Icons.Plus size={12} />}
          className="mt-3 w-full"
          onClick={onCreate}
        >
          Start a conversation
        </Button>
      </div>
    </aside>
  );
}

function ConversationActionsMenu({
  onClose,
  onRename,
  onDelete,
}: {
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menuRef.current || !target) return;
      if (menuRef.current.contains(target)) return;
      const moreButton =
        target instanceof Element ? target.closest('[aria-label^="Actions for"]') : null;
      if (moreButton) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-2 top-full z-20 mt-1 w-40 rounded-[12px] border border-bd-border bg-bd-bg p-1 shadow-[var(--sh-md)]"
    >
      <button
        type="button"
        className="t-body-s flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-bd-fg hover:bg-bd-surface-hover"
        onClick={onRename}
      >
        Rename
      </button>
      <button
        type="button"
        className="t-body-s flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-error hover:bg-bd-surface-hover"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}

function getSourceRows(
  conversations: readonly Conversation[],
  documents: readonly Document[] | null,
): Array<{ id: string; title: string; count: number }> {
  const documentTitles = new Map(documents?.map((document) => [document.id, document.title]) ?? []);
  const counts = new Map<string, { title: string; count: number }>();

  for (const conversation of conversations) {
    const id = conversation.primaryDocId ?? "binder";
    const title = conversation.primaryDocId
      ? (documentTitles.get(conversation.primaryDocId) ?? "Reader source")
      : "Whole binder";
    const row = counts.get(id);
    counts.set(id, { title, count: (row?.count ?? 0) + 1 });
  }

  if (counts.size === 0) {
    for (const document of documents?.slice(0, 4) ?? []) {
      counts.set(document.id, { title: document.title, count: 0 });
    }
  }

  return Array.from(counts, ([id, source]) => ({ id, ...source })).sort(
    (a, b) => b.count - a.count || a.title.localeCompare(b.title),
  );
}

function relativeDate(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
