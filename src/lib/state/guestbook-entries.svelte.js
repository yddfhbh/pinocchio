import {
  DEFAULT_GUESTBOOK_ENTRIES,
  fetchGuestbookEntries,
} from "$lib/guestbook";

export function createGuestbookEntriesState(limit) {
  const guestbook = $state({
    entries: DEFAULT_GUESTBOOK_ENTRIES.slice(0, limit),
    isLoading: true,
    error: "",
  });

  async function reload() {
    guestbook.isLoading = true;

    try {
      guestbook.entries = await fetchGuestbookEntries(limit);
      guestbook.error = "";
    } catch (loadError) {
      guestbook.entries = DEFAULT_GUESTBOOK_ENTRIES.slice(0, limit);
      guestbook.error =
        loadError instanceof Error
          ? loadError.message
          : "방명록을 불러오지 못했습니다.";
    } finally {
      guestbook.isLoading = false;
    }
  }

  return {
    guestbook,
    reload,
  };
}
