export const DEFAULT_SCHEDULE_ENTRIES = [
  {
    id: "sample-1",
    title: "정기 연습",
    description: "학생회관 연습실에서 주간 합주를 진행합니다.",
    category: "연습",
    eventDate: "2026-04-21",
    startTime: "18:30",
    endTime: "20:30",
  },
  {
    id: "sample-2",
    title: "공연 준비 회의",
    description: "다음 공연 셋리스트와 역할을 정리합니다.",
    category: "회의",
    eventDate: "2026-04-23",
    startTime: "19:00",
    endTime: "20:00",
  },
  {
    id: "sample-3",
    title: "봄 정기 공연",
    description: "교내 야외무대 공연 일정입니다.",
    category: "공연",
    eventDate: "2026-04-29",
    startTime: "17:00",
    endTime: "18:00",
  },
];

function normalizeEntry(entry, index) {
  if (!entry || typeof entry.title !== "string" || typeof entry.eventDate !== "string") {
    return null;
  }

  const title = entry.title.trim();

  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(entry.eventDate)) {
    return null;
  }

  return {
    id: typeof entry.id === "string" ? entry.id : `schedule-${index}`,
    title,
    description:
      typeof entry.description === "string" && entry.description.trim()
        ? entry.description.trim()
        : "",
    category:
      typeof entry.category === "string" && entry.category.trim()
        ? entry.category.trim()
        : "",
    eventDate: entry.eventDate,
    startTime:
      typeof entry.startTime === "string" && /^\d{2}:\d{2}$/.test(entry.startTime)
        ? entry.startTime
        : "",
    endTime:
      typeof entry.endTime === "string" && /^\d{2}:\d{2}$/.test(entry.endTime)
        ? entry.endTime
        : "",
  };
}

export function normalizeScheduleEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => normalizeEntry(entry, index))
    .filter(Boolean)
    .sort((left, right) => {
      const leftKey = `${left.eventDate}-${left.startTime || "99:99"}`;
      const rightKey = `${right.eventDate}-${right.startTime || "99:99"}`;
      return leftKey.localeCompare(rightKey);
    });
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function parseApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

export async function fetchScheduleEntries(limit) {
  const search = new URLSearchParams();

  if (limit) {
    search.set("limit", String(limit));
  }

  const response = await fetch(`/api/schedules${search.size ? `?${search}` : ""}`);
  const payload = await parseApiResponse(response, "일정을 불러오지 못했습니다.");

  return {
    entries: normalizeScheduleEntries(payload.entries),
    isAdmin: Boolean(payload.isAdmin),
  };
}

export async function loginScheduleAdmin(code) {
  const response = await fetch("/api/admin-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  return parseApiResponse(response, "관리자 로그인에 실패했습니다.");
}

export async function logoutScheduleAdmin() {
  const response = await fetch("/api/admin-session", {
    method: "DELETE",
  });

  return parseApiResponse(response, "로그아웃에 실패했습니다.");
}

export async function saveScheduleEntry(entry, mode = "create") {
  const response = await fetch("/api/schedules", {
    method: mode === "edit" ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });

  const payload = await parseApiResponse(
    response,
    mode === "edit" ? "일정을 수정하지 못했습니다." : "일정을 등록하지 못했습니다."
  );

  return normalizeScheduleEntries([payload.entry])[0];
}

export async function deleteScheduleEntry(id) {
  const response = await fetch("/api/schedules", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  return parseApiResponse(response, "일정을 삭제하지 못했습니다.");
}

export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function formatMonthLabel(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

export function formatScheduleDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatScheduleTime(startTime, endTime) {
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  return startTime || endTime || "시간 미정";
}

export function getCategoryLabel(category) {
  return category?.trim() ? category.trim() : "일정";
}

export function getCalendarDays(monthDate, entries) {
  const monthStart = getMonthStart(monthDate);
  const startDay = monthStart.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const visibleWeeks = Math.ceil((startDay + daysInMonth) / 7);
  const visibleDays = visibleWeeks * 7;
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - startDay);

  return Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);

    const key = toDateKey(date);
    const dayEntries = entries.filter((entry) => entry.eventDate === key);

    return {
      key,
      date,
      label: date.getDate(),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
      entries: dayEntries,
    };
  });
}

export function getMonthWeekdayDates(dateString, weekdays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) || !Array.isArray(weekdays)) {
    return [];
  }

  const selectedWeekdays = new Set(
    weekdays.filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
  );

  if (!selectedWeekdays.size) {
    return [];
  }

  const baseDate = new Date(`${dateString}T00:00:00`);
  const cursor = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const dates = [];

  while (cursor.getMonth() === baseDate.getMonth()) {
    if (selectedWeekdays.has(cursor.getDay())) {
      dates.push(toDateKey(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
