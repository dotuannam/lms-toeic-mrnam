import { fetchCollectionDocs } from "../config/firebase.js";
import { format } from "date-fns";
import { stringify } from "csv-stringify/sync";
import { formatDateTimeVN, translateAction, translateRole } from "../utils/formatters.js";

/**
 * Fetch logs for a specific user (by email, name, UID or studentId)
 */
export const getUserLogs = async (identifier, limitCount = 20) => {
  if (!identifier) return [];
  const qStr = identifier.trim().toLowerCase();

  const allLogs = await fetchCollectionDocs("activity_logs", {
    orderByField: "createdAt",
    orderDirection: "desc",
    limitCount: 150,
  });

  return allLogs
    .filter((log) => {
      const actorEmail = (log.actor?.email || "").toLowerCase();
      const actorName = (log.actor?.name || "").toLowerCase();
      const actorUid = (log.actor?.uid || "").toLowerCase();
      const targetId = (log.targetId || "").toLowerCase();
      const targetName = (log.targetName || "").toLowerCase();

      return (
        actorEmail.includes(qStr) ||
        actorName.includes(qStr) ||
        actorUid === qStr ||
        targetId.includes(qStr) ||
        targetName.includes(qStr)
      );
    })
    .slice(0, limitCount);
};

/**
 * Fetch activity logs for today
 */
export const getTodayLogs = async (actionFilter = null, limitCount = 25) => {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const logs = await fetchCollectionDocs("activity_logs", {
    whereFilters: [["createdDate", "==", todayStr]],
    orderByField: "createdAt",
    orderDirection: "desc",
    limitCount: 100,
  });

  if (actionFilter && actionFilter !== "all") {
    return logs.filter((l) => l.action === actionFilter).slice(0, limitCount);
  }

  return logs.slice(0, limitCount);
};

/**
 * Generate CSV export of recent activity logs
 */
export const generateLogsCsv = async (rangeDays = 7) => {
  const cutoffTimestamp = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  const logs = await fetchCollectionDocs("activity_logs", {
    orderByField: "createdAt",
    orderDirection: "desc",
    limitCount: 500,
  });

  const filtered = logs.filter((l) => {
    const ts = l.createdAt?.toDate ? l.createdAt.toDate().getTime() : (l.timestamp || Date.now());
    return ts >= cutoffTimestamp;
  });

  const records = filtered.map((log) => ({
    "Thời gian": formatDateTimeVN(log.createdAt || log.timestamp),
    "Hành động": translateAction(log.action),
    "Mã hành động": log.action,
    "Người thực hiện": log.actor?.name || "N/A",
    "Email": log.actor?.email || "N/A",
    "Vai trò": translateRole(log.actor?.role),
    "Phân hệ": log.resource || "system",
    "Mã đối tượng": log.targetId || "",
    "Tên đối tượng": log.targetName || "",
    "Chi tiết": log.details || "",
  }));

  const csvOutput = stringify(records, {
    header: true,
    bom: true, // UTF-8 BOM so Excel on Windows opens Vietnamese characters cleanly!
  });

  return Buffer.from(csvOutput, "utf-8");
};

export default {
  getUserLogs,
  getTodayLogs,
  generateLogsCsv,
};
