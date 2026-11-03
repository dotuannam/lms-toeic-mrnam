import { EmbedBuilder } from "discord.js";
import {
  formatVND,
  formatDateVN,
  formatDateTimeVN,
  translateRole,
  translateAction,
  truncate,
} from "./formatters.js";

export const COLORS = {
  PRIMARY: 0x3b82f6, // Blue
  SUCCESS: 0x10b981, // Green
  WARNING: 0xf59e0b, // Amber
  DANGER: 0xef4444,  // Red
  PURPLE: 0x8b5cf6,  // Purple
  CYAN: 0x06b6d4,    // Cyan
  DARK: 0x1e293b,    // Slate dark
};

/**
 * Embed for TOEIC Placement Test Submission
 */
export const buildPlacementTestEmbed = (log) => {
  const meta = log.metadata || {};
  const candidateName = meta.candidateName || log.targetName || "Thí sinh";
  const phone = meta.phone || "Chưa cung cấp";
  const email = meta.email || "Chưa cung cấp";
  const score = meta.score ?? 0;
  const total = meta.totalQuestions || 15;
  const tier = meta.tier || "Foundation";
  const course = meta.recommendedCourse || "Khóa học TOEIC Foundation";
  const percent = Math.round((score / total) * 100);

  const color = score >= 12 ? COLORS.SUCCESS : score >= 7 ? COLORS.PRIMARY : COLORS.WARNING;

  const embed = new EmbedBuilder()
    .setTitle("🎯 THÍ SINH VỪA NỘP BÀI MINI PLACEMENT TEST!")
    .setColor(color)
    .setDescription(
      `Thí sinh **${candidateName}** vừa hoàn thành bài kiểm tra TOEIC Mini Placement Test 15 câu trên Landing Page!\n` +
      `⏱️ Điểm số: **${score}/${total}** (${percent}%) • Xếp lớp: **${tier}**`
    )
    .addFields(
      {
        name: "👤 Thông tin thí sinh",
        value: `• **Họ và tên:** ${candidateName}\n• **Số điện thoại:** \`${phone}\`\n• **Email:** \`${email}\``,
        inline: true,
      },
      {
        name: "📊 Đánh giá năng lực",
        value: `• **Kết quả:** ${score}/${total} câu đúng (${percent}%)\n• **Cấp độ:** ${tier}\n• **Khóa đề xuất:** ${course}`,
        inline: true,
      }
    )
    .setTimestamp(
      log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.timestamp || Date.now())
    )
    .setFooter({
      text: "TOEIC MR.NAM Placement Monitor • LMS Realtime",
    });

  const results = meta.results || [];
  if (results.length > 0) {
    const listeningLines = results
      .filter((r) => r.qNum <= 8)
      .map((r) => {
        const icon = r.isCorrect ? "✅" : "❌";
        const answerInfo = r.isCorrect
          ? `[${r.userChoice}] (Đúng)`
          : `[${r.userChoice || "Trống"}] (Sai - ĐA: ${r.correctChoice})`;
        return `${icon} **Câu ${r.qNum}** (${r.part.split(":")[0]}): ${answerInfo}`;
      })
      .join("\n");

    const readingLines = results
      .filter((r) => r.qNum > 8)
      .map((r) => {
        const icon = r.isCorrect ? "✅" : "❌";
        const answerInfo = r.isCorrect
          ? `[${r.userChoice}] (Đúng)`
          : `[${r.userChoice || "Trống"}] (Sai - ĐA: ${r.correctChoice})`;
        return `${icon} **Câu ${r.qNum}** (${r.part.split(":")[0]}): ${answerInfo}`;
      })
      .join("\n");

    if (listeningLines) {
      embed.addFields({
        name: "🎧 Section 1: Listening (Câu 1 - 8)",
        value: listeningLines,
      });
    }
    if (readingLines) {
      embed.addFields({
        name: "📖 Section 2: Reading (Câu 9 - 15)",
        value: readingLines,
      });
    }
  }

  return embed;
};

/**
 * Embed for real-time Audit Log
 */
