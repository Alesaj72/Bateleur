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
const bot = new TelegramBot(token, {
    polling: {
        params: {
            allowed_updates: ["message", "callback_query"]
        }
    }
});
console.log('Bot started successfully, polling enabled with callback_query support');
// Basic message handler to test bot connectivity
bot.on('message', (msg) => {
    console.log('Message received:', msg.text);
});
// Set the menu button for all users to open the mini app
bot.setChatMenuButton({
    type: 'web_app',
    text: 'Menu',
    web_app: { url: walletManagerUrl }
});
bot.onText(/\/start/, (msg) => {
    console.log('/start command received');
    const summary = `Welcome to Bateleur!\n\nThis Telegram bot lets you manage your blockchain assets and transactions easily, powered by 0xGasless.\n\nMain features:\n• Smart account (gasless wallet) management\n• Address and balance queries\n• Gasless transfers and swaps\n• Natural language commands (no need for /command)\n\nJust send your instructions in plain English!\n\nInfrastructure powered by 0xGasless 🚀`;
    bot.sendMessage(msg.chat.id, summary, {
        reply_markup: {
            inline_keyboard: [[
                    { text: "🔐 Create or Import Wallet", callback_data: "open_wallet_manager" }
                ]]
        }
    }).then(() => {
        console.log('Message with inline keyboard sent successfully');
    }).catch(err => {
        console.log('Error sending message:', err);
    });
});
// Handle inline button press to show keyboard button
bot.on('callback_query', (query) => {
    console.log('===== CALLBACK QUERY RECEIVED =====');
    console.log('Query data:', query.data);
    console.log('Query ID:', query.id);
    console.log('User ID:', query.from.id);
    console.log('=====================================');
    // Answer the callback query immediately
    bot.answerCallbackQuery(query.id, { text: "Processing..." })
        .then(() => console.log('Callback query answered'))
        .catch(err => console.log('Error answering callback query:', err));
    if (query.data === 'open_wallet_manager' && query.message) {
        const chatId = query.message.chat.id;
        console.log('Sending keyboard button to chat:', chatId);
        bot.sendMessage(chatId, "🔐 Use the button below to open the wallet manager:", {
            reply_markup: {
                keyboard: [[{ text: "🔐 Open Wallet Manager", web_app: { url: walletManagerUrl } }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        }).then(() => {
            console.log('✅ Keyboard button sent successfully');
        }).catch((err) => {
            console.log('❌ Error sending keyboard button:', err);
        });
    }
});
// Catch all events for debugging
bot.on('polling_error', (error) => {
    console.log('Polling error:', error);
});
bot.on('error', (error) => {
    console.log('Bot error:', error);
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
//# sourceMappingURL=bot.js.map