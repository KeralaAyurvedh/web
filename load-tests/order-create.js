import http from "k6/http";
import { check, fail, sleep } from "k6";
import { authHeaders, baseUrl, login, normalThresholds } from "./helpers.js";

export const options = {
  vus: 10,
  duration: "2m",
  thresholds: normalThresholds
};

export default function () {
  const productId = __ENV.PRODUCT_ID;
  const customerId = __ENV.CUSTOMER_ID;
  if (!productId || !customerId) {
    fail("PRODUCT_ID and CUSTOMER_ID are required");
  }

  const token = login();
  const response = http.post(
    `${baseUrl}/orders`,
    JSON.stringify({
      customerId,
      items: [{ productId, quantity: 1 }],
      notes: "k6 load-test order"
    }),
    authHeaders(token)
  );

  check(response, {
    "order accepted or safely rejected": (res) => [201, 400, 403].includes(res.status),
    "no server error": (res) => res.status < 500
  });
  sleep(1);
}
