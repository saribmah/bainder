# Add an auth provider (recipe)

The template ships with **JWT bearer auth** only — `middleware/auth.ts` parses
the `Authorization: Bearer <token>` header and verifies it against
`JWT_SECRET`. Use this recipe to add additional providers.

Auth providers belong in the `user/` (or `auth/`, `account/`) feature
namespace, not in `middleware/`. The middleware just resolves the
`AuthContext`; provider verification logic is feature code.

## Common providers

### SIWE (Sign-In with Ethereum)

1. Install: `bun add --filter '*/api' viem`
2. Create `src/user/siwe.ts` with: nonce issue/consume (KV-backed), message
   parse + signature verify (using `viem.recoverMessageAddress`), domain/chain
   guards.
3. Add a feature operation: `User.signInWithSiwe({ message, signature })` →
   verifies, looks up/creates account, mints JWT, returns tokens.
4. Add a `KV` binding for nonces in `wrangler.jsonc` and re-run cf-typegen.
5. Add a route: `POST /user/signin/siwe/nonce` → issue, `POST /user/signin`
   → verify + sign in.

### Privy

1. Install: `bun add --filter '*/api' @privy-io/server-auth`
2. Create `src/user/privy.ts` — verify the Privy `id_token` server-side using
   the SDK, extract `walletAddresses` / `email` / `displayName`.
3. Add `User.signInWithPrivy({ token })`.
4. Add `PRIVY_APP_ID` + `PRIVY_APP_SECRET` to `wrangler.jsonc → secrets.required`.
5. Add a route: `POST /user/signin` accepting `{ providerType: "Privy", token }`.

### OAuth (GitHub, Google, etc.)

1. Implement the OAuth code-exchange flow in `src/user/oauth.ts`.
2. Store provider credentials in `wrangler.jsonc → secrets.required`.
3. Use a KV binding to track state/PKCE during the redirect handshake.

## Pattern (any provider)

```ts
// In src/user/user.ts
export namespace User {
  export const signIn = async (input: SignInInput): Promise<SignInOutput> => {
    const credentials = await provider.verify(input);   // throws typed errors on failure
    const account = await UserStorage.findOrCreate(credentials);
    const tokens = await mintTokens(account, Config.requireJwtSecret());
    return { tokens, user: account };
  };
}
```

The route maps the provider verification errors to 401/400 via
`createErrorMapper`. Mint tokens with `jose.SignJWT` (already a transitive dep).

## Why providers go in the feature, not the middleware

`middleware/auth.ts` only translates `Authorization: Bearer <jwt>` into an
`AuthContext`. The middleware doesn't know about Privy, SIWE, OAuth — those
are sign-in flows that produce JWTs. Once issued, every subsequent request
goes through the same middleware path.
