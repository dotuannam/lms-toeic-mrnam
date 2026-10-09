/**
/**
 * Utility helpers for Holiday detection, Student Birthday detection,
 * and Course End Date reminder calculation.
 */

export const PUBLIC_HOLIDAYS = [
  {
    day: 1,
    month: 1,
    titleVi: "Tết Dương Lịch 🎆",
    titleEn: "New Year's Day 🎆",
    messageVi: "Chúc mừng năm mới! Chúc bạn và gia đình một năm mới dồi dào sức khỏe, ngập tràn hạnh phúc và gặt hái thật nhiều thành công rực rỡ!",
    messageEn: "Happy New Year! Wishing you and your loved ones happiness, health, and academic excellence in the year ahead!",
    icon: "🎆",
    gradient: "from-amber-500 via-rose-500 to-indigo-600",
  },
  {
    day: 14,
    month: 2,
    titleVi: "Lễ Tình Nhân (Valentine's Day) 💖",
    titleEn: "Valentine's Day 💖",
    messageVi: "Chúc bạn một ngày Valentine ngọt ngào, ấm áp và hạnh phúc bên những người thân thương!",
    messageEn: "Happy Valentine's Day! Wishing you a day filled with love, warmth, and memorable moments!",
    icon: "💖",
    gradient: "from-rose-500 via-pink-500 to-purple-600",
  },
  {
    day: 8,
    month: 3,
    titleVi: "Ngày Quốc Tế Phụ Nữ (8/3) 🌸",
    titleEn: "International Women's Day (Mar 8) 🌸",
    messageVi: "Chúc mừng ngày Quốc tế Phụ nữ 8/3! Chúc các cô giáo và các bạn học viên nữ luôn rạng rỡ, tự tin, xinh đẹp và hạnh phúc!",
    messageEn: "Happy International Women's Day! Wishing all wonderful female instructors and students joy, radiance, and empowerment!",
    icon: "🌸",
    gradient: "from-pink-500 via-rose-400 to-amber-500",
  },
  {
    day: 30,
    month: 4,
    titleVi: "Ngày Giải Phóng Miền Nam (30/4) 🇻🇳",
    titleEn: "Reunification Day (Apr 30) 🇻🇳",
    messageVi: "Chào mừng 30/4 - Ngày Giải phóng miền Nam, thống nhất đất nước! Tự hào truyền thống vẻ vang của non sông Việt Nam!",
    messageEn: "Celebrating Vietnam Reunification Day! Wishing you an inspiring and proud holiday with your family!",
    icon: "🇻🇳",
    gradient: "from-red-600 via-amber-500 to-rose-600",
  },
  {
    day: 1,
    month: 5,
    titleVi: "Ngày Quốc Tế Lao Động (1/5) 🛠️",
    titleEn: "International Workers' Day (May 1) 🛠️",
    messageVi: "Chúc mừng Ngày Quốc tế Lao động 1/5! Chúc bạn có một kỳ nghỉ lễ thật sảng khoái và tái tạo nguồn năng lượng dồi dào!",
    messageEn: "Happy International Workers' Day! Enjoy a restful and rejuvenating holiday with family and friends!",
    icon: "🛠️",
    gradient: "from-emerald-600 via-teal-500 to-cyan-600",
  },
  {
    day: 1,
    month: 6,
    titleVi: "Ngày Quốc Tế Thiếu Nhi (1/6) 🎈",
    titleEn: "International Children's Day (Jun 1) 🎈",
    messageVi: "Chúc mừng Ngày Quốc tế Thiếu nhi 1/6! Chúc các bạn học viên luôn giữ trọn niềm vui khám phá, sáng tạo và ngập tràn tiếng cười!",
    messageEn: "Happy International Children's Day! Keep your curiosity, joy, and passionate spirit of learning shining bright!",
    icon: "🎈",
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
  },
  {
    day: 2,
    month: 9,
    titleVi: "Ngày Quốc Khánh Nước CHXHCN Việt Nam (2/9) 🇻🇳",
    titleEn: "Vietnam National Day (Sep 2) 🇻🇳",
    messageVi: "Nhiệt liệt chào mừng Ngày Quốc khánh 2/9! Chúc bạn và gia đình một kỳ nghỉ lễ an lành, hạnh phúc và dồi dào sức khỏe!",
    messageEn: "Happy Vietnam National Day! Wishing you and your family a peaceful, joyful, and meaningful holiday!",
    icon: "🇻🇳",
    gradient: "from-red-600 via-red-500 to-amber-500",
  },
  {
    day: 20,
    month: 10,
    titleVi: "Ngày Phụ Nữ Việt Nam (20/10) 💐",
    titleEn: "Vietnamese Women's Day (Oct 20) 💐",
    messageVi: "Chúc mừng ngày Phụ nữ Việt Nam 20/10! Chúc phái đẹp của Clever Course luôn xinh tươi, hạnh phúc, tự tin và thành công trên mọi chặng đường!",
    messageEn: "Happy Vietnamese Women's Day! Celebrating the strength, elegance, and brilliance of all our female instructors and learners!",
    icon: "💐",
    gradient: "from-rose-500 via-pink-400 to-purple-500",
  },
  {
    day: 20,
    month: 11,
    titleVi: "Ngày Nhà Giáo Việt Nam (20/11) 🎓💐",
    titleEn: "Vietnamese Teacher's Day (Nov 20) 🎓💐",
    messageVi: "Tri ân Ngày Nhà giáo Việt Nam 20/11! Kính chúc quý thầy cô luôn mạnh khỏe, hạnh phúc và luôn tràn đầy tâm huyết với sự nghiệp giáo dục!",
    messageEn: "Happy Teacher's Day! Deep gratitude to all passionate instructors shaping bright futures every single day!",
    icon: "🎓",
    gradient: "from-blue-600 via-indigo-600 to-cyan-500",
  },
  {
    day: 24,
    month: 12,
    titleVi: "Đêm Giáng Sinh (Christmas Eve) 🎄✨",
    titleEn: "Christmas Eve 🎄✨",
    messageVi: "Chúc bạn và gia đình một đêm Giáng sinh ấm cúng, an lành và ngập tràn niềm vui yêu thương!",
    messageEn: "Merry Christmas Eve! Wishing you warmth, peace, and joyous moments with your loved ones!",
    icon: "🎄",
    gradient: "from-emerald-700 via-red-600 to-amber-500",
  },
  {
    day: 25,
    month: 12,
    titleVi: "Lễ Giáng Sinh (Merry Christmas) 🎅🎁",
    titleEn: "Merry Christmas 🎅🎁",
    messageVi: "Merry Christmas! Chúc bạn một mùa Giáng sinh ngập tràn quà tặng, may mắn, an lành và một năm mới tuyệt vời!",
    messageEn: "Merry Christmas! May your holidays be bright, merry, and filled with love, laughter, and cheer!",
    icon: "🎅",
    gradient: "from-emerald-700 via-red-600 to-amber-500",
  },
];

