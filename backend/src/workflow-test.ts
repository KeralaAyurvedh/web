type ApiUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  referralCode: string;
};

type LoginResponse = {
  token: string;
  user: ApiUser;
};

const API_URL = process.env.API_URL ?? "http://localhost:4000";

function uniquePhone(suffix: string) {
  return `88${Date.now().toString().slice(-6)}${suffix}`;
}

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${JSON.stringify(data)}`);
  }

  return data as T;
}

async function login(phone: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password })
  });
}

async function createUser(token: string, input: Record<string, unknown>) {
  const result = await request<{ user: ApiUser }>("/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input)
  });

  return result.user;
}

async function confirmUserPayment(token: string, userId: string) {
  return request<{ user: ApiUser }>(`/users/${userId}/confirm-company-payment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function main() {
  const admin = await login("9999999999", "Admin@12345");
  const password = "Test@12345";
  const run = Date.now().toString().slice(-5);

  const manager = await createUser(admin.token, {
    name: `Test Manager ${run}`,
    phone: uniquePhone("01"),
    password,
    role: "MANAGER"
  });

  const managerLogin = await login(manager.phone, password);

  const betaManager = await createUser(managerLogin.token, {
    name: `Test Beta Manager ${run}`,
    phone: uniquePhone("02"),
    password,
    role: "BETA_MANAGER"
  });

  const betaLogin = await login(betaManager.phone, password);

  const betaLevel1 = await createUser(betaLogin.token, {
    name: `Test Beta Level 1 ${run}`,
    phone: uniquePhone("03"),
    password,
    role: "LEVEL_1",
    sponsorId: betaManager.id
  });

  const betaLevel1Login = await login(betaLevel1.phone, password);

  const betaLevel2 = await createUser(betaLevel1Login.token, {
    name: `Test Beta Level 2 ${run}`,
    phone: uniquePhone("04"),
    password,
    role: "LEVEL_2",
    sponsorId: betaLevel1.id
  });

  const betaLevel2Login = await login(betaLevel2.phone, password);

  const betaCustomer = await createUser(betaLevel2Login.token, {
    name: `Test Beta Customer ${run}`,
    phone: uniquePhone("05"),
    password,
    role: "CUSTOMER",
    sponsorId: betaLevel2.id
  });

  await confirmUserPayment(admin.token, betaLevel1.id);
  await confirmUserPayment(admin.token, betaLevel2.id);
  await confirmUserPayment(admin.token, betaCustomer.id);

  const normalLevel1 = await createUser(managerLogin.token, {
    name: `Test Normal Level 1 ${run}`,
    phone: uniquePhone("06"),
    password,
    role: "LEVEL_1",
    sponsorId: manager.id
  });

  const normalLevel1Login = await login(normalLevel1.phone, password);

  const normalLevel2 = await createUser(normalLevel1Login.token, {
    name: `Test Normal Level 2 ${run}`,
    phone: uniquePhone("07"),
    password,
    role: "LEVEL_2",
    sponsorId: normalLevel1.id
  });

  const normalLevel2Login = await login(normalLevel2.phone, password);

  const normalCustomer = await createUser(normalLevel2Login.token, {
    name: `Test Normal Customer ${run}`,
    phone: uniquePhone("08"),
    password,
    role: "CUSTOMER",
    sponsorId: normalLevel2.id
  });

  await confirmUserPayment(admin.token, normalLevel1.id);
  await confirmUserPayment(admin.token, normalLevel2.id);
  await confirmUserPayment(admin.token, normalCustomer.id);

  const commissions = await request<{ commissions: unknown[] }>("/commissions", {
    headers: { Authorization: `Bearer ${admin.token}` }
  });

  console.log(JSON.stringify({
    created: {
      manager,
      betaManager,
      betaLevel1,
      betaLevel2,
      betaCustomer,
      normalLevel1,
      normalLevel2,
      normalCustomer
    },
    commissionCount: commissions.commissions.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
