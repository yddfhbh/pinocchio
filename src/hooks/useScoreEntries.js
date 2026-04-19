import { useEffect, useState } from "react";
import { DEFAULT_SCORE_ENTRIES, fetchScoreEntries } from "../lib/scores";

function useScoreEntries() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setIsLoading(true);

    try {
      const result = await fetchScoreEntries();
      setEntries(result.entries);
      setError("");
    } catch (loadError) {
      setEntries(DEFAULT_SCORE_ENTRIES);
      setError(
        loadError instanceof Error ? loadError.message : "악보 저장소를 불러오지 못했습니다."
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
        const result = await fetchScoreEntries();

        if (cancelled) {
          return;
        }

        setEntries(result.entries);
        setError("");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setEntries(DEFAULT_SCORE_ENTRIES);
        setError(
          loadError instanceof Error ? loadError.message : "악보 저장소를 불러오지 못했습니다."
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
  }, []);

  return {
    entries,
    setEntries,
    isLoading,
    error,
    reload,
  };
}

export default useScoreEntries;
