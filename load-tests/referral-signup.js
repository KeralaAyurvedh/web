import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl, normalThresholds, stagedLoad } from "./helpers.js";

export const options = {
  stages: stagedLoad,
  thresholds: normalThresholds
};

export default function () {
  const code = __ENV.REFERRAL_CODE;
  if (!code) {
    throw new Error("REFERRAL_CODE is required");
  }

  const response = http.get(`${baseUrl}/auth/resolve-referral/${encodeURIComponent(code)}`);
  check(response, {
    "referral resolved": (res) => res.status === 200,
    "determined role returned": (res) => Boolean(res.json("determinedRole"))
  });
  sleep(1);
}
