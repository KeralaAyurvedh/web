import http from "k6/http";
import { check, sleep } from "k6";
import { authHeaders, baseUrl, login, normalThresholds, stagedLoad } from "./helpers.js";

export const options = {
  stages: stagedLoad,
  thresholds: normalThresholds
};

export default function () {
  const token = login();
  const response = http.get(`${baseUrl}/users/tree`, authHeaders(token));
  check(response, {
    "tree request completed": (res) => [200, 403].includes(res.status),
    "tree visible or correctly denied": (res) => res.status === 403 || Array.isArray(res.json("users"))
  });
  sleep(1);
}
