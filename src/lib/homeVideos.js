export const HOME_VIDEO_TITLE_LIMIT = 120;
export const HOME_VIDEO_URL_LIMIT = 500;

export const HOME_VIDEO_CATEGORIES = [
  { value: "regular", label: "정기공연" },
  { value: "recruitment", label: "공개모집" },
  { value: "special", label: "특별공연" },
];

const HOME_VIDEO_CATEGORY_VALUES = new Set(
  HOME_VIDEO_CATEGORIES.map((category) => category.value)
);

export const DEFAULT_HOME_VIDEO_CATEGORY = HOME_VIDEO_CATEGORIES[0].value;

export const DEFAULT_HOME_VIDEO_ENTRIES = [
  {
    id: "sample-home-video-1",
    title: "Where is BLUE (김푸른 리사이틀) 1부",
    sourceUrl: "https://www.youtube.com/watch?v=bZxeSLM4TWs",
    category: DEFAULT_HOME_VIDEO_CATEGORY,
    isHomeFeatured: true,
  },
];

export function normalizeHomeVideoCategory(value) {
  return HOME_VIDEO_CATEGORY_VALUES.has(value) ? value : DEFAULT_HOME_VIDEO_CATEGORY;
}

export function getHomeVideoCategoryLabel(value) {
  return (
    HOME_VIDEO_CATEGORIES.find((category) => category.value === value)?.label ||
    HOME_VIDEO_CATEGORIES[0].label
  );
}

function normalizeVideoId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : "";
}

export function extractYouTubeVideoId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const directId = normalizeVideoId(trimmedValue);

  if (directId) {
    return directId;
  }

  const candidates = [trimmedValue];

  if (!/^https?:\/\//i.test(trimmedValue)) {
    candidates.push(`https://${trimmedValue}`);
  }

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();

      if (hostname === "youtu.be") {
        return normalizeVideoId(url.pathname.split("/").filter(Boolean)[0]);
      }

      if (!hostname.endsWith("youtube.com") && !hostname.endsWith("youtube-nocookie.com")) {
        continue;
      }

      if (url.pathname === "/watch") {
        return normalizeVideoId(url.searchParams.get("v"));
      }

      const segments = url.pathname.split("/").filter(Boolean);

      if (["embed", "shorts", "live", "v"].includes(segments[0])) {
        return normalizeVideoId(segments[1]);
      }
    } catch {
      // Ignore malformed URLs and keep checking the remaining candidates.
    }
  }

  return "";
}

export function toHomeVideoEmbedUrl(value) {
  const videoId = extractYouTubeVideoId(value);

  return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

function normalizeHomeVideoEntry(entry, index) {
  if (!entry || typeof entry.title !== "string") {
    return null;
  }

  const title = entry.title.trim().slice(0, HOME_VIDEO_TITLE_LIMIT);
  const sourceUrl =
    typeof entry.sourceUrl === "string"
      ? entry.sourceUrl.trim().slice(0, HOME_VIDEO_URL_LIMIT)
      : typeof entry.url === "string"
        ? entry.url.trim().slice(0, HOME_VIDEO_URL_LIMIT)
        : "";
  const embedUrl = toHomeVideoEmbedUrl(sourceUrl);
  const category = normalizeHomeVideoCategory(entry.category);

  if (!title || !sourceUrl || !embedUrl) {
    return null;
  }

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : `home-video-${index}`,
    title,
    sourceUrl,
    embedUrl,
    category,
    isHomeFeatured: entry.isHomeFeatured === true,
  };
}

export function normalizeHomeVideoEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => normalizeHomeVideoEntry(entry, index))
    .filter(Boolean);
}

async function parseApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

export async function fetchHomeVideoEntries() {
  const response = await fetch("/api/home-videos");
  const payload = await parseApiResponse(response, "대표 공연 영상을 불러오지 못했습니다.");

  return {
    entries: normalizeHomeVideoEntries(payload.entries),
    isAdmin: Boolean(payload.isAdmin),
  };
}

export async function saveHomeVideoEntry(entry) {
  const response = await fetch("/api/home-videos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });

  const payload = await parseApiResponse(response, "대표 공연 영상을 등록하지 못했습니다.");

  return normalizeHomeVideoEntries([payload.entry])[0];
}

export async function updateHomeVideoEntry(id, entry) {
  const response = await fetch("/api/home-videos", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, ...entry }),
  });

  const payload = await parseApiResponse(response, "대표 공연 영상을 수정하지 못했습니다.");

  return normalizeHomeVideoEntries([payload.entry])[0];
}

export async function deleteHomeVideoEntry(id) {
  const response = await fetch("/api/home-videos", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  return parseApiResponse(response, "대표 공연 영상을 삭제하지 못했습니다.");
}
