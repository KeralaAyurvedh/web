import http from "k6/http";
import { check, sleep } from "k6";
import { authHeaders, baseUrl, login, normalThresholds, stagedLoad } from "./helpers.js";

export const options = {
  stages: stagedLoad,
  thresholds: normalThresholds
};

export default function () {
  const token = login(__ENV.ADMIN_PHONE, __ENV.ADMIN_PASSWORD);
  const response = http.get(`${baseUrl}/admin/dashboard`, authHeaders(token));
  check(response, {
    "admin dashboard loaded": (res) => res.status === 200,
    "stats returned": (res) => Boolean(res.json("stats"))
  });
  sleep(1);
}
