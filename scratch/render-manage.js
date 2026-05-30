const API_KEY = process.env.RENDER_API_KEY;
const BASE_URL = "https://api.render.com/v1";

if (!API_KEY) {
  throw new Error("Set RENDER_API_KEY before running this script.");
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Render API Error (${res.status}) on ${path}: ${text}`);
  }

  return res.json();
}

function maskValue(key, value) {
  if (!value) {
    return "";
  }
  return key.includes("PASS") || key.includes("SECRET") || key.includes("KEY") || key.includes("URL")
    ? "********"
    : value;
}

async function run() {
  console.log("Connecting to Render API...");
  const services = await request("/services?limit=20");

  console.log(`Found ${services.length} services in your Render account:`);
  services.forEach((s) => {
    console.log(`- Service: ${s.service.name} (ID: ${s.service.id}, Type: ${s.service.type})`);
  });

  const backend = services.find(
    (s) => s.service.name.toLowerCase().includes("web") || s.service.name.toLowerCase().includes("backend")
  );

  if (!backend) {
    throw new Error("Could not identify the backend service by name. Please check your service names.");
  }

  const serviceId = backend.service.id;
  console.log(`\nIdentified Backend Service: "${backend.service.name}" (ID: ${serviceId})`);

  console.log("Fetching current environment variables...");
  const currentEnvVars = await request(`/services/${serviceId}/env-vars`);

  console.log("Current Environment Variables:");
  currentEnvVars.forEach((ev) => {
    console.log(`  ${ev.envVar.key} = ${maskValue(ev.envVar.key, ev.envVar.value)}`);
  });

  console.log("\nTriggering a new deployment...");
  const deploy = await request(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "do_not_clear" })
  });

  console.log(`Deploy triggered. Deploy ID: ${deploy.id}, Status: ${deploy.status}`);
}

run().catch((err) => {
  console.error("Render Management Failed:", err.message);
});
