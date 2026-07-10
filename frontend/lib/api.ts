const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // FormData가 아닐 때만 Content-Type 설정
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 401이면 토큰 만료 → 자동 로그아웃 + 로그인 페이지로 이동
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "요청 실패" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
