import dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_API_KEY;
if (!token) {
  throw new Error('TELEGRAM_API_KEY is not set in .env');
}



const DEFAULT_CODESPACE_URL = 'https://3000-sturdy-pancake-xgjprjx45xw3vv47.github.dev/';
const walletManagerUrl = process.env.WALLET_MANAGER_URL || DEFAULT_CODESPACE_URL;
if (!walletManagerUrl) {
  throw new Error('WALLET_MANAGER_URL is not set in .env and no default Codespaces URL is available. Please set it to your mini app URL, e.g. https://localhost:3000 or your Codespaces URL.');
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const summary = `Welcome to Bateleur!\n\nThis Telegram bot lets you manage your blockchain assets and transactions easily, powered by 0xGasless.\n\nMain features:\n• Smart account (gasless wallet) management\n• Address and balance queries\n• Gasless transfers and swaps\n• Natural language commands (no need for /command)\n\nJust send your instructions in plain English!\n\nInfrastructure powered by 0xGasless 🚀`;
  bot.sendMessage(msg.chat.id, summary);
});

bot.onText(/create|import wallet/i, (msg) => {
  // Step 1: Send info message
  bot.sendMessage(msg.chat.id, "To manage your wallet, please use the button below.");
  // Step 2: Send a message with the keyboard attached
  bot.sendMessage(msg.chat.id, "Open the wallet manager below:", {
    reply_markup: {
      keyboard: [[{ text: "Open Wallet Manager", web_app: { url: walletManagerUrl } }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});
