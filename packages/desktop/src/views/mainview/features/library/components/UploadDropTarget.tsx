import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { ACCEPT_ATTR } from "../constants";

export function UploadDropTarget({
  uploading,
  onFile,
  className = "",
  children,
}: {
  uploading: boolean;
  onFile: (file: File) => void;
  className?: string;
  children: (args: { browse: () => void; dragging: boolean }) => ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);

  const browse = () => inputRef.current?.click();
  const handleFiles = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a document"
      onClick={browse}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          browse();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className={[
        "transition-colors",
        dragging ? "border-bd-accent bg-bd-surface-hover" : "",
        uploading ? "pointer-events-none opacity-70" : "",
        className,
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {children({ browse, dragging })}
    </div>
  );
}
