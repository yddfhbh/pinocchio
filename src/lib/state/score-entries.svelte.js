import { DEFAULT_SCORE_ENTRIES, fetchScoreEntries } from "$lib/scores";

export function createScoreEntriesState() {
  const scores = $state({
    entries: [],
    isLoading: true,
    error: "",
  });

  async function reload() {
    scores.isLoading = true;

    try {
      const result = await fetchScoreEntries();
      scores.entries = result.entries;
      scores.error = "";
    } catch (loadError) {
      scores.entries = DEFAULT_SCORE_ENTRIES;
      scores.error =
        loadError instanceof Error
          ? loadError.message
          : "악보 저장소를 불러오지 못했습니다.";
    } finally {
      scores.isLoading = false;
    }
  }

  return {
    scores,
    reload,
  };
}
