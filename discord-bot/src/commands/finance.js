import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getFinanceSummary } from "../services/lmsQueryService.js";
import { formatVND, formatDateVN } from "../utils/formatters.js";
import { COLORS } from "../utils/embedBuilder.js";

export const data = new SlashCommandBuilder()
  .setName("finance")
  .setDescription("Báo cáo tài chính, học phí và công nợ trung tâm")
  .addStringOption((opt) =>
    opt
      .setName("period")
      .setDescription("Kỳ báo cáo")
      .setRequired(false)
      .addChoices(
        { name: "Hôm nay (Today)", value: "today" },
        { name: "7 ngày qua (This Week)", value: "this_week" },
        { name: "Tháng này (This Month)", value: "this_month" }
      )
  );

export const execute = async (interaction) => {
  await interaction.deferReply();
  const period = interaction.options.getString("period") || "today";

  try {
    const summary = await getFinanceSummary(period);

    const periodLabel =
      period === "today"
        ? "Hôm nay"
        : period === "this_week"
        ? "7 ngày gần nhất"
        : "Tháng này";

    const embed = new EmbedBuilder()
      .setTitle(`💵 BÁO CÁO TÀI CHÍNH - ${periodLabel.toUpperCase()}`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Dữ liệu cập nhật tính đến **${formatDateVN(new Date())}**`)
      .addFields(
        {
          name: "📈 Thu vào (Income)",
          value: `**${formatVND(summary.income)}**`,
          inline: true,
        },
        {
          name: "📉 Chi ra (Expense)",
          value: `**${formatVND(summary.expense)}**`,
          inline: true,
        },
        {
          name: "💰 Lợi nhuận ròng",
          value: `**${formatVND(summary.net)}**`,
          inline: true,
        },
        {
          name: "⚠️ Tình hình Công nợ Học viên",
          value: `Tổng nợ còn tồn: **${formatVND(summary.totalOutstandingDebt)}** (${summary.debtStudentsCount} học viên chưa hoàn thành)`,
          inline: false,
        }
      )
      .setFooter({ text: "TOEIC MR.NAM Financial Management" })
      .setTimestamp();

    if (summary.recentTxs && summary.recentTxs.length > 0) {
      const txList = summary.recentTxs
        .map(
          (t) =>
            `• **${formatVND(t.amount)}** (${t.type === "income" ? "Thu" : "Chi"}) - ${t.description || t.category}`
        )
        .join("\n");
      embed.addFields({ name: "Giao dịch gần nhất", value: txList });
    }

    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("[Command: /finance error]", error);
    return await interaction.editReply({
      content: `❌ Lỗi khi tải dữ liệu tài chính: ${error.message}`,
    });
  }
};
