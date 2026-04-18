async function parseApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

export async function fetchAdminSession() {
  const response = await fetch("/api/admin-session");
  const payload = await parseApiResponse(
    response,
    "관리자 상태를 확인하지 못했습니다."
  );

  return {
    isAdmin: Boolean(payload.isAdmin),
  };
}

export async function loginAdminSession(code) {
  const response = await fetch("/api/admin-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  return parseApiResponse(response, "관리자 로그인에 실패했습니다.");
}

export async function logoutAdminSession() {
  const response = await fetch("/api/admin-session", {
    method: "DELETE",
  });

  return parseApiResponse(response, "로그아웃에 실패했습니다.");
}
