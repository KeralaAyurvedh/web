import http from "k6/http";
import { check, sleep } from "k6";
import { authHeaders, baseUrl, login, normalThresholds, stagedLoad } from "./helpers.js";

export const options = {
  stages: stagedLoad,
  thresholds: normalThresholds
};

export default function () {
  const token = login();
  const response = http.get(`${baseUrl}/products`, authHeaders(token));
  check(response, {
    "products listed": (res) => res.status === 200,
    "products array returned": (res) => Array.isArray(res.json("products"))
  });
  sleep(1);
}
