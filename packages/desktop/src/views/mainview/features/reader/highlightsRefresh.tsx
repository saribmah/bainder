import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Bump-counter shared between the per-body `useHighlightLayer` and the
// document-wide `NotesSheet`. CRUD inside a body increments `refreshToken`
// so the sheet's full-document fetch re-runs and stays in sync.
const ReaderHighlightsContext = createContext<{
  refreshToken: number;
  bumpRefresh: () => void;
} | null>(null);

export function ReaderHighlightsProvider({ children }: { children: ReactNode }) {
  const [refreshToken, setRefreshToken] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshToken((n) => n + 1), []);
  const value = useMemo(() => ({ refreshToken, bumpRefresh }), [refreshToken, bumpRefresh]);
  return (
    <ReaderHighlightsContext.Provider value={value}>{children}</ReaderHighlightsContext.Provider>
  );
}

export function useReaderHighlights() {
  return useContext(ReaderHighlightsContext);
}
