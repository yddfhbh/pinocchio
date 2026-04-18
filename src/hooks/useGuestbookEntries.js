import { useEffect, useState } from "react";
import {
  DEFAULT_GUESTBOOK_ENTRIES,
  fetchGuestbookEntries,
} from "../lib/guestbook";

function useGuestbookEntries(limit) {
  const [entries, setEntries] = useState(() =>
    DEFAULT_GUESTBOOK_ENTRIES.slice(0, limit)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      setIsLoading(true);

      try {
        const nextEntries = await fetchGuestbookEntries(limit);

        if (cancelled) {
          return;
        }

        setEntries(nextEntries);
        setError("");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setEntries(DEFAULT_GUESTBOOK_ENTRIES.slice(0, limit));
        setError(
          loadError instanceof Error
            ? loadError.message
            : "방명록을 불러오지 못했습니다."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return {
    entries,
    isLoading,
    error,
    setEntries,
  };
}

export default useGuestbookEntries;
