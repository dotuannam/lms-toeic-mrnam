/**
 * BỘ GIÁO TRÌNH NGỮ PHÁP TIẾNG ANH (TINH CHỈNH CHO LUYỆN THI TOEIC & IELTS)
 * Biên soạn và chuẩn hóa phục vụ phân hệ Kho học liệu chính thức của trung tâm.
 */

export const GRAMMAR_CURRICULUM = [
  {
    id: "unit-01",
    unitNumber: 1,
    title: "Chuyên đề 1: Tổng quan 12 Thì Thời Trọng Tâm (English Tenses)",
    category: "primary",
    badge: "Trọng tâm TOEIC Part 5 & 6",
    readingTime: "15 phút",
    summary: "Nắm vững công thức, dấu hiệu nhận biết và cách ứng dụng của 6 thì hay xuất hiện nhất trong bài thi TOEIC/IELTS: Hiện tại đơn, Hiện tại tiếp diễn, Hiện tại hoàn thành, Quá khứ đơn, Quá khứ tiếp diễn và Tương lai đơn.",
    sections: [
      {
        heading: "1. Hiện tại đơn (Present Simple) vs Hiện tại tiếp diễn (Present Continuous)",
        content: `• Hiện tại đơn diễn tả chân lý, sự thật hiển nhiên hoặc thói quen lặp đi lặp lại.
  - Công thức: S + V(s/es) | S + do/does not + V_inf | Do/Does + S + V_inf?
  - Dấu hiệu: always, usually, often, every day, once a month, constantly.
  - Ví dụ: The marketing team meets every Monday morning.

• Hiện tại tiếp diễn diễn tả hành động đang diễn ra tại thời điểm nói hoặc kế hoạch chắc chắn trong tương lai gần.
  - Công thức: S + am/is/are + V-ing.
  - Dấu hiệu: now, currently, right now, at the moment, Look!, Listen!.
  - Ví dụ: Mr. Nam is currently analyzing the Q3 financial report.`,
      },
      {
        heading: "2. Hiện tại hoàn thành (Present Perfect)",
        content: `• Diễn tả hành động xảy ra trong quá khứ kéo dài đến hiện tại hoặc vừa mới xảy ra mà kết quả còn lưu lại.
  - Công thức: S + have/has + V3/ed.
  - Dấu hiệu bẫy đề thi: since + mốc thời gian, for + khoảng thời gian, already, yet, recently, over the past 3 years.
  - Ví dụ: We have expanded our operations to three new provinces since 2024.`,
      },
      {
        heading: "3. Mẹo tránh bẫy đề thi TOEIC",
        content: `⚠️ Lưu ý bẫy 'Over / During the last / past + khoảng thời gian': Luôn chia THÌ HIỆN TẠI HOÀN THÀNH, không chia Quá khứ đơn.
  - Câu mẫu: During the past decade, technological innovation has revolutionized the logistics industry.`,
      },
    ],
    exercises: [
      {
        question: "Ms. Tanaka ______ as the senior financial director since the branch opened in Da Nang.",
        options: ["A. works", "B. has worked", "C. is working", "D. worked"],
        answer: "B",
        explanation: "Có dấu hiệu 'since the branch opened' (since + mốc quá khứ) -> chia Hiện tại hoàn thành (has worked).",
      },
      {
        question: "The shuttle bus to the airport ______ every 30 minutes in front of the lobby.",
        options: ["A. departs", "B. is departing", "C. departed", "D. has departed"],
        answer: "A",
        explanation: "Lịch trình phương tiện công cộng cố định lặp lại theo chu kỳ -> chia Hiện tại đơn (departs).",
      },
    ],
  },
  {
    id: "unit-02",
    unitNumber: 2,
    title: "Chuyên đề 2: Câu Bị Động & Thể Truyền Khiến (Passive Voice & Causative)",
    category: "primary",
    badge: "Xuất hiện 90% đề thi",
    readingTime: "12 phút",
    summary: "Công thức bị động của các thì, bị động với động từ khuyết thiếu (modal verbs) và cấu trúc truyền khiến kinh điển (Have/Get something done).",
    sections: [
      {
        heading: "1. Nguyên tắc nhận diện Câu Bị Động",
        content: `• Công thức tổng quát: S + BE + V3/ed (+ by O).
  - Khi phía sau khoảng trống KHÔNG CÓ tân ngữ (O) mà là một giới từ (by, in, at, for) hoặc dấu chấm câu -> Ưu tiên 95% chọn BỊ ĐỘNG.
  - Ví dụ: The conference room was decorated by the event planning staff.`,
      },
      {
        heading: "2. Cấu trúc truyền khiến (Causative Form)",
        content: `• Have someone DO something (nhờ ai làm gì - chủ động).
• Have / Get something DONE (nhờ/thuê cái gì được làm - bị động).
  - Ví dụ: The manager had the technician repair the projector.
  - Ví dụ: We need to get our laptops inspected before tomorrow's seminar.`,
      },
    ],
    exercises: [
      {
        question: "All quarterly expense reports must be ______ to the accounting office before 5:00 PM.",
        options: ["A. submitting", "B. submitted", "C. submit", "D. submission"],
        answer: "B",
        explanation: "Sau 'must be' cần V3/ed để tạo dạng bị động: must be submitted (phải được nộp).",
      },
    ],
  },
  {
    id: "unit-03",
    unitNumber: 3,
    title: "Chuyên đề 3: Mệnh Đề Quan Hệ & Rút Gọn Mệnh Đề (Relative Clauses)",
    category: "primary",
    badge: "Phân hóa điểm 750+",
    readingTime: "18 phút",
    summary: "Sử dụng Who, Whom, Which, That, Whose, Where, When; Kỹ thuật rút gọn mệnh đề quan hệ bằng V-ing (chủ động) và V3/ed (bị động).",
    sections: [
      {
        heading: "1. Đại từ quan hệ cơ bản",
        content: `• Who: thay thế cho danh từ chỉ người làm chủ ngữ (The candidate who arrived first...).
• Whom: thay thế cho người làm tân ngữ (The applicant whom we interviewed yesterday...).
• Which: thay thế cho vật hoặc sự việc (The contract which was signed yesterday...).
• That: có thể thay thế cho Who/Which trong mệnh đề xác định (không đứng sau dấu phẩy).
• Whose: chỉ sở hữu, sau whose luôn là một danh từ trần (whose car, whose proposal).`,
      },
      {
        heading: "2. Kỹ thuật Rút gọn Mệnh đề quan hệ (Cực kỳ quan trọng)",
        content: `• Rút gọn CHỦ ĐỘNG -> dùng V-ing:
  - Gốc: The staff members who arrive late will be reminded.
  - Rút gọn: The staff members arriving late will be reminded.
• Rút gọn BỊ ĐỘNG -> dùng V3/ed:
  - Gốc: The products that are manufactured in Vietnam have high durability.
  - Rút gọn: The products manufactured in Vietnam have high durability.`,
      },
    ],
    exercises: [
      {
        question: "Any passengers ______ to board flight VN128 should proceed to gate number 4 immediately.",
        options: ["A. wish", "B. wishing", "C. wished", "D. are wishing"],
        answer: "B",
        explanation: "Rút gọn mệnh đề quan hệ chủ động: Any passengers (who wish) -> wishing to board.",
      },
    ],
  },
  {
    id: "unit-04",
    unitNumber: 4,
    title: "Chuyên đề 4: Danh Động Từ & Động Từ Nguyên Mẫu (Gerund & Infinitive)",
    category: "primary",
    badge: "Thường gặp Part 5",
    readingTime: "14 phút",
    summary: "Bảng phân loại các động từ đi với V-ing (avoid, consider, delay, suggest...), các động từ đi với To-V (decide, plan, agree, hesitate...) và các cụm từ đặc biệt.",
    sections: [
      {
        heading: "1. Động từ theo sau bởi V-ing (Gerund)",
        content: `• Các động từ phổ biến trong môi trường văn phòng:
  - admit, avoid, consider, delay, postpone, enjoy, finish, mind, practice, suggest, recommend.
  - Cụm từ đi kèm V-ing: look forward to + V-ing, be committed to + V-ing, in addition to + V-ing, be used to + V-ing.`,
      },
      {
        heading: "2. Động từ theo sau bởi To-Infinitive",
        content: `• agree, aim, decide, hope, manage, plan, promise, refuse, afford, intend, hesitate.
• Cấu trúc chỉ mục đích: in order to / so as to / to + V_inf (để làm gì).`,
      },
    ],
    exercises: [
      {
        question: "Our legal department has decided ______ the contract negotiations until next Wednesday.",
        options: ["A. postpone", "B. postponing", "C. to postpone", "D. postponed"],
        answer: "C",
        explanation: "Động từ 'decide' đi kèm 'to V': decided to postpone.",
      },
    ],
  },
  {
    id: "unit-05",
    unitNumber: 5,
    title: "Chuyên đề 5: Câu Điều Kiện & Đảo Ngữ Câu Điều Kiện (Conditionals & Inversion)",
    category: "primary",
    badge: "Chinh phục điểm 800+",
    readingTime: "16 phút",
    summary: "Câu điều kiện loại 1, 2, 3, điều kiện hỗn hợp và cấu trúc đảo ngữ với Should, Were, Had.",
    sections: [
      {
        heading: "1. Câu điều kiện loại 1 & Đảo ngữ với 'Should'",
        content: `• Loại 1: If + S + V(hiện tại), S + will/can/may + V_inf.
• ĐẢO NGỮ LOẠI 1 (Rất hay gặp trong thư từ thương mại):
  - Should + S + V_inf, S + will/can + V_inf (hoặc câu mệnh lệnh).
  - Ví dụ: Should you have any questions, please feel free to contact us. (= If you have...)`,
      },
      {
        heading: "2. Đảo ngữ loại 2 & 3",
        content: `• Đảo loại 2: Were + S + to V_inf, S + would + V_inf.
• Đảo loại 3: Had + S + V3/ed, S + would have + V3/ed.
  - Ví dụ: Had we received the shipment earlier, we would have met the delivery deadline.`,
      },
    ],
    exercises: [
      {
        question: "______ you require any additional assistance, please reach out to customer support.",
        options: ["A. Unless", "B. Should", "C. If were", "D. Had"],
        answer: "B",
        explanation: "Đảo ngữ câu điều kiện loại 1 thay cho 'If you require': Should you require...",
      },
    ],
  },
  {
    id: "unit-06",
    unitNumber: 6,
    title: "Chuyên đề 6: Sự Hòa Hợp Chủ Ngữ & Động Từ (Subject-Verb Agreement)",
    category: "primary",
    badge: "Kiểm tra ngữ pháp nền tảng",
    readingTime: "10 phút",
    summary: "Quy tắc chia số ít, số nhiều với các đại từ bất định, danh từ tập hợp, cấu trúc Either...or, Neither...nor, Not only...but also.",
    sections: [
      {
        heading: "1. Các trường hợp luôn chia động từ SỐ ÍT",
        content: `• Mỗi đại từ bất định: each, every, everyone, someone, nobody, nothing, anything -> Động từ số ít.
• Tên cuốn sách, môn học, tin tức (news, economics, physics, mathematics).
• Khoảng cách, thời gian, số tiền: Ten miles is a long distance; 500 dollars is too expensive.`,
      },
      {
        heading: "2. Cấu trúc chia theo chủ ngữ gần nhất",
        content: `• Either A or B + V(chia theo B).
• Neither A nor B + V(chia theo B).
• Not only A but also B + V(chia theo B).
  - Ví dụ: Neither the manager nor the employees are in favor of the new overtime policy.`,
      },
    ],
    exercises: [
      {
        question: "Each of the participants ______ a commemorative certificate upon completion of the course.",
        options: ["A. receive", "B. receives", "C. receiving", "D. have received"],
        answer: "B",
        explanation: "Chủ ngữ là 'Each of...' luôn chia động từ số ít ở thì hiện tại đơn -> 'receives'.",
      },
    ],
  },
];
