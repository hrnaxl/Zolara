// Lightweight cross-page sync for gift card generation
// Both pages fire this event after generating, and both listen to re-fetch

const EVENT_KEY = "zolara:gift_cards_updated";

export function notifyGiftCardsUpdated() {
  // Fires in current tab
  window.dispatchEvent(new CustomEvent(EVENT_KEY));
  // Fires in other tabs via localStorage
  localStorage.setItem(EVENT_KEY, String(Date.now()));
}

export function onGiftCardsUpdated(callback: () => void): () => void {
  const handleLocal = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === EVENT_KEY) callback();
  };
  window.addEventListener(EVENT_KEY, handleLocal);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(EVENT_KEY, handleLocal);
    window.removeEventListener("storage", handleStorage);
  };
}
