import http from "k6/http";
import { check, sleep } from "k6";
import { authHeaders, baseUrl, login, normalThresholds } from "./helpers.js";

export const options = {
  stages: [
    { duration: "1m", target: 100 },
    { duration: "30s", target: 1000 },
    { duration: "1m", target: 1000 },
    { duration: "1m", target: 0 }
  ],
  thresholds: normalThresholds
};

export default function () {
  const token = login();
  const response = http.get(`${baseUrl}/products`, authHeaders(token));
  check(response, {
    "spike request succeeded": (res) => res.status === 200,
    "no server error": (res) => res.status < 500
  });
  sleep(1);
}
