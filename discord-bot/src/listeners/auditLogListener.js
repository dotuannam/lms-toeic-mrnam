import { listenCollection } from "../config/firebase.js";
import { buildAuditLogEmbed, buildPlacementTestEmbed } from "../utils/embedBuilder.js";
import { notifyAdminAndChannel } from "../utils/notifier.js";
import config from "../config/env.js";

/**
 * Start listening to activity_logs in real-time
 */
export const startAuditLogListener = (client) => {
  const auditChannelId = config.discord.channels.auditLog;
  const alertChannelId = config.discord.channels.alerts || auditChannelId;

  console.log(`🎧 [AuditListener] Watching activity_logs (Broadcasting to channel ${auditChannelId || "auto"} & Admin DM)...`);

  return listenCollection(
    "activity_logs",
    async (logData) => {
      try {
        let embed;
        let targetChannel = auditChannelId;

        if (logData.action === "PLACEMENT_TEST_SUBMISSION") {
          embed = buildPlacementTestEmbed(logData);
          targetChannel = alertChannelId;
        } else {
          embed = buildAuditLogEmbed(logData);
        }

        await notifyAdminAndChannel(client, targetChannel, { embeds: [embed] });
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
