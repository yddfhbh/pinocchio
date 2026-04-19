export const ABOUT_CONTENT_TITLE_LIMIT = 80;
export const ABOUT_CONTENT_TEXT_LIMIT = 600;
export const ABOUT_CONTENT_LIST_LIMIT = 8;
export const ABOUT_CONTENT_ITEM_LIMIT = 120;

export const DEFAULT_ABOUT_CONTENT = {
  intro:
    "PINOCCHIO는 음악과 연주를 좋아하는 학생들이 모여 함께 연습하고 공연을 만들어가는 밴드 동아리입니다.",
  activityTitle: "우리가 하는 활동",
  activities: [
    "정기 합주와 개인 연습",
    "교내외 공연 준비",
    "음악 공유와 파트 연습",
    "신입 부원 모집 및 교류 활동",
  ],
  websiteTitle: "홈페이지에서 볼 수 있는 것",
  websiteItems: [
    "동아리 활동 소개 보기",
    "악보 자료 확인",
    "공연 영상 감상",
    "일정 확인",
    "방명록 작성",
  ],
};

function normalizeTitle(value, fallback) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return (trimmed || fallback).slice(0, ABOUT_CONTENT_TITLE_LIMIT);
}

function normalizeText(value, fallback) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return (trimmed || fallback).slice(0, ABOUT_CONTENT_TEXT_LIMIT);
}

function normalizeList(items, fallback) {
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) =>
          typeof item === "string" ? item.trim().slice(0, ABOUT_CONTENT_ITEM_LIMIT) : ""
        )
        .filter(Boolean)
        .slice(0, ABOUT_CONTENT_LIST_LIMIT)
    : [];

  return normalizedItems.length ? normalizedItems : fallback;
}

export function normalizeAboutContent(content) {
  return {
    intro: normalizeText(content?.intro, DEFAULT_ABOUT_CONTENT.intro),
    activityTitle: normalizeTitle(
      content?.activityTitle,
      DEFAULT_ABOUT_CONTENT.activityTitle
    ),
    activities: normalizeList(content?.activities, DEFAULT_ABOUT_CONTENT.activities),
    websiteTitle: normalizeTitle(
      content?.websiteTitle,
      DEFAULT_ABOUT_CONTENT.websiteTitle
    ),
    websiteItems: normalizeList(
      content?.websiteItems,
      DEFAULT_ABOUT_CONTENT.websiteItems
    ),
  };
}

async function parseApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

export async function fetchAboutContent() {
  const response = await fetch("/api/about-content");
  const payload = await parseApiResponse(
    response,
    "동아리 소개 내용을 불러오지 못했습니다."
  );

  return {
    content: normalizeAboutContent(payload.content),
    isAdmin: Boolean(payload.isAdmin),
  };
}

export async function updateAboutContent(content) {
  const response = await fetch("/api/about-content", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(content),
  });

  const payload = await parseApiResponse(
    response,
    "동아리 소개 내용을 저장하지 못했습니다."
  );

  return normalizeAboutContent(payload.content);
}
