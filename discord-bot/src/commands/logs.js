import { SlashCommandBuilder } from "discord.js";
import { getUserLogs, getTodayLogs } from "../services/auditService.js";
import { buildAuditLogEmbed } from "../utils/embedBuilder.js";

export const data = new SlashCommandBuilder()
  .setName("logs")
  .setDescription("Tra cứu lịch sử hoạt động của người dùng trong hệ thống LMS")
  .addSubcommand((sub) =>
    sub
      .setName("user")
      .setDescription("Xem lịch sử hoạt động của một người dùng cụ thể (Admin, GV, HV)")
      .addStringOption((opt) =>
        opt
          .setName("identifier")
          .setDescription("Email, Tên hoặc Mã học viên / UID")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("today")
      .setDescription("Xem tổng hợp hoạt động của toàn bộ người dùng trong ngày hôm nay")
      .addStringOption((opt) =>
        opt
          .setName("filter")
          .setDescription("Lọc theo loại thao tác")
          .setRequired(false)
          .addChoices(
            { name: "Tất cả thao tác", value: "all" },
            { name: "Đăng nhập", value: "USER_LOGIN" },
            { name: "Điểm danh", value: "ATTENDANCE_SAVE" },
            { name: "Nhập điểm", value: "SCORE_SAVE" },
            { name: "Thu học phí", value: "PAYMENT_RECORD" },
            { name: "Thao tác học viên", value: "STUDENT_CREATE" }
          )
      )
  );

export const execute = async (interaction) => {
  await interaction.deferReply();
  const sub = interaction.options.getSubcommand();

  try {
    if (sub === "user") {
      const identifier = interaction.options.getString("identifier");
      const logs = await getUserLogs(identifier, 5);

      if (logs.length === 0) {
        return await interaction.editReply({
          content: `ℹ️ Không tìm thấy lịch sử hoạt động nào khớp với **"${identifier}"**.`,
        });
      }

      const embeds = logs.map(buildAuditLogEmbed);
      return await interaction.editReply({
        content: `📋 Tìm thấy **${logs.length}** hoạt động gần nhất của **"${identifier}"**:`,
        embeds,
      });
    }

    if (sub === "today") {
      const filter = interaction.options.getString("filter") || "all";
      const logs = await getTodayLogs(filter, 5);

      if (logs.length === 0) {
        return await interaction.editReply({
          content: `ℹ️ Hôm nay chưa có hoạt động nào được ghi nhận${filter !== "all" ? ` với bộ lọc ${filter}` : ""}.`,
        });
      }

      const embeds = logs.map(buildAuditLogEmbed);
      return await interaction.editReply({
        content: `📅 Tổng hợp hoạt động hôm nay (**${logs.length}** sự kiện mới nhất):`,
        embeds,
      });
    }
  } catch (error) {
    console.error("[Command: /logs error]", error);
    return await interaction.editReply({
      content: `❌ Đã có lỗi xảy ra khi truy vấn lịch sử hoạt động: ${error.message}`,
    });
  }
};
