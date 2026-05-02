import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "../auth.client";
import { LoadingShell } from "../components/LoadingShell";

export function RequireAuth() {
  const session = authClient.useSession();

  if (session.isPending) return <LoadingShell />;
  if (!session.data?.user) return <Navigate to="/" replace />;

  return <Outlet />;
}
