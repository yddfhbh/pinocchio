import { upload } from "@vercel/blob/client";

export const DEFAULT_SCORE_ENTRIES = [
  {
    id: "score-sample-1",
    title: "아름다운 나라",
    composer: "한태수",
    arranger: "Pinocchio Ensemble",
    category: "공연 준비",
    instrumentation: "Flute Ensemble",
    difficulty: "중급",
    description: "정기 공연 오프닝 곡입니다. 템포와 합주 밸런스를 먼저 맞춰 주세요.",
    sourceUrl: "https://example.com/scores/beautiful-country.pdf",
    fileName: "beautiful-country.pdf",
    fileSize: 1203400,
    createdAt: "2026-04-10T12:00:00.000Z",
    updatedAt: "2026-04-18T12:00:00.000Z",
  },
  {
    id: "score-sample-2",
    title: "Libertango",
    composer: "Astor Piazzolla",
    arranger: "동아리 편곡본",
    category: "합주",
    instrumentation: "Flute Trio",
    difficulty: "상급",
    description: "리듬 싱코페이션과 프레이징 체크용 합주 자료입니다.",
    sourceUrl: "https://example.com/scores/libertango.pdf",
    fileName: "libertango.pdf",
    fileSize: 2340000,
    createdAt: "2026-04-09T12:00:00.000Z",
    updatedAt: "2026-04-17T12:00:00.000Z",
  },
  {
    id: "score-sample-3",
    title: "기초 롱톤 루틴",
    composer: "",
    arranger: "",
    category: "개인 연습",
    instrumentation: "Solo Flute",
    difficulty: "기초",
    description: "신입 부원을 위한 기본 롱톤, 텅잉, 스케일 연습 자료입니다.",
    sourceUrl: "https://example.com/scores/long-tone-routine.pdf",
    fileName: "long-tone-routine.pdf",
    fileSize: 980000,
    createdAt: "2026-04-08T12:00:00.000Z",
    updatedAt: "2026-04-16T12:00:00.000Z",
  },
];

const categoryFallbackLabel = "미분류";
const difficultyFallbackLabel = "난이도 미정";
export const MAX_SCORE_FILE_SIZE = 10 * 1024 * 1024;

function isValidHttpUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeEntry(entry, index) {
  if (!entry || typeof entry.title !== "string" || !isValidHttpUrl(entry.sourceUrl)) {
    return null;
  }

  const title = entry.title.trim();

  if (!title) {
    return null;
  }

  return {
    id: typeof entry.id === "string" ? entry.id : `score-${index}`,
    title,
    composer: typeof entry.composer === "string" ? entry.composer.trim() : "",
    arranger: typeof entry.arranger === "string" ? entry.arranger.trim() : "",
    category: typeof entry.category === "string" ? entry.category.trim() : "",
    instrumentation:
      typeof entry.instrumentation === "string" ? entry.instrumentation.trim() : "",
    difficulty: typeof entry.difficulty === "string" ? entry.difficulty.trim() : "",
    description: typeof entry.description === "string" ? entry.description.trim() : "",
    sourceUrl: entry.sourceUrl,
    fileName: typeof entry.fileName === "string" ? entry.fileName.trim() : "",
    fileSize: Number.isFinite(Number(entry.fileSize)) ? Number(entry.fileSize) : null,
    createdAt:
      typeof entry.createdAt === "string" && entry.createdAt
        ? entry.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof entry.updatedAt === "string" && entry.updatedAt
        ? entry.updatedAt
        : typeof entry.createdAt === "string" && entry.createdAt
          ? entry.createdAt
          : new Date().toISOString(),
  };
}

export function normalizeScoreEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => normalizeEntry(entry, index))
    .filter(Boolean)
    .sort((left, right) => {
      const rightTime = Date.parse(right.updatedAt) || 0;
      const leftTime = Date.parse(left.updatedAt) || 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.title.localeCompare(right.title, "ko");
    });
}

async function parseApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

export async function fetchScoreEntries() {
  const response = await fetch("/api/scores");
  const payload = await parseApiResponse(response, "악보 저장소를 불러오지 못했습니다.");

  return {
    entries: normalizeScoreEntries(payload.entries),
    isAdmin: Boolean(payload.isAdmin),
  };
}

export async function saveScoreEntry(entry, mode = "create") {
  const response = await fetch("/api/scores", {
    method: mode === "edit" ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });

  const payload = await parseApiResponse(
    response,
    mode === "edit" ? "악보를 수정하지 못했습니다." : "악보를 등록하지 못했습니다."
  );

  return normalizeScoreEntries([payload.entry])[0];
}

export async function uploadScoreFile(file, onUploadProgress) {
  return upload(file.name, file, {
    access: "public",
    contentType: "application/pdf",
    handleUploadUrl: "/api/score-upload",
    multipart: true,
    onUploadProgress,
  });
}

export async function deleteScoreEntry(id) {
  const response = await fetch("/api/scores", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  return parseApiResponse(response, "악보를 삭제하지 못했습니다.");
}

export function getScoreCategoryLabel(category) {
  return category?.trim() ? category.trim() : categoryFallbackLabel;
}

export function getScoreDifficultyLabel(difficulty) {
  return difficulty?.trim() ? difficulty.trim() : difficultyFallbackLabel;
}

export function formatScoreDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatScoreFileSize(fileSize) {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = fileSize;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}
