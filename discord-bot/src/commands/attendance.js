import { SlashCommandBuilder } from "discord.js";
import { getAttendanceToday, findClass } from "../services/lmsQueryService.js";
import { buildAttendanceEmbed } from "../utils/embedBuilder.js";

export const data = new SlashCommandBuilder()
  .setName("attendance")
  .setDescription("Tra cứu tình hình điểm danh lớp học")
  .addSubcommand((sub) =>
    sub
      .setName("today")
      .setDescription("Xem kết quả điểm danh của các lớp trong ngày hôm nay")
      .addStringOption((opt) =>
        opt
          .setName("class")
          .setDescription("Mã lớp hoặc tên lớp (để trống nếu muốn xem tất cả)")
          .setRequired(false)
      )
  );

export const execute = async (interaction) => {
  await interaction.deferReply();

  try {
    const classQuery = interaction.options.getString("class");
    let targetClass = null;

    if (classQuery) {
      targetClass = await findClass(classQuery);
      if (!targetClass) {
        return await interaction.editReply({
          content: `🔍 Không tìm thấy lớp học nào khớp với **"${classQuery}"**.`,
        });
      }
    }

    const sessions = await getAttendanceToday(targetClass ? targetClass.classId : null);

    if (sessions.length === 0) {
      return await interaction.editReply({
        content: `ℹ️ Chưa có buổi học nào được điểm danh hôm nay${targetClass ? ` cho lớp **${targetClass.name}**` : ""}.`,
      });
    }

    const embeds = sessions.map((s) => buildAttendanceEmbed(s, targetClass));
    return await interaction.editReply({
      content: `📋 Kết quả điểm danh hôm nay (${sessions.length} phiên):`,
      embeds,
    });
  } catch (error) {
    console.error("[Command: /attendance error]", error);
    return await interaction.editReply({
      content: `❌ Lỗi khi tra cứu điểm danh: ${error.message}`,
    });
  }
};
