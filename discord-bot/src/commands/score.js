import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { findStudent, getStudentScores } from "../services/lmsQueryService.js";
import { formatDateVN } from "../utils/formatters.js";
import { COLORS } from "../utils/embedBuilder.js";

export const data = new SlashCommandBuilder()
  .setName("score")
  .setDescription("Tra cứu bảng điểm & lịch sử bài thi của học viên")
  .addStringOption((opt) =>
    opt
      .setName("student")
      .setDescription("Mã học viên, Số điện thoại hoặc Họ tên")
      .setRequired(true)
  );

export const execute = async (interaction) => {
  await interaction.deferReply();
  const query = interaction.options.getString("student");

  try {
    const student = await findStudent(query);
    if (!student) {
      return await interaction.editReply({
        content: `🔍 Không tìm thấy học viên nào phù hợp với: **"${query}"**.`,
      });
    }

    const scores = await getStudentScores(student.studentId);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Bảng Điểm: ${student.fullName}`)
      .setColor(COLORS.PURPLE)
      .setDescription(`Mã học viên: **${student.studentId}** | Lớp: **${student.enrolledClasses?.[0]?.className || "N/A"}**`)
      .setFooter({ text: "TOEIC MR.NAM Testing System" })
      .setTimestamp();

    if (scores.length === 0) {
      embed.addFields({
        name: "Lịch sử bài thi",
        value: "Học viên này chưa có dữ liệu bài kiểm tra nào được ghi nhận trên hệ thống.",
      });
    } else {
      scores.slice(0, 5).forEach((sc, idx) => {
        const skillsText = sc.skills
          ? Object.entries(sc.skills)
              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
              .join(" | ")
          : "";

        embed.addFields({
          name: `${idx + 1}. ${sc.testTitle || sc.testType || "Bài Test"} (${formatDateVN(sc.testDate)})`,
          value: `🎯 Tổng điểm: **${sc.totalScore || 0}** ${skillsText ? `(${skillsText})` : ""}${sc.feedback ? `\n💬 Nhận xét: *${sc.feedback}*` : ""}`,
        });
      });
    }

    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("[Command: /score error]", error);
    return await interaction.editReply({
      content: `❌ Lỗi khi tra cứu bảng điểm: ${error.message}`,
    });
  }
};
