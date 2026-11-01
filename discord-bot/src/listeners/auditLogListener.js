import { listenCollection } from "../config/firebase.js";
import { buildAuditLogEmbed } from "../utils/embedBuilder.js";
import { notifyAdminAndChannel } from "../utils/notifier.js";
import config from "../config/env.js";

/**
 * Start listening to activity_logs in real-time
 */
export const startAuditLogListener = (client) => {
  const channelId = config.discord.channels.auditLog;

  console.log(`🎧 [AuditListener] Watching activity_logs (Broadcasting to channel ${channelId || "auto"} & Admin DM)...`);

  return listenCollection(
    "activity_logs",
    async (logData) => {
      try {
        const embed = buildAuditLogEmbed(logData);
        await notifyAdminAndChannel(client, channelId, { embeds: [embed] });
      } catch (err) {
        console.error("[AuditListener] Failed to dispatch log embed:", err);
      }
    },
    { orderByField: "createdAt", limitCount: 5 }
  );
};

export default {
  startAuditLogListener,
};
