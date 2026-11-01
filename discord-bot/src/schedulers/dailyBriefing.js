import cron from "node-cron";
import config from "../config/env.js";
import { notifyAdminAndChannel } from "../utils/notifier.js";
import {
  getTodayClasses,
  getAttendanceToday,
  getFinanceSummary,
  checkAbsentAlerts,
} from "../services/lmsQueryService.js";
import { getTodayLogs } from "../services/auditService.js";
import {
  buildMorningBriefingEmbed,
  buildEveningBriefingEmbed,
  buildAlertEmbed,
} from "../utils/embedBuilder.js";

/**
 * Dispatch Morning Briefing (Scheduled)
 */
export const sendMorningBriefing = async (client) => {
  const channelId = config.discord.channels.dailyReports;
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    console.log("🌅 [Scheduler] Generating morning briefing...");
    const todayClasses = await getTodayClasses();
    const embed = buildMorningBriefingEmbed(todayClasses);

    await notifyAdminAndChannel(client, channelId, { embeds: [embed] });
    console.log("✅ [Scheduler] Morning briefing dispatched.");
  } catch (error) {
    console.error("[Scheduler Error] Morning briefing:", error);
  }
};

/**
 * Dispatch Evening Briefing (Scheduled)
 */
export const sendEveningBriefing = async (client) => {
  const channelId = config.discord.channels.dailyReports;

  try {
    console.log("🌙 [Scheduler] Generating evening summary briefing...");

    const [finance, sessions, todayLogs] = await Promise.all([
      getFinanceSummary("today"),
      getAttendanceToday(),
      getTodayLogs("all", 100),
    ]);

    let totalPresent = 0;
    let totalAbsent = 0;

    sessions.forEach((s) => {
      if (s.summary) {
        totalPresent += Number(s.summary.present || 0);
        totalAbsent += Number(s.summary.unexcused || 0) + Number(s.summary.excused || 0);
      }
    });

    const newStudentsCount = todayLogs.filter(
      (l) => l.action === "STUDENT_CREATE"
    ).length;

    const stats = {
      todayIncome: finance.income,
      paymentCount: finance.txCount,
      attendedClassesCount: sessions.length,
      totalPresent,
      totalAbsent,
      newStudentsToday: newStudentsCount,
      todayActivityCount: todayLogs.length,
    };

    const embed = buildEveningBriefingEmbed(stats);
    await notifyAdminAndChannel(client, channelId, { embeds: [embed] });
    console.log("✅ [Scheduler] Evening summary briefing dispatched.");
  } catch (error) {
    console.error("[Scheduler Error] Evening briefing:", error);
  }
};

/**
 * Scheduled check for students needing attention
 */
export const checkAndAlertAbsentees = async (client) => {
  const channelId = config.discord.channels.alerts;

  try {
    const absents = await checkAbsentAlerts();
    if (absents.length === 0) return;

    const absentFields = absents.slice(0, 5).map((a) => ({
      name: `👤 ${a.studentName} (${a.studentId}) - Lớp: ${a.classId}`,
      value: `⚠️ Vắng **${a.count} buổi** không phép gần đây (${a.dates.join(", ")})`,
    }));

    const embed = buildAlertEmbed(
      "danger",
      "CẢNH BÁO CHUYÊN CẦN ĐỊNH KỲ",
      `Tự động phát hiện **${absents.length} học viên** vắng từ 2 buổi trở lên không phép. Vui lòng kiểm tra và liên hệ học viên:`,
      absentFields
    );

    await notifyAdminAndChannel(client, channelId, { embeds: [embed] });
  } catch (error) {
    console.error("[Scheduler Error] Alert check:", error);
  }
};

/**
 * Initialize all cron jobs
 */
export const initSchedulers = (client) => {
  const tz = config.cron.timezone;

  // 1. Morning briefing (e.g., 07:30 AM)
  cron.schedule(
    config.cron.morningBriefing,
    () => sendMorningBriefing(client),
    { timezone: tz }
  );
  console.log(`⏰ [Scheduler] Morning briefing registered: ${config.cron.morningBriefing} (${tz})`);

  // 2. Evening briefing (e.g., 22:00 PM)
  cron.schedule(
    config.cron.eveningBriefing,
    () => sendEveningBriefing(client),
    { timezone: tz }
  );
  console.log(`⏰ [Scheduler] Evening briefing registered: ${config.cron.eveningBriefing} (${tz})`);

  // 3. Periodic absent alerts (e.g., every 3 hours)
  cron.schedule(
    config.cron.alertCheck,
    () => checkAndAlertAbsentees(client),
    { timezone: tz }
  );
  console.log(`⏰ [Scheduler] Alert check registered: ${config.cron.alertCheck} (${tz})`);
};

export default {
  initSchedulers,
  sendMorningBriefing,
  sendEveningBriefing,
  checkAndAlertAbsentees,
};
