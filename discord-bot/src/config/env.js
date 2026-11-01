import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from discord-bot root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN || "",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    guildId: process.env.DISCORD_GUILD_ID || "",
    adminUserId: process.env.DISCORD_ADMIN_USER_ID || "",
    channels: {
      auditLog: process.env.DISCORD_CHANNEL_AUDIT_LOG || "",
      dailyReports: process.env.DISCORD_CHANNEL_DAILY_REPORTS || "",
      alerts: process.env.DISCORD_CHANNEL_ALERTS || "",
    },
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "auto-lms-43b1d",
    serviceAccountPath:
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.resolve(__dirname, "../../serviceAccountKey.json"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : "",
  },
  cron: {
    morningBriefing: process.env.CRON_MORNING_BRIEFING || "30 7 * * *",
    eveningBriefing: process.env.CRON_EVENING_BRIEFING || "0 22 * * *",
    alertCheck: process.env.CRON_ALERT_CHECK || "0 */3 * * *",
    timezone: process.env.TIMEZONE || "Asia/Ho_Chi_Minh",
  },
  center: {
    name: "TOEIC MR.NAM",
    adminEmail: "dotuannamwork2809@gmail.com",
    website: "https://auto-lms-43b1d.web.app",
  },
};

/**
 * Validate essential environment variables before starting bot
 */
export const validateEnv = (isDeployScript = false) => {
  const missing = [];

  if (!config.discord.token) missing.push("DISCORD_BOT_TOKEN");
  if (!config.discord.clientId) missing.push("DISCORD_CLIENT_ID");

  if (!isDeployScript) {
    if (!config.discord.channels.auditLog) {
      console.warn("⚠️ [Config] DISCORD_CHANNEL_AUDIT_LOG is not set. Real-time audit logs won't be dispatched.");
    }
    if (!config.discord.channels.dailyReports) {
      console.warn("⚠️ [Config] DISCORD_CHANNEL_DAILY_REPORTS is not set. Scheduled briefings won't be dispatched.");
    }
    if (!config.discord.channels.alerts) {
      console.warn("⚠️ [Config] DISCORD_CHANNEL_ALERTS is not set. Instant alerts won't be dispatched.");
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missing.join(", ")}.\nPlease configure discord-bot/.env file.`
    );
  }
};

export default config;
