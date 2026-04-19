import { useEffect, useState } from "react";
import { DEFAULT_ABOUT_CONTENT, fetchAboutContent } from "../lib/aboutContent";

function useAboutContent() {
  const [content, setContent] = useState(DEFAULT_ABOUT_CONTENT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFallbackData, setIsFallbackData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      setIsLoading(true);

      try {
        const result = await fetchAboutContent();

        if (cancelled) {
          return;
        }

        setContent(result.content);
        setError("");
        setIsFallbackData(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setContent(DEFAULT_ABOUT_CONTENT);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "동아리 소개 내용을 불러오지 못했습니다."
        );
        setIsFallbackData(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadContent();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    content,
    setContent,
    isLoading,
    error,
    isFallbackData,
    markLiveData: () => setIsFallbackData(false),
  };
}

export default useAboutContent;
