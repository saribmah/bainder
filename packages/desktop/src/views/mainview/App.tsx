import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth, SignIn, SignUp } from "./features/auth";
import { Dashboard } from "./features/dashboard";
import { Landing } from "./features/landing";
import { Highlights, Library, LibraryDetail, Notes, ShelfDetail } from "./features/library";
import { SettingsPage } from "./features/profile";
import { Reader } from "./features/reader";

// HashRouter, not BrowserRouter — the prod bundle is loaded from
// views://mainview/index.html which has no HTML5 history server.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/shelves/:id" element={<ShelfDetail />} />
          <Route path="/library/:id" element={<LibraryDetail />} />
          <Route path="/highlights" element={<Highlights />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/read/:id" element={<Reader />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
