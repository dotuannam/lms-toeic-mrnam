import { ChannelType } from "discord.js";
import config from "../config/env.js";

/**
 * Automatically find or create the required LMS channels on the Discord server
 * This eliminates the need for manual channel creation & manual ID copying!
 */
export const ensureChannels = async (client) => {
  const guilds = client.guilds.cache;
  if (guilds.size === 0) {
    console.warn("⚠️ [Auto-Setup] Bot chưa có trong server nào. Vui lòng mời bot vào server trước!");
    return;
  }

  for (const [, guild] of guilds) {
    console.log(`🏰 [Auto-Setup] Đang rà soát và tự động khởi tạo các kênh trên server: "${guild.name}"...`);

    const requiredChannels = [
      {
        key: "auditLog",
        name: "lms-audit-log",
        topic: "📋 Nhật ký giám sát toàn bộ hoạt động của người dùng hệ thống LMS",
      },
      {
        key: "dailyReports",
        name: "lms-daily-reports",
        topic: "📊 Báo cáo lịch học 07:30 sáng & tổng kết chuyên cần/tài chính 22:00 tối",
      },
      {
        key: "alerts",
        name: "lms-alerts",
        topic: "🚨 Cảnh báo học viên vắng học, quá hạn học phí và giao dịch tiền mới",
      },
    ];

    for (const ch of requiredChannels) {
      let target = null;

      // 1. Check if ID configured in env exists
      if (config.discord.channels[ch.key]) {
        target = await guild.channels.fetch(config.discord.channels[ch.key]).catch(() => null);
      }

      // 2. If not found by ID, look up by name in guild
      if (!target) {
        target = guild.channels.cache.find((c) => c.name === ch.name && c.isTextBased());
      }

      // 3. If still not found, automatically create the channel!
      if (!target) {
        try {
          target = await guild.channels.create({
            name: ch.name,
            type: ChannelType.GuildText,
            topic: ch.topic,
            reason: "Auto-provisioning by LMS Management Bot",
          });
          console.log(`✨ [Auto-Setup] Đã tự động tạo kênh: #${ch.name} (ID: ${target.id})`);
        } catch (err) {
          console.warn(`⚠️ [Auto-Setup] Không thể tự tạo kênh #${ch.name}: ${err.message}`);
        }
      } else {
        console.log(`✅ [Auto-Setup] Kênh #${ch.name} đã tồn tại (ID: ${target.id}).`);
      }

      // Cache ID into running config
      if (target) {
        config.discord.channels[ch.key] = target.id;
      }
    }
  }
};

export default {
  ensureChannels,
};
