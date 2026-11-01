import { REST, Routes } from "discord.js";
import config, { validateEnv } from "../src/config/env.js";
import { getCommandsJSON } from "../src/commands/index.js";

console.log("=================================================");
console.log("📡 ĐĂNG KÝ SLASH COMMANDS LÊN DISCORD API");
console.log("=================================================");

try {
  validateEnv(true);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const commands = getCommandsJSON();
const rest = new REST({ version: "10" }).setToken(config.discord.token);

const deploy = async () => {
  try {
    console.log(`Đang đồng bộ ${commands.length} slash commands...`);

    if (config.discord.guildId) {
      // Guild commands update INSTANTLY (Great for quick setup & testing)
      console.log(`Đang đăng ký Guild Commands cho Server ID: ${config.discord.guildId}...`);
      const data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      console.log(`✅ Thành công! Đã đăng ký ${data.length} commands vào Server ngay lập tức!`);
    } else {
      // Global commands
      console.log("Đang đăng ký Global Commands (Có thể mất tối đa 1 tiếng để Discord cập nhật toàn cầu)...");
      const data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      console.log(`✅ Thành công! Đã đăng ký ${data.length} global commands.`);
    }

    console.log("\nDanh sách lệnh đã triển khai:");
    commands.forEach((c) => console.log(` • /${c.name}: ${c.description}`));
  } catch (error) {
    console.error("❌ Lỗi khi đăng ký commands:", error);
  }
};

deploy();
