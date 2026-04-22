import {
  DEFAULT_SCHEDULE_ENTRIES,
  fetchScheduleEntries,
} from "$lib/schedule";

function getFallbackEntries(limit) {
  return limit
    ? DEFAULT_SCHEDULE_ENTRIES.slice(0, limit)
    : DEFAULT_SCHEDULE_ENTRIES;
}

export function createScheduleEntriesState(limit) {
  const schedule = $state({
    entries: [],
    isLoading: true,
    error: "",
  });

  async function reload() {
    schedule.isLoading = true;

    try {
      const result = await fetchScheduleEntries(limit);
      schedule.entries = result.entries;
      schedule.error = "";
    } catch (loadError) {
      schedule.entries = getFallbackEntries(limit);
      schedule.error =
        loadError instanceof Error
          ? loadError.message
          : "일정을 불러오지 못했습니다.";
    } finally {
      schedule.isLoading = false;
    }
  }

  return {
    schedule,
    reload,
  };
}
