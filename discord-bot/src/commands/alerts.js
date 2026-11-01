import { SlashCommandBuilder } from "discord.js";
import { checkAbsentAlerts, checkTuitionDebtAlerts } from "../services/lmsQueryService.js";
import { buildAlertEmbed } from "../utils/embedBuilder.js";
import { formatVND } from "../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("check-alerts")
  .setDescription("Quét ngay danh sách học viên vắng học nhiều buổi hoặc nợ học phí");

export const execute = async (interaction) => {
  await interaction.deferReply();

  try {
    const [absents, debts] = await Promise.all([
      checkAbsentAlerts(),
      checkTuitionDebtAlerts(),
    ]);

    const embeds = [];

    if (absents.length > 0) {
      const absentFields = absents.map((a) => ({
        name: `👤 ${a.studentName} (${a.studentId}) - Lớp: ${a.classId}`,
        value: `⚠️ Vắng **${a.count} buổi** không phép (Các ngày: ${a.dates.join(", ")})`,
      }));

      embeds.push(
        buildAlertEmbed(
          "danger",
          "HỌC VIÊN CẦN QUAN TÂM ĐẶC BIỆT (VẮNG NHIỀU)",
          `Phát hiện **${absents.length} học viên** có từ 2 buổi vắng học không phép trở lên. Cần giáo viên hoặc tư vấn liên hệ hỗ trợ kịp thời:`,
          absentFields
        )
      );
    }

    if (debts.length > 0) {
      const debtFields = debts.map((d) => ({
        name: `👤 ${d.studentName} (${d.studentId}) - Lớp: ${d.classId}`,
        value: `💵 Nợ còn lại: **${formatVND(d.debtAmount)}** / ${formatVND(d.totalAmount)}`,
      }));

      embeds.push(
        buildAlertEmbed(
          "warning",
          "HỌC VIÊN CHƯA HOÀN THÀNH HỌC PHÍ",
          `Danh sách **${debts.length} học viên** đang có công nợ học phí chưa thanh toán:`,
          debtFields
        )
      );
    }

    if (embeds.length === 0) {
      return await interaction.editReply({
        content: "✅ Tuyệt vời! Hiện tại không phát hiện cảnh báo nào (Chuyên cần ổn định, không có trường hợp bất thường).",
      });
    }

    return await interaction.editReply({
      content: `⚠️ Kết quả rà soát tự động:`,
      embeds,
    });
  } catch (error) {
    console.error("[Command: /check-alerts error]", error);
    return await interaction.editReply({
      content: `❌ Lỗi khi quét cảnh báo: ${error.message}`,
    });
  }
};
