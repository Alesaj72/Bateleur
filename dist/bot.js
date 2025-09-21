import dotenv from 'dotenv';
dotenv.config();
import TelegramBot from 'node-telegram-bot-api';
const token = process.env.TELEGRAM_API_KEY;
if (!token) {
    throw new Error('TELEGRAM_API_KEY is not set in .env');
}
const bot = new TelegramBot(token, { polling: true });
bot.onText(/\/start/, (msg) => {
    const summary = `Welcome to Bateleur!\n\nThis Telegram bot lets you manage your blockchain assets and transactions easily, powered by 0xGasless.\n\nMain features:\n• Smart account (gasless wallet) management\n• Address and balance queries\n• Gasless transfers and swaps\n• Natural language commands (no need for /command)\n\nJust send your instructions in plain English!\n\nInfrastructure powered by 0xGasless 🚀`;
    bot.sendMessage(msg.chat.id, summary);
});
//# sourceMappingURL=bot.js.map