export const buildAuditLogEmbed = (log) => {
  if (log.action === "PLACEMENT_TEST_SUBMISSION") {
    return buildPlacementTestEmbed(log);
  }

  const actionLabel = translateAction(log.action);
  const roleLabel = translateRole(log.actor?.role);
  const isDanger =
    log.action.includes("DELETE") || log.action === "USER_LOGOUT";
  const isSuccess =
    log.action === "PAYMENT_RECORD" || log.action === "STUDENT_CREATE";

  const color = isDanger
    ? COLORS.DANGER
    : isSuccess
    ? COLORS.SUCCESS
    : COLORS.PRIMARY;

  const embed = new EmbedBuilder()
    .setTitle(`${actionLabel}`)
    .setColor(color)
    .setDescription(log.details || "Không có ghi chú chi tiết")
    .addFields(
      {
        name: "👤 Người thực hiện",
        value: `**${log.actor?.name || "N/A"}** (${log.actor?.email || "N/A"})\n${roleLabel}`,
        inline: true,
      },
      {
        name: "🎯 Đối tượng / Phân hệ",
        value: `**Phân hệ:** \`${log.resource || "system"}\`\n**ID:** \`${log.targetId || "N/A"}\``,
        inline: true,
      }
    )
    .setTimestamp(
      log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.timestamp || Date.now())
    )
    .setFooter({
      text: "LMS Activity Monitor • TOEIC MR.NAM",
    });

  if (log.metadata && Object.keys(log.metadata).length > 0) {
    const metaStr = Object.entries(log.metadata)
      .filter(([k]) => k !== "userAgent" && k !== "url")
      .map(([k, v]) => `• **${k}**: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .slice(0, 4)
      .join("\n");
    if (metaStr) {
      embed.addFields({ name: "🔍 Thông tin bổ sung", value: metaStr });
    }
  }

  return embed;
};

/**
 * Embed for Student Information
 */
export const buildStudentEmbed = (student, classData = null) => {
  const isDebt = Number(student.tuitionOverview?.totalDebt || student.debtAmount || 0) > 0;
  const debt = Number(student.tuitionOverview?.totalDebt || student.debtAmount || 0);

  const embed = new EmbedBuilder()
    .setTitle(`🎓 Hồ sơ Học viên: ${student.fullName}`)
    .setColor(isDebt ? COLORS.WARNING : COLORS.SUCCESS)
    .setDescription(`Mã học viên: **${student.studentId}**`)
    .addFields(
      {
        name: "📞 Liên hệ",
        value: `Email: \`${student.email || "Chưa có"}\`\nSĐT: **${student.phone || "Chưa có"}**`,
        inline: true,
      },
      {
        name: "🏫 Lớp theo học",
        value: classData ? `**${classData.name}** (\`${classData.code || classData.classId}\`)` : (student.enrolledClasses?.[0]?.className || "Chưa xếp lớp"),
        inline: true,
      },
      {
        name: "💰 Học phí & Công nợ",
        value: isDebt
          ? `⚠️ Còn nợ: **${formatVND(debt)}**`
          : "✅ Đã hoàn thành học phí",
        inline: false,
      }
    )
    .setFooter({ text: "TOEIC MR.NAM LMS Portal" })
    .setTimestamp();

  if (student.latestScoreSummary) {
    const s = student.latestScoreSummary;
    embed.addFields({
      name: "📊 Điểm thi gần nhất",
      value: `**${s.testTitle || s.testType}** (${formatDateVN(s.examDate)})\nTổng điểm: **${s.totalScore}** (Mục tiêu: ${s.targetScore || 0}) • ${s.passed ? "🎉 Đạt" : "⏳ Chưa đạt"}`,
    });
  }

  return embed;
};

/**
 * Embed for Class Info
 */
export const buildClassEmbed = (classData, studentCount = 0) => {
  const schedule = classData.schedule
    ? `${classData.schedule.days || "N/A"} (${classData.schedule.time || "N/A"})`
    : classData.daysOfWeek
    ? `${classData.daysOfWeek.join(", ")} (${classData.timeSlot || ""})`
    : "Chưa cấu hình";

  return new EmbedBuilder()
    .setTitle(`🏫 Lớp học: ${classData.name}`)
    .setColor(COLORS.CYAN)
    .setDescription(`Mã lớp: **${classData.code || classData.classId}**`)
    .addFields(
      {
        name: "👨‍🏫 Giảng viên",
        value: classData.instructorName || classData.teacher || "Chưa phân công",
        inline: true,
      },
      {
        name: "👥 Sĩ số",
        value: `**${studentCount || classData.studentCount || 0}** học viên`,
        inline: true,
      },
      {
        name: "⏰ Lịch học & Ca học",
        value: schedule,
        inline: false,
      },
      {
        name: "💵 Học phí khóa",
        value: formatVND(classData.tuitionFee || 0),
        inline: true,
      },
      {
        name: "📍 Trạng thái",
        value: classData.status === "active" ? "🟢 Đang mở lớp" : "⚪ Đã kết thúc",
        inline: true,
      }
    )
    .setFooter({ text: "TOEIC MR.NAM LMS Portal" })
    .setTimestamp();
};

/**
 * Embed for Attendance Summary
 */
