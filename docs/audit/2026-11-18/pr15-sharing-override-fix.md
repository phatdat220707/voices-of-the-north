# PR #15 saved sharing-override repair

Based on exact candidate `e90d7f75209fb086958c283f74059bd628270698`.

## Finding

After a successful withdrawal, the canonical recording became
`scope=private`, `reviewStatus=withdrawn`, but its saved entry in
`scopeOverrides` remained. `store.scopeOf()` gives that override priority, so
the recording card could continue to render the old public sharing badge.

## Repair

`store.clearScopeOverride(id)` removes only the override for the named entity and
persists the remaining overrides unchanged. The withdrawal acknowledgement path
now clears:

- the recording ID for recording-card withdrawal;
- the published projection ID and linked source-record ID for story-detail
  withdrawal.

The canonical record patch still happens only after server acknowledgement and
continues to use `suppressSync`. Failures and cancellation do not clear an
override.

## Regression coverage

`node tools/verify/withdrawal_frontend.cjs` executes the actual store, API,
account and recording-rendering code with controlled fetch and DOM doubles. It
now covers both withdrawal entrypoints with saved overrides, confirms the
rendered recording badge becomes private, and covers success, failure and
cancellation while preserving unrelated overrides.

The complete selected PR #15 suite now reports **560 passing assertions**, plus
Python compilation, the 14-story frontend build and bundled JavaScript syntax.
The earlier 541 checks remain applicable; this repair adds 19 focused checks.

## Reviewer test steps

1. **Owner:** create an approved public synthetic recording, save its sharing
   choice as public, withdraw it from the recording card, and confirm the card
   shows private/withdrawn without an approved or public badge.
2. **Owner, story entrypoint:** repeat through the published story detail, then
   confirm the linked source recording also shows private/withdrawn while an
   unrelated recording keeps its override.
3. **Other member:** attempt both withdrawal routes and confirm HTTP 403 with no
   local withdrawal applied.
4. **Reviewer:** approve then withdraw an eligible synthetic recording and confirm
   the canonical private/withdrawn state, public-surface removal and blocked guest
   text/audio access.

All evidence uses isolated SQLite, temporary audio and synthetic identities. It
is not hosted staging acceptance. Supabase/PostgreSQL, invited OIDC, persistent
private audio, restart/restore and deployed-browser checks remain separate
release gates.
