import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_VIDEO_ENTRIES,
  fetchHomeVideoEntries,
} from "../lib/homeVideos";

function getFallbackEntries() {
  return DEFAULT_HOME_VIDEO_ENTRIES;
}

function useHomeVideos() {
  const [entries, setEntries] = useState(() => getFallbackEntries());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFallbackData, setIsFallbackData] = useState(true);

  const reload = async () => {
    setIsLoading(true);

    try {
      const result = await fetchHomeVideoEntries();
      setEntries(result.entries);
      setError("");
      setIsFallbackData(false);
    } catch (loadError) {
      setEntries(getFallbackEntries());
      setError(
        loadError instanceof Error
          ? loadError.message
          : "대표 공연 영상을 불러오지 못했습니다."
      );
      setIsFallbackData(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      setIsLoading(true);

      try {
        const result = await fetchHomeVideoEntries();

        if (cancelled) {
          return;
        }

        setEntries(result.entries);
        setError("");
        setIsFallbackData(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setEntries(getFallbackEntries());
        setError(
          loadError instanceof Error
            ? loadError.message
            : "대표 공연 영상을 불러오지 못했습니다."
        );
        setIsFallbackData(true);
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
    isFallbackData,
    markLiveData: () => setIsFallbackData(false),
    reload,
  };
}

export default useHomeVideos;
