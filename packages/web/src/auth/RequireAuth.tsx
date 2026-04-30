import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "./auth.client";

export function RequireAuth() {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50 text-paper-900">
        <span className="t-body-m text-paper-500">Loading…</span>
      </main>
    );
  }

  if (!session.data?.user) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}
