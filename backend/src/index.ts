import { config } from "./utils/config";
import { prisma } from "./utils/prisma";
import { createApp } from "./app";

const app = createApp();
const port = Number(process.env.PORT) || config.port || 4000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Kerala Ayurvedh backend running on http://0.0.0.0:${port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Closing Kerala Ayurvedh backend.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
