import dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_API_KEY;
if (!token) {
  throw new Error('TELEGRAM_API_KEY is not set in .env');
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Hello');
});
