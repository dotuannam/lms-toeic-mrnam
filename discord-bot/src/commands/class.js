import { SlashCommandBuilder } from "discord.js";
import { findClass } from "../services/lmsQueryService.js";
import { buildClassEmbed } from "../utils/embedBuilder.js";

export const data = new SlashCommandBuilder()
  .setName("class")
  .setDescription("Tra cứu thông tin lớp học (lịch học, giảng viên, sĩ số, học phí)")
  .addStringOption((opt) =>
    opt
      .setName("query")
      .setDescription("Mã lớp hoặc tên lớp học")
      .setRequired(true)
  );

export const execute = async (interaction) => {
  await interaction.deferReply();
  const query = interaction.options.getString("query");

  try {
    const classData = await findClass(query);
    if (!classData) {
      return await interaction.editReply({
        content: `🔍 Không tìm thấy lớp học nào khớp với từ khóa: **"${query}"**.`,
      });
    }

    const embed = buildClassEmbed(classData, classData.studentCount);
    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("[Command: /class error]", error);
    return await interaction.editReply({
      content: `❌ Lỗi khi tra cứu lớp học: ${error.message}`,
    });
  }
};
