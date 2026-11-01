import { SlashCommandBuilder } from "discord.js";
import { findStudent, findClass } from "../services/lmsQueryService.js";
import { buildStudentEmbed } from "../utils/embedBuilder.js";

export const data = new SlashCommandBuilder()
  .setName("student")
  .setDescription("Tra cứu nhanh hồ sơ học viên (thông tin, lớp học, công nợ, điểm số)")
  .addStringOption((opt) =>
    opt
      .setName("query")
      .setDescription("Mã học viên, Số điện thoại, Email hoặc Họ tên")
      .setRequired(true)
  );

export const execute = async (interaction) => {
  await interaction.deferReply();
  const query = interaction.options.getString("query");

  try {
    const student = await findStudent(query);
    if (!student) {
      return await interaction.editReply({
        content: `🔍 Không tìm thấy học viên nào phù hợp với từ khóa: **"${query}"**.`,
      });
    }

    // Look up class info if available
    let classData = null;
    const enrolledClassId = student.enrolledClasses?.[0]?.classId;
    if (enrolledClassId) {
      classData = await findClass(enrolledClassId);
    }

    const embed = buildStudentEmbed(student, classData);
    return await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("[Command: /student error]", error);
    return await interaction.editReply({
      content: `❌ Lỗi khi tra cứu học viên: ${error.message}`,
    });
  }
};
