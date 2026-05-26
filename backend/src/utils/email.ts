import net from "net";
import tls from "tls";
import { config } from "./config";

type SmtpSocket = net.Socket | tls.TLSSocket;

type SendLoginEmailInput = {
  to: string;
  name: string;
  phone: string;
  password: string;
  role: string;
};

function smtpConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.fromEmail);
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function encodeAddress(name: string, email: string) {
  const safeName = name.replace(/"/g, "");
  return `"${safeName}" <${email}>`;
}

function escapeLine(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function readResponse(socket: SmtpSocket) {
  return new Promise<string>((resolve, reject) => {
    let data = "";
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onData = (chunk: Buffer) => {
      data += chunk.toString("utf8");
      const lines = data.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1];
      if (lastLine && /^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(data);
      }
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function sendCommand(socket: SmtpSocket, command: string, expectedCodes: number[]) {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);
  const code = Number(response.slice(0, 3));
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed with code ${code}`);
  }
  return response;
}

function connectSmtp() {
  return new Promise<SmtpSocket>((resolve, reject) => {
    if (config.smtp.secure) {
      const secureSocket = tls.connect({
        host: config.smtp.host,
        port: config.smtp.port,
        servername: config.smtp.host,
        rejectUnauthorized: false
      });
      secureSocket.once("secureConnect", () => resolve(secureSocket));
      secureSocket.once("error", reject);
      return;
    }

    const socket = net.createConnection({
      host: config.smtp.host,
      port: config.smtp.port
    });
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function startTls(socket: net.Socket) {
  await sendCommand(socket, `EHLO ${config.smtp.fromEmail}`, [250]);
  await sendCommand(socket, "STARTTLS", [220]);
  return tls.connect({
    socket,
    servername: config.smtp.host,
    rejectUnauthorized: false
  });
}

async function sendSmtpMail(to: string, subject: string, text: string): Promise<{ sent: boolean; reason?: string }> {
  if (!smtpConfigured()) {
    return { sent: false, reason: "SMTP is not configured" };
  }

  // If the host is Brevo, use their HTTP API to bypass Render's firewall blocking port 587
  if (config.smtp.host === "smtp-relay.brevo.com") {
    try {
      console.log("Attempting to send email via Brevo HTTP API to bypass Render port 587 block...");
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": config.smtp.pass!,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: {
            name: config.smtp.fromName,
            email: config.smtp.fromEmail
          },
          to: [
            {
              email: to,
              name: to.split("@")[0]
            }
          ],
          subject: subject,
          textContent: text
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `HTTP error ${response.status}`);
      }

      console.log("Email successfully sent via Brevo HTTP API.");
      return { sent: true };
    } catch (error) {
      console.error("Brevo HTTP API Mail Send Failed. Falling back to SMTP...", error);
    }
  }

  let socket: SmtpSocket | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  // Create a timeout promise to reject after 10 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("SMTP connection timed out after 10 seconds"));
    }, 10000);
  });

  const mailPromise = (async () => {
    socket = await connectSmtp();
    socket.setTimeout(8000);
    socket.on("timeout", () => {
      (socket as any)?.destroy();
    });

    await readResponse(socket);
    if (!config.smtp.secure) {
      socket = await startTls(socket as net.Socket);
      socket.setTimeout(8000);
      socket.on("timeout", () => {
        (socket as any)?.destroy();
      });
    }
    await sendCommand(socket, `EHLO ${config.smtp.fromEmail}`, [250]);
    await sendCommand(socket, "AUTH LOGIN", [334]);
    await sendCommand(socket, encodeBase64(config.smtp.user!), [334]);
    await sendCommand(socket, encodeBase64(config.smtp.pass!), [235]);
    await sendCommand(socket, `MAIL FROM:<${config.smtp.fromEmail}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
    await sendCommand(socket, "DATA", [354]);

    const from = encodeAddress(config.smtp.fromName, config.smtp.fromEmail!);
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      escapeLine(text),
      "."
    ].join("\r\n");

    socket.write(`${message}\r\n`);
    const dataResponse = await readResponse(socket);
    const dataCode = Number(dataResponse.slice(0, 3));
    if (dataCode !== 250) {
      throw new Error(`SMTP message failed with code ${dataCode}`);
    }

    await sendCommand(socket, "QUIT", [221]);
    return { sent: true };
  })();

  try {
    const result = await Promise.race([mailPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error("SMTP Mail Send Failed:", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Email send failed"
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    (socket as any)?.destroy();
  }
}

export async function sendLoginCredentialsEmail(input: SendLoginEmailInput) {
  const subject = "Kerala Ayurvedh login details";
  const text = [
    `Hello ${input.name},`,
    "",
    "Your Kerala Ayurvedh app login is approved.",
    "",
    `Role: ${input.role.replaceAll("_", " ")}`,
    `Phone: ${input.phone}`,
    `Password: ${input.password}`,
    "",
    "Open the Kerala Ayurvedh app and login with the above details.",
    "Please change your password after login from More > Security.",
    config.supportEmail ? `Support: ${config.supportEmail}` : "",
    "",
    "Regards,",
    "Kerala Ayurvedh"
  ].join("\n");

  return sendSmtpMail(input.to, subject, text);
}

type SendForgotPasswordOtpEmailInput = {
  to: string;
  name: string;
  otp: string;
};

export async function sendForgotPasswordOtpEmail(input: SendForgotPasswordOtpEmailInput) {
  const subject = "Kerala Ayurvedh Password Reset Code";
  const text = [
    `Hello ${input.name},`,
    "",
    "You requested a password reset for your Kerala Ayurvedh account.",
    "",
    `Your 6-digit verification code is: ${input.otp}`,
    "",
    "This code will expire in 15 minutes. If you did not request this, please ignore this email.",
    "",
    "Regards,",
    "Kerala Ayurvedh"
  ].join("\n");

  return sendSmtpMail(input.to, subject, text);
}

