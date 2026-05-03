import { authClient } from "../auth/auth.client";

export const signOutProfile = () => authClient.signOut();
