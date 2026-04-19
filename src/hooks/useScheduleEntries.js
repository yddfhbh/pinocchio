import { useEffect, useState } from "react";
import {
  DEFAULT_SCHEDULE_ENTRIES,
  fetchScheduleEntries,
} from "../lib/schedule";

function getFallbackEntries(limit) {
  return limit ? DEFAULT_SCHEDULE_ENTRIES.slice(0, limit) : DEFAULT_SCHEDULE_ENTRIES;
}

function useScheduleEntries(limit) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setIsLoading(true);

    try {
      const result = await fetchScheduleEntries(limit);
      setEntries(result.entries);
      setError("");
    } catch (loadError) {
      setEntries(getFallbackEntries(limit));
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
        setError("");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setEntries(getFallbackEntries(limit));
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
    isLoading,
    error,
    reload,
  };
}

export default useScheduleEntries;
