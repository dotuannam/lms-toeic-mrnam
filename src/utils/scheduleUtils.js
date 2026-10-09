/**
 * Schedule & Timetable Utility Helpers
 * Centralized parsing, composing, and matching for class schedules.
 *
 * Supports all standard and colloquial Vietnamese & English schedule formats:
 * - "Thứ 2 - 4 - 6 (18:00 - 19:30)"
 * - "Thứ 2, 4, 6" / "Thứ 2,4,6" / "Thứ 2-4-6" / "Thứ 246" / "246" / "2, 4, 6" / "2-4-6"
 * - "T2-T4-T6" / "T2, T4, T6" / "T2-4-6" / "T2,4,6" / "2/4/6"
 * - "Thứ 2, Thứ 4, Thứ 6" / "Thứ Hai - Thứ Tư - Thứ Sáu"
 * - "Thứ 3 - 5 - 7" / "Thứ 3, 5, 7" / "Thứ 357" / "357" / "3-5-7" / "T3-T5-T7" / "TTS"
 * - "Thứ 2 - 4", "Thứ 3 - 5", "Thứ 4 - 6", "Thứ 2 - 6", "Thứ 5 - 7"
 * - "Thứ 7 - CN", "Thứ 7, CN", "T7-CN", "7-CN", "Thứ Bảy, Chủ Nhật", "Weekend"
 * - "Thứ 2 đến Thứ 6", "T2 -> T6", "Hàng ngày", "Daily", "All days"
 * - Time formats: "18:00 - 20:00", "18h30 - 20h00", "18h - 20h", "18.00 - 20.00"
 */

/**
 * Get local ISO date string (YYYY-MM-DD) avoiding UTC midnight timezone rollback
 */
export const getLocalDateString = (dateObj = new Date()) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Normalize date strings in various formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) to standard YYYY-MM-DD
 */
