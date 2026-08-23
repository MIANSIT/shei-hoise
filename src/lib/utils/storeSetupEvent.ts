// Broadcasts store-setup changes across the dashboard's persistent layout
// tree. The layout (banner) and the sidebar each hold their own independent
// copy of this data, fetched once on mount — Next's App Router keeps the
// layout mounted across route navigations, so anything that happens on
// /dashboard/complete-setup (a different route) has no prop path back to
// either of them. Same-tab DOM events are the simplest way to reach both
// without introducing a shared context/store for two small pieces of state.
const COMPLETED_EVENT = "shei:store-setup-completed";
const PROGRESS_EVENT = "shei:store-setup-progress";

export function emitStoreSetupCompleted() {
  window.dispatchEvent(new Event(COMPLETED_EVENT));
}

export function onStoreSetupCompleted(handler: () => void) {
  window.addEventListener(COMPLETED_EVENT, handler);
  return () => window.removeEventListener(COMPLETED_EVENT, handler);
}

export function emitStoreSetupProgress(steps: string[]) {
  window.dispatchEvent(new CustomEvent<string[]>(PROGRESS_EVENT, { detail: steps }));
}

export function onStoreSetupProgress(handler: (steps: string[]) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<string[]>).detail);
  };
  window.addEventListener(PROGRESS_EVENT, listener);
  return () => window.removeEventListener(PROGRESS_EVENT, listener);
}
