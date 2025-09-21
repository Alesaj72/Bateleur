import dotenv from 'dotenv';
dotenv.config();
import TelegramBot from 'node-telegram-bot-api';
// Store user sessions in memory (per bot session)
const userSessions = new Map();
// Helper functions for session management
function getUserSession(userId) {
    if (!userSessions.has(userId)) {
        userSessions.set(userId, {
            wallets: [],
            activeWalletIndex: -1
        });
    }
    return userSessions.get(userId);
}
function addWalletToSession(userId, wallet) {
    const session = getUserSession(userId);
    session.wallets.push(wallet);
    // Set as active if it's the first wallet
    if (session.wallets.length === 1) {
        session.activeWalletIndex = 0;
    }
}
function getActiveWallet(userId) {
    const session = getUserSession(userId);
    if (session.activeWalletIndex >= 0 && session.activeWalletIndex < session.wallets.length) {
        return session.wallets[session.activeWalletIndex] || null;
    }
    return null;
}
function setActiveWallet(userId, walletIndex) {
    const session = getUserSession(userId);
    if (walletIndex >= 0 && walletIndex < session.wallets.length) {
        session.activeWalletIndex = walletIndex;
        return true;
    }
    return false;
}
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
    const summary = `Welcome to Bateleur!\n\nThis Telegram bot lets you manage your blockchain assets and transactions easily, powered by 0xGasless.\n\nMain features:\n• Smart account (gasless wallet) management\n• Address and balance queries\n• Gasless transfers and swaps\n• Natural language commands\n\n💡 **Quick commands:**\n• Type "wallet" or "wallets" to manage your wallets\n• Send natural language instructions for transactions\n\nInfrastructure powered by 0xGasless 🚀`;
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
// Handle natural language wallet management
bot.on('message', (msg) => {
    if (!msg.text)
        return;
    const text = msg.text.toLowerCase().trim();
    const userId = msg.from?.id;
    if (!userId)
        return;
    // Handle wallet/wallets commands naturally
    if (text === 'wallet' || text === 'wallets' || text === 'mes wallets' || text === 'mon wallet' ||
        text === 'portefeuille' || text === 'mes portefeuilles' || text === 'manage wallets' ||
        text === 'wallet management' || text === 'gestion wallet') {
        console.log('Natural wallet command received:', text);
        const session = getUserSession(userId);
        if (session.wallets.length === 0) {
            bot.sendMessage(msg.chat.id, "You don't have any wallets yet. Create or import one first:", {
                reply_markup: {
                    inline_keyboard: [[
                            { text: "🔐 Create/Import Wallet", callback_data: "open_wallet_manager" }
                        ]]
                }
            });
        }
        else {
            // Show wallet selection menu
            const walletButtons = session.wallets.map((wallet, index) => [{
                    text: `${index === session.activeWalletIndex ? '✅ ' : ''}${wallet.name} (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)})`,
                    callback_data: `select_wallet_${index}`
                }]);
            walletButtons.push([
                { text: "➕ Add New Wallet", callback_data: "open_wallet_manager" }
            ]);
            const activeWallet = getActiveWallet(userId);
            const activeText = activeWallet ? `Active: ${activeWallet.name}` : 'No active wallet';
            bot.sendMessage(msg.chat.id, `🔐 **Wallet Management**\n\n${activeText}\n\nSelect a wallet to make it active:`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: walletButtons
                }
            });
        }
        return;
    }
    // Log other messages for potential MCP processing
    console.log('Message received:', msg.text);
});
bot.onText(/\/wallets/, (msg) => {
    console.log('/wallets command received');
    const userId = msg.from?.id;
    if (!userId)
        return;
    const session = getUserSession(userId);
    if (session.wallets.length === 0) {
        bot.sendMessage(msg.chat.id, "You don't have any wallets yet. Create or import one first:", {
            reply_markup: {
                inline_keyboard: [[
                        { text: "🔐 Create/Import Wallet", callback_data: "open_wallet_manager" }
                    ]]
            }
        });
    }
    else {
        // Show wallet selection menu
        const walletButtons = session.wallets.map((wallet, index) => [{
                text: `${index === session.activeWalletIndex ? '✅ ' : ''}${wallet.name} (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)})`,
                callback_data: `select_wallet_${index}`
            }]);
        walletButtons.push([
            { text: "➕ Add New Wallet", callback_data: "open_wallet_manager" }
        ]);
        const activeWallet = getActiveWallet(userId);
        const activeText = activeWallet ? `Active: ${activeWallet.name}` : 'No active wallet';
        bot.sendMessage(msg.chat.id, `🔐 **Wallet Management**\n\n${activeText}\n\nSelect a wallet to make it active:`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: walletButtons
            }
        });
    }
});
// Handle inline button press to show keyboard button
bot.on('callback_query', (query) => {
    console.log('===== CALLBACK QUERY RECEIVED =====');
    console.log('Query data:', query.data);
    console.log('Query ID:', query.id);
    console.log('User ID:', query.from.id);
    console.log('=====================================');
    const userId = query.from.id;
    // Answer the callback query immediately
    bot.answerCallbackQuery(query.id, { text: "Processing..." })
        .then(() => console.log('Callback query answered'))
        .catch(err => console.log('Error answering callback query:', err));
    if (!query.message)
        return;
    const chatId = query.message.chat.id;
    if (query.data === 'open_wallet_manager') {
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
    else if (query.data === 'manage_wallets') {
        const session = getUserSession(userId);
        if (session.wallets.length === 0) {
            bot.sendMessage(chatId, "You don't have any wallets yet. Create or import one first:", {
                reply_markup: {
                    inline_keyboard: [[
                            { text: "🔐 Create/Import Wallet", callback_data: "open_wallet_manager" }
                        ]]
                }
            });
        }
        else {
            // Show wallet selection menu
            const walletButtons = session.wallets.map((wallet, index) => [{
                    text: `${index === session.activeWalletIndex ? '✅ ' : ''}${wallet.name} (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)})`,
                    callback_data: `select_wallet_${index}`
                }]);
            walletButtons.push([
                { text: "➕ Add New Wallet", callback_data: "open_wallet_manager" }
            ]);
            const activeWallet = getActiveWallet(userId);
            const activeText = activeWallet ? `Active: ${activeWallet.name}` : 'No active wallet';
            bot.sendMessage(chatId, `🔐 **Wallet Management**\n\n${activeText}\n\nSelect a wallet to make it active:`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: walletButtons
                }
            });
        }
    }
    else if (query.data?.startsWith('select_wallet_')) {
        const parts = query.data.split('_');
        const walletIndex = parts[2] ? parseInt(parts[2]) : -1;
        if (walletIndex >= 0 && setActiveWallet(userId, walletIndex)) {
            const activeWallet = getActiveWallet(userId);
            bot.sendMessage(chatId, `✅ **Wallet activated**\n\n**${activeWallet?.name}**\nAddress: \`${activeWallet?.address}\`\n\nYou can now use this wallet for transactions.`, {
                parse_mode: 'Markdown'
            });
        }
        else {
            bot.sendMessage(chatId, "❌ Error selecting wallet. Please try again.");
        }
    }
});
// Handle WebApp data from wallet manager
bot.on('web_app_data', (msg) => {
    console.log('===== WEB APP DATA RECEIVED =====');
    console.log('User ID:', msg.from?.id);
    console.log('Data:', msg.web_app_data?.data);
    console.log('===================================');
    const userId = msg.from?.id;
    if (!userId)
        return;
    const chatId = msg.chat.id;
    try {
        const data = JSON.parse(msg.web_app_data?.data || '{}');
        if (data.type === 'wallet_created' && data.wallet) {
            const wallet = data.wallet;
            addWalletToSession(userId, wallet);
            const session = getUserSession(userId);
            const walletIndex = session.wallets.length - 1; // Get the index of the just-added wallet
            if (walletIndex >= 0) {
                setActiveWallet(userId, walletIndex);
                bot.sendMessage(chatId, `✅ **Wallet added successfully!**\n\n**${wallet.name}**\nAddress: \`${wallet.address}\`\n\nThis wallet is now active and ready to use.`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                                { text: "🔐 Manage Wallets", callback_data: "manage_wallets" }
                            ]]
                    }
                });
            }
            else {
                bot.sendMessage(chatId, "❌ Error adding wallet to session. Please try again.");
            }
        }
    }
    catch (error) {
        console.error('Error processing WebApp data:', error);
        bot.sendMessage(chatId, "❌ Error processing wallet data. Please try again.");
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