export const normalizeDateToISO = (dStr) => {
  if (!dStr) return "";
  const s = String(dStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
};

/**
 * Normalize time strings (18h -> 18:00, 18h30 -> 18:30, 8:30 -> 08:30, 18.00 -> 18:00)
 */
export const normalizeTimeStr = (tStr) => {
  if (!tStr) return "18:00";
  let s = tStr.toLowerCase().trim();
  if (s.endsWith("h")) {
    const h = parseInt(s.slice(0, -1), 10);
    return `${String(h).padStart(2, "0")}:00`;
  }
  if (s.includes("h")) {
    const [h, m] = s.split("h");
    return `${String(parseInt(h, 10)).padStart(2, "0")}:${String(parseInt(m, 10) || 0).padStart(2, "0")}`;
  }
  if (s.includes(":")) {
    const [h, m] = s.split(":");
    return `${String(parseInt(h, 10)).padStart(2, "0")}:${String(parseInt(m, 10) || 0).padStart(2, "0")}`;
  }
  if (s.includes(".")) {
    const [h, m] = s.split(".");
    return `${String(parseInt(h, 10)).padStart(2, "0")}:${String(parseInt(m, 10) || 0).padStart(2, "0")}`;
  }
  const h = parseInt(s, 10);
  return !isNaN(h) ? `${String(h).padStart(2, "0")}:00` : "18:00";
};

/**
 * Parse any schedule string into structured days boolean map and time window
 */
export const parseClassSchedule = (scheduleStr = "", extraContext = "") => {
  if (!scheduleStr || typeof scheduleStr !== "string") {
    if (extraContext && typeof extraContext === "string") {
      const ctx = extraContext.toLowerCase();
      if (/\b246\b|2-4-6|2, 4, 6|2,4,6|thứ 246|t2-t4-t6|mwf/i.test(ctx)) {
        return {
          days: { mon: true, tue: false, wed: true, thu: false, fri: true, sat: false, sun: false },
          startTime: "18:00",
          endTime: "20:00",
          shift: "evening",
        };
      }
      if (/\b357\b|3-5-7|3, 5, 7|3,5,7|thứ 357|t3-t5-t7|tts/i.test(ctx)) {
        return {
          days: { mon: false, tue: true, wed: false, thu: true, fri: false, sat: true, sun: false },
          startTime: "18:00",
          endTime: "20:00",
          shift: "evening",
        };
      }
    }
    return {
      days: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
      startTime: "18:00",
      endTime: "20:00",
      shift: "evening",
    };
  }

  // 1. Normalize unicode dashes and whitespace
  let raw = scheduleStr
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-") // en-dash, em-dash to hyphen
    .replace(/\s+/g, " ")
    .trim();

  // 2. Extract Time Window (HH:MM - HH:MM, HHhMM - HHhMM, HHh - HHh, etc.)
  let startTime = "18:00";
  let endTime = "20:00";

  const timeToken = `(?:\\d{1,2}[:.h]\\d{2}|\\d{1,2}h|\\b(?:[89]|1\\d|2[0-3])\\b)`;
  const timeRangeRegex = new RegExp(`(${timeToken})\\s*(?:-|to|->|~)\\s*(${timeToken})`, "i");

  // Check parenthesized time window: e.g. "(18:00 - 20:00)"
  const parenMatch = raw.match(/\(([^)]+)\)/);
  let matchedTime = false;

  if (parenMatch) {
    const insideParen = parenMatch[1];
    const matchInside = insideParen.match(timeRangeRegex);
    if (matchInside) {
      startTime = normalizeTimeStr(matchInside[1]);
      endTime = normalizeTimeStr(matchInside[2]);
      matchedTime = true;
    }
  }

  if (!matchedTime) {
    // Check in full string with strict time token (must have ':' or 'h' or '.')
    const strictTimeToken = `(?:\\d{1,2}[:.h]\\d{2}|\\d{1,2}h)`;
    const strictRangeRegex = new RegExp(`(${strictTimeToken})\\s*(?:-|to|->|~)\\s*(${strictTimeToken})`, "i");
    const fullMatch = raw.match(strictRangeRegex);
    if (fullMatch) {
      startTime = normalizeTimeStr(fullMatch[1]);
      endTime = normalizeTimeStr(fullMatch[2]);
      matchedTime = true;
    }
  }

  // 3. Strip time and digits inside parens to isolate day keywords without digit interference
  let dayText = raw
    .replace(/\([^)]*\d+[^)]*\)/g, " ")
    .replace(/\b\d{1,2}[:.h]\d{2}\b/gi, " ")
    .replace(/\b\d{1,2}h\b/gi, " ")
    .toLowerCase()
    .trim();

  const days = {
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
    sun: false,
  };

  const hasWord = (w) => new RegExp(`(?:^|[^0-9a-zA-ZÀ-ỹ])${w}(?:[^0-9a-zA-ZÀ-ỹ]|$)`, "i").test(dayText);

  // A. Check for "All week" / "Daily" / "Hàng ngày" / "Mỗi ngày"
  if (
    dayText.includes("hàng ngày") ||
    dayText.includes("hang ngay") ||
    dayText.includes("mỗi ngày") ||
    dayText.includes("moi ngay") ||
    dayText.includes("cả tuần") ||
    dayText.includes("ca tuan") ||
    hasWord("daily") ||
    hasWord("everyday") ||
    dayText.includes("all days")
  ) {
    days.mon = days.tue = days.wed = days.thu = days.fri = days.sat = days.sun = true;
  }
  // B. Check for Monday to Friday explicit range: "thứ 2 đến thứ 6", "t2 đến t6", "t2 -> t6"
  else if (
    /(?:thứ\s*2|t2|\b2\b)\s*(?:đến|den|tới|toi|->)\s*(?:thứ\s*6|t6|\b6\b)/i.test(dayText)
  ) {
    days.mon = days.tue = days.wed = days.thu = days.fri = true;
  }
  // C. Check for Weekend: "cuối tuần", "weekend"
  else if (dayText.includes("cuối tuần") || dayText.includes("cuoi tuan") || hasWord("weekend")) {
    days.sat = days.sun = true;
  } else {
    // D. Normal day detection

    // Sunday (CN, Chủ Nhật, Sun, Sunday)
    if (
      dayText.includes("chủ nhật") ||
      dayText.includes("chu nhat") ||
      hasWord("cn") ||
      hasWord("sun") ||
      hasWord("sunday") ||
      /c\.nhật|c\.nhat/i.test(dayText)
    ) {
      days.sun = true;
    }

    // English abbreviations: MWF (Mon-Wed-Fri), TTS (Tue-Thu-Sat)
    if (hasWord("mwf")) {
      days.mon = days.wed = days.fri = true;
    }
    if (hasWord("tts")) {
      days.tue = days.thu = days.sat = true;
    }

    // Compact digit combos: "246", "357", "24", "35", "46", "26", "57"
    if (/\b246\b|thứ\s*246|t246/i.test(dayText)) {
      days.mon = days.wed = days.fri = true;
    }
    if (/\b357\b|thứ\s*357|t357/i.test(dayText)) {
      days.tue = days.thu = days.sat = true;
    }
    if (/\b24\b|thứ\s*24\b|t24\b/i.test(dayText)) {
      days.mon = days.wed = true;
    }
    if (/\b35\b|thứ\s*35\b|t35\b/i.test(dayText)) {
      days.tue = days.thu = true;
    }
    if (/\b46\b|thứ\s*46\b|t46\b/i.test(dayText)) {
      days.wed = days.fri = true;
    }
    if (/\b57\b|thứ\s*57\b|t57\b/i.test(dayText)) {
      days.thu = days.sat = true;
    }
    if (/\b26\b|thứ\s*26\b|t26\b/i.test(dayText)) {
      days.mon = days.fri = true;
    }

    // Explicit English Day Names
    if (hasWord("mon") || hasWord("monday")) days.mon = true;
    if (hasWord("tue") || hasWord("tuesday")) days.tue = true;
    if (hasWord("wed") || hasWord("wednesday")) days.wed = true;
    if (hasWord("thu") || hasWord("thursday") || hasWord("thur") || hasWord("thurs")) days.thu = true;
    if (hasWord("fri") || hasWord("friday")) days.fri = true;
    if (hasWord("sat") || hasWord("saturday")) days.sat = true;

    // Vietnamese spelled out names: Thứ Hai, Thứ Ba, Thứ Tư, Thứ Năm, Thứ Sáu, Thứ Bảy
    // Handles also: "Thứ hai - tư - sáu", "Hai - tư - sáu", "Ba - năm - bảy"
    if (/thứ\s*hai|thu\s*hai|\bhai\s*[-–—,/]\s*(?:tư|tu)|\bhai\b/i.test(dayText) && (dayText.includes("hai") || dayText.includes("tư") || dayText.includes("tu"))) {
      days.mon = true;
    } else if (/thứ\s*hai|thu\s*hai/i.test(dayText)) {
      days.mon = true;
    }
    if (/thứ\s*ba|thu\s*ba|\bba\s*[-–—,/]\s*(?:năm|nam)/i.test(dayText)) days.tue = true;
    if (/(?:thứ|thu)\s*(?:tư|tu|bốn|bon)|(?:hai|2)\s*[-–—,/]\s*(?:tư|tu)|(?:tư|tu)\s*[-–—,/]\s*(?:sáu|sau)/i.test(dayText)) days.wed = true;
    if (/thứ\s*năm|thu\s*nam|(?:ba|3)\s*[-–—,/]\s*(?:năm|nam)|(?:năm|nam)\s*[-–—,/]\s*(?:bảy|bay)/i.test(dayText)) days.thu = true;
    if (/(?:thứ|thu)\s*(?:sáu|sau)|(?:tư|tu|4)\s*[-–—,/]\s*(?:sáu|sau)/i.test(dayText)) days.fri = true;
    if (/(?:thứ|thu)\s*(?:bảy|bay)|(?:năm|nam|5)\s*[-–—,/]\s*(?:bảy|bay)/i.test(dayText)) days.sat = true;

    // Vietnamese numbered formats:
    // Handles: "thứ 2", "t2", "2-4-6", "2, 4, 6", "2,4,6", "2 - 4 - 6", "2/4/6", "t2, t4, t6", "t2-t4-t6"
    const checkDayDigit = (d) => {
      // 1. "thứ D" or "thu D"
      if (new RegExp(`(?:thứ|thu)\\s*${d}`, "i").test(dayText)) return true;
      // 2. "tD" (e.g. t2, t3, t4, t5, t6, t7)
      if (new RegExp(`(?:^|[^0-9a-zA-ZÀ-ỹ])t${d}(?:[^0-9a-zA-ZÀ-ỹ]|$)`, "i").test(dayText)) return true;
      // 3. Isolated digit D surrounded by non-digits
      const digitRegex = new RegExp(`(?:^|[^0-9a-zA-ZÀ-ỹ])${d}(?:[^0-9a-zA-ZÀ-ỹ]|$)`, "i");
      if (digitRegex.test(dayText)) return true;
      return false;
    };

    if (checkDayDigit(2)) days.mon = true;
    if (checkDayDigit(3)) days.tue = true;
    if (checkDayDigit(4)) days.wed = true;
    if (checkDayDigit(5)) days.thu = true;
    if (checkDayDigit(6)) days.fri = true;
    if (checkDayDigit(7)) days.sat = true;
  }

  // Safety fallback: if extraContext (class name or class code) explicitly mentions 246 / 357 / T7-CN
  if (extraContext && typeof extraContext === "string") {
    const ctx = extraContext.toLowerCase();
    if (/\b246\b|2-4-6|2, 4, 6|2,4,6|thứ 246|t2-t4-t6|mwf/i.test(ctx)) {
      days.mon = days.wed = days.fri = true;
    }
    if (/\b357\b|3-5-7|3, 5, 7|3,5,7|thứ 357|t3-t5-t7|tts/i.test(ctx)) {
      days.tue = days.thu = days.sat = true;
    }
    if (/\bt7-cn\b|t7, cn|7-cn|7, cn|cuối tuần/i.test(ctx)) {
      days.sat = days.sun = true;
    }
  }

  // Fallback: If absolutely no day could be detected, default to Mon-Wed-Fri
  // ONLY for empty scheduleStr
  if (!Object.values(days).some(Boolean)) {
    days.mon = true;
    days.wed = true;
    days.fri = true;
  }

  // Determine slot shift: Morning, Afternoon, Evening
  const startHour = parseInt(startTime.split(":")[0], 10);
  let shift = "evening";
  if (startHour < 12) {
    shift = "morning";
  } else if (startHour < 17) {
    shift = "afternoon";
  }

  return { days, startTime, endTime, shift };
};

