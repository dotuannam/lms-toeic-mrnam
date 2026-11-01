import config from "../config/env.js";

/**
 * Dispatch message payload to both the targeted channel AND the Admin's Direct Message (DM)
 * This allows the Admin to receive all activity logs, reports & alerts automatically without typing any commands!
 */
export const notifyAdminAndChannel = async (client, channelId, payload) => {
  // 1. Send to channel
  if (channelId) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send(payload);
      }
    } catch (e) {
      console.warn("[Notifier] Channel send warning:", e.message);
    }
  }

  // 2. Automatically send to Admin's Direct Message (DM)
  const adminId = config.discord.adminUserId || client.guilds.cache.first()?.ownerId;
  if (adminId) {
    try {
      const adminUser = await client.users.fetch(adminId).catch(() => null);
      if (adminUser) {
        await adminUser.send(payload);
      }
    } catch (e) {
      // Direct messages might be blocked if user turned off DMs in server settings
      console.warn("[Notifier] Admin DM warning:", e.message);
    }
  }
};

export default {
  notifyAdminAndChannel,
};
