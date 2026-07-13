// Phase S — request-scoped "active family" context.
//
// Rather than threading a `familyId` parameter through every service
// function (dozens of call sites across lists.js/finance.js/chat.js/
// notes.js/events.js/albums.js/timeline.js), the active family for the
// current request is stashed in an AsyncLocalStorage store. Each module's
// local `userFamilyId(userId)` helper consults `getActiveFamilyId()` first
// and only falls back to the `family_members ... LIMIT 1` query when there's
// no request context (e.g. a worker/script calling a service fn directly,
// or a request whose middleware didn't run for some reason).
//
// Safety: the context value is only ever set by the server.js middleware
// AFTER it has verified (via a membership query) that the resolved familyId
// is one the requesting user actually belongs to — so every consumer of
// getActiveFamilyId() can treat it as pre-authorized for the current user.
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();

/** Run `fn` with `familyId` bound as the active family for the duration of the (possibly async) call. */
export function runWithFamily(familyId, fn) {
  return als.run({ familyId }, fn);
}

/** The active family for the current request context, or null/undefined outside one. */
export function getActiveFamilyId() {
  return als.getStore()?.familyId ?? null;
}
