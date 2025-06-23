import TelegramBot from "node-telegram-bot-api";

export const helpScreenHandler = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  const caption =
    `<b>GrowTradeBot Commands</b>\n\n` +
    `/start - Welcome screen\n` +
    `/position - View your open positions\n` +
    `/settings - Configure trading settings\n\n` +
    `Paste a contract address at any time to trade.`;

  await bot.sendMessage(msg.chat.id, caption, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
};
