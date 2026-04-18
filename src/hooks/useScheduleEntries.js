import { useEffect, useState } from "react";
import {
  DEFAULT_SCHEDULE_ENTRIES,
  fetchScheduleEntries,
} from "../lib/schedule";

function getFallbackEntries(limit) {
  return limit ? DEFAULT_SCHEDULE_ENTRIES.slice(0, limit) : DEFAULT_SCHEDULE_ENTRIES;
}

function useScheduleEntries(limit) {
  const [entries, setEntries] = useState(() => getFallbackEntries(limit));
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setIsLoading(true);

    try {
      const result = await fetchScheduleEntries(limit);
      setEntries(result.entries);
      setIsAdmin(result.isAdmin);
      setError("");
    } catch (loadError) {
      setEntries(getFallbackEntries(limit));
      setIsAdmin(false);
      setError(
        loadError instanceof Error ? loadError.message : "일정을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      setIsLoading(true);

      try {
        const result = await fetchScheduleEntries(limit);

        if (cancelled) {
          return;
        }

        setEntries(result.entries);
        setIsAdmin(result.isAdmin);
        setError("");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setEntries(getFallbackEntries(limit));
        setIsAdmin(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "일정을 불러오지 못했습니다."
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
    setEntries,
    isAdmin,
    setIsAdmin,
    isLoading,
    error,
    reload,
  };
}

export default useScheduleEntries;
