import { useEffect, useState, type FormEvent } from "react";
import { Button, IconButton, Icons, Sheet } from "@bainder/ui";
import type { Document, Note } from "@bainder/sdk";

export type NoteDialogDraft = {
  documentId: string;
  body: string;
};

export function NoteDialog({
  title,
  documents,
  note,
  initialDocumentId,
  onCancel,
  onSave,
  onDelete,
}: {
  title: string;
  documents: ReadonlyArray<Document>;
  note?: Note | null;
  initialDocumentId?: string;
  onCancel: () => void;
  onSave: (draft: NoteDialogDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [documentId, setDocumentId] = useState(initialDocumentId ?? documents[0]?.id ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canChooseDocument = !note && documents.length > 1;

  useEffect(() => {
    setDocumentId(initialDocumentId ?? documents[0]?.id ?? "");
    setBody(note?.body ?? "");
    setError(null);
  }, [documents, initialDocumentId, note]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!documentId || !trimmed) return;
    setWorking(true);
    setError(null);
    try {
      await onSave({ documentId, body: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setWorking(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setWorking(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-30 flex items-end justify-center bg-[rgba(20,15,10,0.35)] px-4 py-6 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Sheet className="flex flex-col gap-5 p-6 sm:p-7" showHandle={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="t-label-s text-bd-fg-muted">{note ? "Edit note" : "New note"}</div>
              <h2 className="t-display-xs mt-1 text-bd-fg">{title}</h2>
            </div>
            <IconButton aria-label="Close" size="sm" onClick={onCancel}>
              <Icons.Close size={16} />
            </IconButton>
          </div>

          {canChooseDocument && (
            <label className="flex flex-col gap-2">
              <span className="t-label-s text-bd-fg-muted">Source</span>
              <select
                value={documentId}
                className="h-11 rounded-full border border-bd-border bg-bd-bg px-4 font-ui text-sm text-bd-fg outline-none focus:border-bd-fg"
                onChange={(event) => setDocumentId(event.currentTarget.value)}
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span className="t-label-s text-bd-fg-muted">Note</span>
            <textarea
              value={body}
              autoFocus
              rows={7}
              placeholder="What did you think?"
              className="w-full resize-none rounded-xl border border-bd-border bg-bd-bg px-4 py-3 font-reading text-[15px] leading-6 text-bd-fg outline-none placeholder:text-bd-fg-muted focus:border-bd-fg"
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </label>

          {error && (
            <p className="t-body-s m-0 rounded-md bg-bd-surface-hover px-3 py-2 text-error">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-error"
                disabled={working}
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
            <div className="min-w-3 flex-1" />
            <Button type="button" variant="ghost" size="sm" disabled={working} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={working || !documentId || !body.trim()}>
              {working ? "Saving..." : "Save note"}
            </Button>
          </div>
        </Sheet>
      </form>
    </div>
  );
}
