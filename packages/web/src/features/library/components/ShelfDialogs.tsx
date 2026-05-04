import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, IconButton, Icons, Input, Sheet } from "@baindar/ui";
import type { Document, ShelfCustom } from "@baindar/sdk";
import { LibraryCover } from "./LibraryCover";
import { SpineFan } from "./ShelfArtwork";
import { progressPercent, sourceLabel, statusLabel } from "../utils/document";

type ShelfDraft = {
  name: string;
  description: string;
};

export function CreateShelfDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (draft: ShelfDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ShelfDraft>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const canSave = draft.name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onCreate(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ShelfModal label="Create shelf" onCancel={onCancel}>
      <ShelfDialogHeader eyebrow="New shelf" title="Group books your way." onCancel={onCancel} />
      <ShelfForm draft={draft} onChange={setDraft} onSubmit={save} />
      <div className="flex items-center gap-3 rounded-[14px] bg-bd-surface-raised px-4 py-3">
        <SpineFan
          shelf={{
            kind: "custom",
            id: draft.name || "new-shelf",
            name: draft.name || "New shelf",
            description: draft.description || null,
            itemCount: 0,
            position: null,
            createdAt: "",
            updatedAt: "",
          }}
          size={36}
        />
        <p className="t-body-s text-bd-fg-muted">The first covers you add will shape this shelf.</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!canSave}>
          {saving ? "Creating..." : "Create shelf"}
        </Button>
      </div>
    </ShelfModal>
  );
}

export function EditShelfDialog({
  shelf,
  onCancel,
  onSave,
  onDelete,
}: {
  shelf: ShelfCustom;
  onCancel: () => void;
  onSave: (draft: ShelfDraft) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ShelfDraft>({
    name: shelf.name,
    description: shelf.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trimmed = draft.name.trim();
  const changed = trimmed !== shelf.name || draft.description.trim() !== (shelf.description ?? "");
  const canSave = trimmed.length > 0 && changed && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ShelfModal label="Edit shelf" onCancel={onCancel}>
      <ShelfDialogHeader eyebrow="Edit shelf" title="Keep the shelf clear." onCancel={onCancel} />
      <ShelfForm draft={draft} onChange={setDraft} onSubmit={save} />
      <div className="flex flex-col gap-2 border-t border-bd-border pt-4 sm:flex-row sm:justify-between">
        <Button
          variant="ghost"
          className="text-bd-accent"
          disabled={saving}
          onClick={async () => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            setSaving(true);
            try {
              await onDelete();
            } finally {
              setSaving(false);
            }
          }}
        >
          {confirmDelete ? "Confirm delete" : "Delete shelf"}
        </Button>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </ShelfModal>
  );
}

export function AddBooksDialog({
  shelf,
  documents,
  currentDocumentIds,
  onCancel,
  onAdd,
}: {
  shelf: ShelfCustom;
  documents: ReadonlyArray<Document>;
  currentDocumentIds: ReadonlySet<string>;
  onCancel: () => void;
  onAdd: (doc: Document) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents
      .filter((doc) => doc.status === "processed" && !currentDocumentIds.has(doc.id))
      .filter((doc) => {
        if (!normalized) return true;
        return (
          doc.title.toLowerCase().includes(normalized) ||
          sourceLabel(doc).toLowerCase().includes(normalized) ||
          doc.originalFilename.toLowerCase().includes(normalized)
        );
      });
  }, [currentDocumentIds, documents, query]);

  return (
    <ShelfModal label={`Add books to ${shelf.name}`} onCancel={onCancel} wide>
      <ShelfDialogHeader eyebrow="Add books" title={shelf.name} onCancel={onCancel} />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find books..."
        iconStart={<Icons.Search size={16} />}
      />
      <div className="max-h-[420px] overflow-y-auto pr-1">
        {available.length === 0 ? (
          <div className="rounded-xl border border-dashed border-bd-border-strong bg-bd-surface-raised px-5 py-8 text-center">
            <p className="t-label-m text-bd-fg">No available books</p>
            <p className="t-body-s mt-1 text-bd-fg-muted">
              {query.trim() ? "Try a different search." : "Everything processed is already here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {available.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-bd-surface-hover"
              >
                <LibraryCover doc={doc} width={42} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="t-label-m truncate text-bd-fg">{doc.title}</div>
                  <div className="t-body-s mt-0.5 truncate text-[11px] text-bd-fg-muted">
                    {sourceLabel(doc)} · {statusLabel(doc)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-bd-accent"
                  disabled={workingId === doc.id}
                  onClick={async () => {
                    setWorkingId(doc.id);
                    try {
                      await onAdd(doc);
                    } finally {
                      setWorkingId(null);
                    }
                  }}
                >
                  {workingId === doc.id ? "Adding..." : "Add"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Done
        </Button>
      </div>
    </ShelfModal>
  );
}

function ShelfForm({
  draft,
  onChange,
  onSubmit,
}: {
  draft: ShelfDraft;
  onChange: (draft: ShelfDraft) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label>
        <span className="t-label-s mb-1.5 block text-bd-fg-subtle">Name</span>
        <Input
          autoFocus
          value={draft.name}
          maxLength={80}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="For the design talk"
        />
      </label>
      <label>
        <span className="t-label-s mb-1.5 block text-bd-fg-subtle">
          Note <span className="font-normal normal-case text-bd-fg-muted">· optional</span>
        </span>
        <Input
          value={draft.description}
          maxLength={280}
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
          placeholder="A line about why this shelf exists."
        />
      </label>
    </div>
  );
}

function ShelfDialogHeader({
  eyebrow,
  title,
  onCancel,
}: {
  eyebrow: string;
  title: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="t-label-s text-bd-fg-muted">{eyebrow}</div>
        <h2 className="mt-1 font-display text-[28px] font-normal leading-[1.1] text-bd-fg">
          {title}
        </h2>
      </div>
      <IconButton aria-label="Close" size="sm" onClick={onCancel}>
        <Icons.Close size={14} />
      </IconButton>
    </div>
  );
}

function ShelfModal({
  label,
  onCancel,
  wide = false,
  children,
}: {
  label: string;
  onCancel: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-label={label}
      className="fixed inset-0 z-30 flex items-end justify-center px-3 sm:items-center"
      style={{ background: "rgba(20, 15, 10, 0.42)", backdropFilter: "blur(6px)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className={wide ? "w-full max-w-3xl" : "w-full max-w-lg"}
        onClick={(event) => event.stopPropagation()}
      >
        <Sheet className="flex flex-col gap-5 p-6 sm:p-8" showHandle={false}>
          {children}
        </Sheet>
      </div>
    </div>
  );
}
