import { sleep } from "k6";
import { login, normalThresholds, stagedLoad } from "./helpers.js";

export const options = {
  stages: stagedLoad,
  thresholds: normalThresholds
};

export default function () {
  login();
  sleep(1);
}
