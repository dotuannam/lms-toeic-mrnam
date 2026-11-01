import { REST, Routes } from "discord.js";
import config from "../src/config/env.js";
import { initFirebase, fetchCollectionDocs } from "../src/config/firebase.js";

console.log("=================================================");
console.log("🔍 KIỂM TRA KẾT NỐI HỆ THỐNG LMS & DISCORD");
console.log("=================================================");

const test = async () => {
  let hasError = false;

  // 1. Check Discord Token
  console.log("\n1️⃣ Kiểm tra Token Discord Bot...");
  if (!config.discord.token) {
    console.error("❌ DISCORD_BOT_TOKEN chưa được thiết lập trong .env!");
    hasError = true;
  } else {
    try {
      const rest = new REST({ version: "10" }).setToken(config.discord.token);
      const user = await rest.get(Routes.user("@me"));
      console.log(`✅ Kết nối Discord thành công! Tên Bot: ${user.username}#${user.discriminator} (ID: ${user.id})`);
    } catch (err) {
      console.error("❌ Token Discord không hợp lệ hoặc hết hạn:", err.message);
      hasError = true;
    }
  }

  // 2. Check Firebase / Firestore
  console.log("\n2️⃣ Kiểm tra kết nối Firestore LMS (auto-lms-43b1d)...");
  try {
    initFirebase();
    const testDocs = await fetchCollectionDocs("classes", { limitCount: 2 });
    console.log(`✅ Kết nối Firestore thành công! Tìm thấy ${testDocs.length} lớp học mẫu trong database.`);
  } catch (err) {
    console.error("❌ Không thể kết nối Firestore:", err.message);
    hasError = true;
  }

  // 3. Channels configuration check
  console.log("\n3️⃣ Kiểm tra Channels Discord đã cấu hình:");
  console.log(` • Kênh Audit Log:     ${config.discord.channels.auditLog || "⚠️ Chưa cấu hình"}`);
  console.log(` • Kênh Daily Reports: ${config.discord.channels.dailyReports || "⚠️ Chưa cấu hình"}`);
  console.log(` • Kênh Alerts:        ${config.discord.channels.alerts || "⚠️ Chưa cấu hình"}`);

  console.log("\n=================================================");
  if (hasError) {
    console.log("❌ KIỂM TRA THẤT BẠI: Vui lòng xem lại các lỗi ở trên.");
  } else {
    console.log("🎉 TẤT CẢ KẾT NỐI ĐỀU HOÀN HẢO! Bot sẵn sàng khởi chạy.");
    console.log("👉 Chạy: npm run deploy-commands để cập nhật Slash Commands.");
    console.log("👉 Chạy: npm start để khởi động Bot.");
  }
  console.log("=================================================\n");
  process.exit(hasError ? 1 : 0);
};

test();
