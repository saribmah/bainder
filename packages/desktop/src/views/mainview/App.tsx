import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { SignIn, SignUp } from "./auth/SignIn";
import { Landing } from "./landing/Landing";
import { Library } from "./library/Library";
import { Reader } from "./reader/Reader";

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
          <Route path="/library" element={<Library />} />
          <Route path="/read/:id" element={<Reader />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