/**
 * Format selected days and shift into human readable schedule string
 */
export const composeScheduleString = (selectedDays = [], shift = null, isVi = true) => {
  const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const sorted = dayOrder.filter((d) => selectedDays.includes(d));

  let dayPart = "";
  if (sorted.length > 0) {
    if (isVi) {
      const viDayMap = {
        mon: "2",
        tue: "3",
        wed: "4",
        thu: "5",
        fri: "6",
        sat: "7",
        sun: "CN",
      };
      dayPart = `Thứ ${sorted.map((d) => viDayMap[d]).join(" - ")}`;
    } else {
      const enDayMap = {
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
        sun: "Sun",
      };
      dayPart = sorted.map((d) => enDayMap[d]).join(" - ");
    }
  }

  const timePart = shift ? `(${shift.startTime} - ${shift.endTime})` : "";
  if (dayPart && timePart) {
    return `${dayPart} ${timePart}`;
  }
  return dayPart || timePart || "";
};

/**
 * Check if a class matches a center shift
 */
export const isClassInShift = (cls, shift) => {
  if (!cls || !cls.schedule || !shift) return false;
  const parsed = parseClassSchedule(cls.schedule);

  // Exact start time match
  if (parsed.startTime === shift.startTime) return true;

  // Exact name mention
  if (cls.schedule.toLowerCase().includes(shift.name.toLowerCase())) return true;

  // Window comparison
  const [cH, cM] = parsed.startTime.split(":").map(Number);
  const [sStartH, sStartM] = shift.startTime.split(":").map(Number);
  const [sEndH, sEndM] = shift.endTime.split(":").map(Number);

  const cMin = (cH || 0) * 60 + (cM || 0);
  const sStartMin = (sStartH || 0) * 60 + (sStartM || 0);
  const sEndMin = (sEndH || 0) * 60 + (sEndM || 0);

  return cMin >= sStartMin && cMin < sEndMin;
};

/**
 * Check if a class is scheduled on a specific date (YYYY-MM-DD)
 */
export const isClassOnDate = (cls, dateStr, dayKey = null) => {
  if (!cls) return false;
  const parsed = parseClassSchedule(cls.schedule, `${cls.name || ""} ${cls.code || ""}`);

  const targetDayKey =
    dayKey ||
    (() => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayIndex = (dateObj.getDay() + 6) % 7; // 0 = Mon, ..., 6 = Sun
      const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      return dayKeys[dayIndex];
    })();

  if (!parsed.days[targetDayKey]) return false;

  const sDate = normalizeDateToISO(cls.startDate);
  const eDate = normalizeDateToISO(cls.endDate);

  if (sDate && sDate > dateStr) return false;
  if (eDate && eDate < dateStr) return false;

  return true;
};

/**
 * Sort classes chronologically by start time
 */
export const sortClassesByTime = (classList = []) => {
  return [...classList].sort((a, b) => {
    const pA = parseClassSchedule(a.schedule);
    const pB = parseClassSchedule(b.schedule);
    return pA.startTime.localeCompare(pB.startTime);
  });
};
