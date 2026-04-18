export const GUESTBOOK_MESSAGE_LIMIT = 180;
export const GUESTBOOK_ENTRY_LIMIT = 30;
export const GUESTBOOK_NICKNAME_LIMIT = 10;

export const DEFAULT_GUESTBOOK_ENTRIES = [
  {
    id: "seed-1",
    nickname: null,
    message: "피노키오 공연 정말 잘 봤어요. 다음 공연도 기대할게요!",
    createdAt: "2026-04-16T19:30:00+09:00",
  },
  {
    id: "seed-2",
    nickname: null,
    message: "홈페이지가 깔끔해서 동아리 분위기가 더 잘 느껴져요.",
    createdAt: "2026-04-14T18:00:00+09:00",
  },
  {
    id: "seed-3",
    nickname: null,
    message: "연주도 멋지고 기록이 남는다는 게 정말 좋은 것 같아요.",
    createdAt: "2026-04-12T16:20:00+09:00",
  },
];

function normalizeEntry(entry, index) {
  if (!entry || typeof entry.message !== "string") {
    return null;
  }

  const message = entry.message.trim();

  if (!message) {
    return null;
  }

  const createdAt = new Date(entry.createdAt);

  return {
    id:
      typeof entry.id === "string" && entry.id
        ? entry.id
        : `guestbook-${index}`,
    nickname:
      typeof entry.nickname === "string" && entry.nickname.trim()
        ? entry.nickname.trim().slice(0, GUESTBOOK_NICKNAME_LIMIT)
        : null,
    message: message.slice(0, GUESTBOOK_MESSAGE_LIMIT),
    createdAt: Number.isNaN(createdAt.getTime())
      ? new Date().toISOString()
      : createdAt.toISOString(),
  };
}

export function normalizeGuestbookEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => normalizeEntry(entry, index))
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

export async function fetchGuestbookEntries(limit = GUESTBOOK_ENTRY_LIMIT) {
  const response = await fetch(`/api/guestbook?limit=${limit}`);

  if (!response.ok) {
    let message = "방명록을 불러오지 못했습니다.";

    try {
      const payload = await response.json();

      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // Ignore malformed error payloads and use the default message.
    }

    throw new Error(message);
  }

  const payload = await response.json();

  return normalizeGuestbookEntries(payload.entries);
}

export async function postGuestbookEntry({ message, nickname }) {
  const response = await fetch("/api/guestbook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, nickname }),
  });

  if (!response.ok) {
    let errorMessage = "방명록을 등록하지 못했습니다.";

    try {
      const payload = await response.json();

      if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore malformed error payloads and use the default message.
    }

    throw new Error(errorMessage);
  }

  const payload = await response.json();

  return normalizeGuestbookEntries([payload.entry])[0];
}

export function formatGuestbookDate(createdAt) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getGuestbookDisplayName(nickname) {
  return nickname?.trim() ? nickname.trim() : "익명";
}
