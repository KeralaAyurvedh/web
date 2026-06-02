import http from "k6/http";
import { check, fail } from "k6";

export const baseUrl = (__ENV.BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

export const normalThresholds = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<2000"]
};

export const stagedLoad = [
  { duration: "1m", target: 10 },
  { duration: "2m", target: 50 },
  { duration: "2m", target: 100 },
  { duration: "3m", target: 500 },
  { duration: "1m", target: 0 }
];

export function login(phone = __ENV.USER_PHONE, password = __ENV.USER_PASSWORD) {
  if (phone === __ENV.ADMIN_PHONE && __ENV.ADMIN_TOKEN) {
    return __ENV.ADMIN_TOKEN;
  }
  if (phone === __ENV.USER_PHONE && __ENV.USER_TOKEN) {
    return __ENV.USER_TOKEN;
  }
  if (__ENV.AUTH_TOKEN) {
    return __ENV.AUTH_TOKEN;
  }

  if (!phone || !password) {
    fail("USER_PHONE and USER_PASSWORD are required");
  }

  const response = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ phone, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(response, {
    "login succeeded": (res) => res.status === 200,
    "login returned token": (res) => Boolean(res.json("token"))
  });

  return response.json("token");
}

export function authHeaders(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  };
}
