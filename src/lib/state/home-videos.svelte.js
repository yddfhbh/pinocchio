import {
  DEFAULT_HOME_VIDEO_ENTRIES,
  fetchHomeVideoEntries,
} from "$lib/homeVideos";

function getFallbackEntries() {
  return DEFAULT_HOME_VIDEO_ENTRIES.map((entry) => ({ ...entry }));
}

export function createHomeVideosState() {
  const homeVideos = $state({
    entries: getFallbackEntries(),
    isLoading: true,
    error: "",
    isFallbackData: true,
  });

  async function reload() {
    homeVideos.isLoading = true;

    try {
      const result = await fetchHomeVideoEntries();
      homeVideos.entries = result.entries;
      homeVideos.error = "";
      homeVideos.isFallbackData = false;
    } catch (loadError) {
      homeVideos.entries = getFallbackEntries();
      homeVideos.error =
        loadError instanceof Error
          ? loadError.message
          : "대표 공연 영상을 불러오지 못했습니다.";
      homeVideos.isFallbackData = true;
    } finally {
      homeVideos.isLoading = false;
    }
  }

  function markLiveData() {
    homeVideos.isFallbackData = false;
  }

  return {
    homeVideos,
    reload,
    markLiveData,
  };
}