/**
 * Check if a date matches any public holiday
 */
export const getTodayHoliday = (date = new Date()) => {
  const d = date.getDate();
  const m = date.getMonth() + 1; // 1-indexed

  const match = PUBLIC_HOLIDAYS.find((h) => h.day === d && h.month === m);
  if (!match) return null;

  return {
    ...match,
    dateStr: `${d < 10 ? "0" + d : d}/${m < 10 ? "0" + m : m}`,
  };
};

/**
 * Check if today matches student's Birthday
 * Accepts formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
 */
export const checkIsStudentBirthday = (dobString, targetDate = new Date()) => {
  if (!dobString || typeof dobString !== "string") return false;

  const currentDay = targetDate.getDate();
  const currentMonth = targetDate.getMonth() + 1; // 1-indexed

  const clean = dobString.trim();

  // Try ISO YYYY-MM-DD
  if (clean.includes("-")) {
    const parts = clean.split("-");
    if (parts.length === 3) {
      const birthMonth = parseInt(parts[1], 10);
      const birthDay = parseInt(parts[2], 10);
      return birthDay === currentDay && birthMonth === currentMonth;
    }
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (parts.length >= 2) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      // Typically DD/MM in Vietnam
      if (p1 === currentDay && p2 === currentMonth) return true;
      // In case MM/DD
      if (p2 === currentDay && p1 === currentMonth) return true;
    }
  }

  return false;
};

/**
 * Check if the active course is ending within the reminder window (e.g., within 7 days)
 * @param {string} endDateStr - e.g. "2026-10-14"
 * @param {Date} [targetDate=new Date()]
 * @param {number} [windowDays=7]
 */
export const checkCourseEndReminder = (endDateStr, targetDate = new Date(), windowDays = 7) => {
  if (!endDateStr) return null;

  try {
    const end = new Date(endDateStr);
    if (isNaN(end.getTime())) return null;

    // Reset times to midnight for precise calendar day diff
    const today = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const diffMs = endMidnight.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // If course ends within 0 to windowDays (e.g., 7 days)
    if (diffDays >= 0 && diffDays <= windowDays) {
      return {
        isEndingSoon: true,
        daysRemaining: diffDays,
        endDateFormatted: end.toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
      };
    }
  } catch (err) {
    console.warn("Could not calculate course end reminder:", err);
  }

  return null;
};
