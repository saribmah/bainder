import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { SignIn } from "./auth/SignIn";
import { Library } from "./library/Library";
import { Reader } from "./reader/Reader";

// HashRouter, not BrowserRouter — the prod bundle is loaded from
// views://mainview/index.html which has no HTML5 history server.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route element={<RequireAuth />}>
          <Route index element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<Library />} />
          <Route path="/read/:id" element={<Reader />} />
        </Route>
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
    </HashRouter>
  );
}
