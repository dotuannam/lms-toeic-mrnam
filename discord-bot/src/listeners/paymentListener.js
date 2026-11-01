import { listenCollection } from "../config/firebase.js";
import { buildAlertEmbed } from "../utils/embedBuilder.js";
import { formatVND, formatDateTimeVN } from "../utils/formatters.js";
import { notifyAdminAndChannel } from "../utils/notifier.js";
import config from "../config/env.js";

/**
 * Start listening to new financial payments in real-time
 */
export const startPaymentListener = (client) => {
  const channelId = config.discord.channels.alerts;

  console.log(`🎧 [PaymentListener] Watching ledger transactions (Broadcasting to channel & Admin DM)...`);

  return listenCollection(
    "ledger",
    async (txData) => {
      // We only alert on income (tuition payments) or significant transactions
      if (txData.type !== "income") return;

      try {
        const embed = buildAlertEmbed(
          "success",
          "GIAO DỊCH THU TIỀN MỚI THÀNH CÔNG",
          `Hệ thống vừa ghi nhận một khoản thu mới vào quỹ trung tâm:`,
          [
            {
              name: "💵 Số tiền",
              value: `**${formatVND(txData.amount)}**`,
              inline: true,
            },
            {
              name: "💳 Phương thức",
              value: `\`${txData.paymentMethod || "Chuyển khoản"}\``,
              inline: true,
            },
            {
              name: "📝 Nội dung",
              value: txData.description || txData.category || "Thu học phí",
              inline: false,
            },
            {
              name: "👤 Người phụ trách / Người tạo",
              value: txData.createdBy || "Admin",
              inline: true,
            },
            {
              name: "⏰ Thời gian",
              value: formatDateTimeVN(txData.createdAt || Date.now()),
              inline: true,
            },
          ]
        );

        await notifyAdminAndChannel(client, channelId, { embeds: [embed] });
      } catch (err) {
        console.error("[PaymentListener] Error dispatching payment alert:", err);
      }
    },
    { orderByField: "createdAt", limitCount: 5 }
  );
};

export default {
  startPaymentListener,
};