export const buildAttendanceEmbed = (session, classData = null) => {
  const summary = session.summary || {
    total: 0,
    present: 0,
    late: 0,
    excused: 0,
    unexcused: 0,
  };

  const presentRate = summary.total > 0
    ? Math.round((summary.present / summary.total) * 100)
    : 0;

  const color =
    summary.unexcused > 0 ? COLORS.WARNING : COLORS.SUCCESS;

  const embed = new EmbedBuilder()
    .setTitle(`📋 Kết quả Điểm danh: ${classData?.name || session.classId}`)
    .setColor(color)
    .setDescription(`Ngày: **${formatDateVN(session.date)}** • Điểm danh bởi: **${session.takenBy || "Giáo viên"}**`)
    .addFields(
      {
        name: "📊 Tỷ lệ chuyên cần",
        value: `**${presentRate}%** (${summary.present}/${summary.total} học viên)`,
        inline: true,
      },
      {
        name: "⏰ Đi muộn",
        value: `${summary.late} bạn`,
        inline: true,
      },
      {
        name: "❌ Vắng mặt",
        value: `Có phép: **${summary.excused}** | Không phép: **${summary.unexcused}**`,
        inline: false,
      }
    )
    .setFooter({ text: "Hệ thống Quản lý Chuyên cần LMS" })
    .setTimestamp();

  if (session.records) {
    const absentList = Object.values(session.records)
      .filter((r) => r.status === "unexcused" || r.status === "excused")
      .map((r) => `• **${r.studentName || r.studentId}**: ${r.status === "unexcused" ? "❌ Không phép" : "⚠️ Có phép"}${r.note ? ` (${r.note})` : ""}`)
      .slice(0, 10)
      .join("\n");

    if (absentList) {
      embed.addFields({ name: "Danh sách vắng mặt", value: absentList });
    }
  }

  return embed;
};

/**
 * Embed for Morning Briefing (07:30 sáng)
 */
export const buildMorningBriefingEmbed = (todayClasses = []) => {
  const embed = new EmbedBuilder()
    .setTitle("🌅 BÁO CÁO ĐẦU NGÀY - LỊCH HỌC TRUNG TÂM")
    .setColor(COLORS.CYAN)
    .setDescription(`Hôm nay ngày **${formatDateVN(new Date())}** có **${todayClasses.length}** lớp học diễn ra.`)
    .setFooter({ text: "TOEIC MR.NAM Management Bot" })
    .setTimestamp();

  if (todayClasses.length === 0) {
    embed.addFields({
      name: "Lịch học",
      value: "🎉 Hôm nay trung tâm không có lớp học nào theo lịch cố định.",
    });
  } else {
    todayClasses.slice(0, 10).forEach((c, idx) => {
      embed.addFields({
        name: `${idx + 1}. ${c.name} (${c.code || c.classId})`,
        value: `👨‍🏫 **GV:** ${c.instructorName || "Chưa phân công"} | ⏰ **Ca:** ${c.timeSlot || c.schedule?.time || "N/A"}\n👥 **Sĩ số:** ${c.studentCount || 0} học viên | 📍 **Phòng:** ${c.room || "Cơ sở chính"}`,
      });
    });
  }

  return embed;
};

/**
 * Embed for Evening Briefing (22:00 tối)
 */
export const buildEveningBriefingEmbed = (stats) => {
  return new EmbedBuilder()
    .setTitle("🌙 BÁO CÁO TỔNG KẾT NGÀY - ĐIỀU HÀNH TRUNG TÂM")
    .setColor(COLORS.PURPLE)
    .setDescription(`Tổng hợp toàn bộ chỉ số vận hành ngày **${formatDateVN(new Date())}**`)
    .addFields(
      {
        name: "💰 Tài chính & Học phí trong ngày",
        value: `• Học phí thu được: **${formatVND(stats.todayIncome || 0)}**\n• Số giao dịch mới: **${stats.paymentCount || 0}** lượt`,
        inline: false,
      },
      {
        name: "📋 Tình hình Chuyên cần",
        value: `• Số lớp đã điểm danh: **${stats.attendedClassesCount || 0}** lớp\n• Tổng lượt đi học: **${stats.totalPresent || 0}**\n• Tổng lượt vắng: **${stats.totalAbsent || 0}**`,
        inline: false,
      },
      {
        name: "👥 Học viên & Vận hành",
        value: `• Học viên mới đăng ký: **${stats.newStudentsToday || 0}**\n• Hoạt động hệ thống ghi nhận: **${stats.todayActivityCount || 0}** sự kiện`,
        inline: false,
      }
    )
    .setFooter({ text: "TOEIC MR.NAM Executive Briefing" })
    .setTimestamp();
};

/**
 * Embed for Instant Alerts (Nghỉ học liên tiếp, quá hạn học phí...)
 */
export const buildAlertEmbed = (type, title, description, fields = []) => {
  const isDanger = type === "danger";
  const embed = new EmbedBuilder()
    .setTitle(`🚨 CẢNH BÁO: ${title}`)
    .setColor(isDanger ? COLORS.DANGER : COLORS.WARNING)
    .setDescription(description)
    .setFooter({ text: "TOEIC MR.NAM Automated Alert System" })
    .setTimestamp();

  if (fields.length > 0) {
    fields.forEach((f) => embed.addFields(f));
  }

  return embed;
};
