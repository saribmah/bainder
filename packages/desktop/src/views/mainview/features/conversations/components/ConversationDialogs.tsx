import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button, IconButton, Icons, Input, Sheet } from "@baindar/ui";
import type { Conversation } from "@baindar/sdk";

export function ConversationRenameDialog({
  conversation,
  onCancel,
  onSave,
}: {
  conversation: Conversation;
  onCancel: () => void;
  onSave: (title: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState(conversation.title);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== conversation.title && !saving;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConversationModal label="Rename conversation" onCancel={onCancel}>
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="t-label-l">Rename conversation</span>
        <IconButton aria-label="Close" size="sm" onClick={onCancel}>
          <Icons.Close size={14} />
        </IconButton>
      </div>
      <Input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-3"
        maxLength={200}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canSave) {
            event.preventDefault();
            void save();
          }
        }}
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!canSave} onClick={save}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </ConversationModal>
  );
}

export function ConversationDeleteDialog({
  conversation,
  onCancel,
  onConfirm,
}: {
  conversation: Conversation;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const confirm = async () => {
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      setWorking(false);
    }
  };

  return (
    <ConversationModal label="Delete conversation" onCancel={onCancel}>
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="t-label-l">Delete conversation?</span>
        <IconButton aria-label="Close" size="sm" onClick={onCancel}>
          <Icons.Close size={14} />
        </IconButton>
      </div>
      <p className="t-body-m mt-2 text-bd-fg-subtle">
        <span className="font-medium">"{conversation.title}"</span> and its full message history
        will be permanently removed. This can't be undone.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={working}>
          Cancel
        </Button>
        <Button variant="wine" disabled={working} onClick={confirm}>
          {working ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </ConversationModal>
  );
}

function ConversationModal({
  label,
  onCancel,
  children,
}: {
  label: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={label}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: "rgba(20, 15, 10, 0.35)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-2xl">
        <Sheet>{children}</Sheet>
      </div>
    </div>
  );
}
