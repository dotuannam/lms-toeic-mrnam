import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { generateLogsCsv } from "../services/auditService.js";
import { format } from "date-fns";

export const data = new SlashCommandBuilder()
  .setName("export-logs")
  .setDescription("Xuất file Excel / CSV toàn bộ lịch sử hoạt động để lưu trữ hoặc audit")
  .addIntegerOption((opt) =>
    opt
      .setName("days")
      .setDescription("Khoảng thời gian cần xuất (Số ngày gần nhất, mặc định: 7 ngày)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(90)
  );

export const execute = async (interaction) => {
  await interaction.deferReply();
  const days = interaction.options.getInteger("days") || 7;

  try {
    const csvBuffer = await generateLogsCsv(days);
    const fileName = `lms_activity_logs_${days}days_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;

    const attachment = new AttachmentBuilder(csvBuffer, { name: fileName });

    return await interaction.editReply({
      content: `📊 Đã xuất thành công file lịch sử hoạt động trong **${days} ngày qua** (Định dạng UTF-8 CSV hỗ trợ tiếng Việt trên Excel):`,
      files: [attachment],
    });
  } catch (error) {
    console.error("[Command: /export-logs error]", error);
    return await interaction.editReply({
      content: `❌ Lỗi khi xuất báo cáo lịch sử: ${error.message}`,
    });
  }
};
