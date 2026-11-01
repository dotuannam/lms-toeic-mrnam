import {
  Client,
  GatewayIntentBits,
  ActivityType,
  Events,
  REST,
  Routes,
} from "discord.js";
import http from "http";
import config, { validateEnv } from "./config/env.js";
import { initFirebase } from "./config/firebase.js";
import { getCommandsCollection, getCommandsJSON } from "./commands/index.js";
import { startAuditLogListener } from "./listeners/auditLogListener.js";
import { startPaymentListener } from "./listeners/paymentListener.js";
import { initSchedulers } from "./schedulers/dailyBriefing.js";
import { ensureChannels } from "./utils/channelManager.js";

console.log("=================================================");
console.log("🚀 KHỞI ĐỘNG LMS DISCORD BOT - TOEIC MR.NAM");
console.log("=================================================");

try {
  validateEnv();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// Initialize Firebase SDK
initFirebase();

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Load commands collection
const commands = getCommandsCollection();
console.log(`📦 Loaded ${commands.size} slash commands.`);

// Handle Slash Commands Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[Command] Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Command Error] /${interaction.commandName}:`, error);
    const replyPayload = {
      content: `❌ Đã có lỗi xảy ra khi thực thi lệnh này: ${error.message}`,
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyPayload).catch(() => {});
    } else {
      await interaction.reply(replyPayload).catch(() => {});
    }
  }
});

// Helper to instantly sync Slash Commands to guilds
const syncCommandsToGuilds = async (clientInstance) => {
  try {
    const rest = new REST({ version: "10" }).setToken(config.discord.token);
    const commandsJson = getCommandsJSON();

    for (const [guildId, guild] of clientInstance.guilds.cache) {
      console.log(`📡 [Slash Commands] Đang cập nhật lệnh tức thì cho server: "${guild.name}"...`);
      await rest.put(
        Routes.applicationGuildCommands(clientInstance.user.id, guildId),
        { body: commandsJson }
      );
      console.log(`✅ [Slash Commands] Đã kích hoạt 8 lệnh tức thì trên server: "${guild.name}"!`);
    }
  } catch (err) {
    console.warn("⚠️ [Slash Commands] Lỗi cập nhật guild commands:", err.message);
  }
};

// Start Lightweight HTTP server for Render Health Check and Uptime
const startHealthCheckServer = (discordClient) => {
  const PORT = process.env.PORT || 10000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          status: "healthy",
          service: "LMS TOEIC MR.NAM Discord Bot",
          bot: discordClient.user ? discordClient.user.tag : "connecting",
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );
  });

  server.listen(PORT, () => {
    console.log(`🌐 [Render Web Service] Health check HTTP server listening on port ${PORT}`);
  });

  // Self Keep-Alive to prevent Render Free tier from sleeping after 15m of inactivity
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    console.log(`💓 [Keep-Alive] Registered auto-ping to ${externalUrl} every 14 minutes.`);
    setInterval(() => {
      fetch(externalUrl)
        .then(() => console.log(`💓 [Keep-Alive] Pinged ${externalUrl} successfully.`))
        .catch((err) => console.warn(`⚠️ [Keep-Alive] Ping error: ${err.message}`));
    }, 14 * 60 * 1000);
  }
};

startHealthCheckServer(client);

// Client Ready Event
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`\n🎉 Bot đã online thành công dưới tên: ${readyClient.user.tag}`);
  console.log(`🆔 Bot Client ID: ${readyClient.user.id}`);
  console.log(`🌐 Đang phục vụ trên ${readyClient.guilds.cache.size} máy chủ.`);

  // Set Rich Presence
  readyClient.user.setPresence({
    activities: [
      {
        name: "LMS TOEIC MR.NAM • /logs, /student",
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });

  // Automatically check or create necessary channels
  await ensureChannels(readyClient);

  // Instantly deploy Slash Commands to all connected servers
  await syncCommandsToGuilds(readyClient);

  // Start Realtime Listeners
  startAuditLogListener(readyClient);
  startPaymentListener(readyClient);

  // Initialize Schedulers / Cron jobs
  initSchedulers(readyClient);

  console.log("\n✅ [System] Tất cả các module và listener đã sẵn sàng hoạt động!\n");
});

// Auto-setup when bot is newly invited to a server
client.on(Events.GuildCreate, async (guild) => {
  console.log(`🎉 [New Server] Bot vừa được thêm vào server mới: "${guild.name}"!`);
  await ensureChannels(client);
  await syncCommandsToGuilds(client);
});

// Process Error Handling
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ [Process Unhandled Rejection]:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ [Process Uncaught Exception]:", error);
});

// Log in to Discord
client.login(config.discord.token).catch((err) => {
  console.error("❌ Không thể kết nối tới Discord API:", err.message);
  console.error("👉 Vui lòng kiểm tra lại DISCORD_BOT_TOKEN trong file .env");
  process.exit(1);
});
