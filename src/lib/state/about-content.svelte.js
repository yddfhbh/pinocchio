import { DEFAULT_ABOUT_CONTENT, fetchAboutContent } from "$lib/aboutContent";

export function createAboutContentState() {
  const about = $state({
    content: DEFAULT_ABOUT_CONTENT,
    isLoading: true,
    error: "",
    isFallbackData: true,
  });

  async function reload() {
    about.isLoading = true;

    try {
      const result = await fetchAboutContent();
      about.content = result.content;
      about.error = "";
      about.isFallbackData = false;
    } catch (loadError) {
      about.content = DEFAULT_ABOUT_CONTENT;
      about.error =
        loadError instanceof Error
          ? loadError.message
          : "동아리 소개 내용을 불러오지 못했습니다.";
      about.isFallbackData = true;
    } finally {
      about.isLoading = false;
    }
  }

  function markLiveData() {
    about.isFallbackData = false;
  }

  return {
    about,
    reload,
    markLiveData,
  };
}
