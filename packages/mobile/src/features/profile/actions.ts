import { authClient } from "../auth";

export const signOutProfile = () => authClient.signOut();
