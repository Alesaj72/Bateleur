import dotenv from 'dotenv';
dotenv.config();
import { Telegraf } from 'telegraf';
import { Agentkit } from "@0xgasless/agentkit";
// Store user sessions in memory (per bot session)
const userSessions = new Map();
// Helper function to get or create AgentKit instance for active wallet
async function getOrCreateAgentKit(userId) {
    const session = getUserSession(userId);
    const activeWallet = getActiveWallet(userId);
    if (!activeWallet) {
        return null;
    }
    // If we already have an AgentKit instance for this session, return it
    if (session.agentkit) {
        return session.agentkit;
    }
    try {
        // Create new AgentKit instance with active wallet's private key
        const agentkit = await Agentkit.configureWithWallet({
            privateKey: activeWallet.privateKey,
            rpcUrl: process.env.RPC_URL,
            apiKey: process.env.API_KEY,
            chainID: Number(process.env.CHAIN_ID) || 43114,
        });
        // Store in session for reuse
        session.agentkit = agentkit;
        return agentkit;
    }
    catch (error) {
        console.error('Error creating AgentKit instance:', error);
        return null;
    }
}
// Helper function to reset AgentKit when wallet changes
function resetAgentKit(userId) {
    const session = getUserSession(userId);
    delete session.agentkit;
}
// Helper function to execute AgentKit operations safely
async function executeWithAgentKit(userId, operation) {
    try {
        const agentkit = await getOrCreateAgentKit(userId);
        if (!agentkit) {
            return { success: false, error: "No active wallet or AgentKit initialization failed" };
        }
        const result = await operation(agentkit);
        return { success: true, result };
    }
    catch (error) {
        console.error('AgentKit operation error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
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
    // Handle duplicate names by adding a number
    let finalName = wallet.name;
    let counter = 1;
    while (session.wallets.some(w => w.name === finalName)) {
        finalName = `${wallet.name} (${counter})`;
        counter++;
    }
    const walletToAdd = { ...wallet, name: finalName };
    session.wallets.push(walletToAdd);
    // Auto-select the new wallet as active and reset AgentKit
    session.activeWalletIndex = session.wallets.length - 1;
    resetAgentKit(userId);
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
        // Reset AgentKit when switching wallets
        resetAgentKit(userId);
        return true;
    }
    return false;
}
const token = process.env.TELEGRAM_API_KEY;
if (!token) {
    throw new Error('TELEGRAM_API_KEY is not set in .env');
}
const DEFAULT_CODESPACE_URL = 'https://opulent-giggle-57wrvw55ww9cvxxq-3000.app.github.dev/';
const walletManagerUrl = process.env.WALLET_MANAGER_URL || DEFAULT_CODESPACE_URL;
if (!walletManagerUrl) {
    throw new Error('WALLET_MANAGER_URL is not set in .env and no default Codespaces URL is available. Please set it to your mini app URL, e.g. https://localhost:3000 or your Codespaces URL.');
}
const bot = new Telegraf(token);
console.log('Bot started successfully with Telegraf');
// Set the menu button for all users to open the mini app
bot.telegram.setChatMenuButton({
    type: 'web_app',
    text: 'Menu',
    web_app: { url: walletManagerUrl }
});
bot.command('start', (ctx) => {
    console.log('/start command received');
    const summary = `Welcome to Bateleur!\n\nThis Telegram bot lets you manage your blockchain assets and transactions easily, powered by 0xGasless.\n\nMain features:\n• Smart account (gasless wallet) management\n• Address and balance queries\n• Gasless transfers and swaps\n• Natural language commands\n\n💡 **Quick commands:**\n• Type "wallet" or "wallets" to manage your wallets\n• Use /agentkit to test 0xGasless integration\n• Send natural language instructions for transactions\n\nInfrastructure powered by 0xGasless 🚀`;
    ctx.reply(summary, {
        reply_markup: {
            inline_keyboard: [[
                    { text: "🔐 Create or Import Wallet", callback_data: "open_wallet_manager" }
                ]]
        },
        parse_mode: 'Markdown'
    }).then(() => {
        console.log('Message with inline keyboard sent successfully');
    }).catch((err) => {
        console.log('Error sending message:', err);
    });
});
// Handle natural language wallet management
bot.on('text', (ctx) => {
    const text = ctx.message.text.toLowerCase().trim();
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const session = getUserSession(userId);
    // Handle wallet/wallets commands naturally
    if (text === 'wallet' || text === 'wallets' || text === 'mes wallets' || text === 'mon wallet' ||
        text === 'portefeuille' || text === 'mes portefeuilles' || text === 'manage wallets' ||
        text === 'wallet management' || text === 'gestion wallet') {
        if (session.wallets.length === 0) {
            ctx.reply("You don't have any wallets yet. Create or import one first:", {
                reply_markup: {
                    inline_keyboard: [[
                            { text: "🔐 Create/Import Wallet", callback_data: "open_wallet_manager" }
                        ]]
                }
            });
        }
        else {
            const activeWallet = getActiveWallet(userId);
            const activeText = activeWallet
                ? `**Active Wallet:** ${activeWallet.name}\nAddress: \`${activeWallet.address}\``
                : "No wallet is currently active.";
            const walletButtons = session.wallets.map((wallet, index) => [{
                    text: `${index === session.activeWalletIndex ? '✅ ' : ''}${wallet.name}`,
                    callback_data: `select_wallet_${index}`
                }]);
            walletButtons.push([
                { text: "➕ Add New Wallet", callback_data: "open_wallet_manager" }
            ]);
            ctx.reply(`🔐 **Wallet Management**\n\n${activeText}\n\nSelect a wallet to make it active:`, {
                reply_markup: { inline_keyboard: walletButtons },
                parse_mode: 'Markdown'
            });
        }
        return;
    }
});
bot.command('wallets', (ctx) => {
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const session = getUserSession(userId);
    if (session.wallets.length === 0) {
        ctx.reply("You don't have any wallets yet. Create or import one first:", {
            reply_markup: {
                inline_keyboard: [[
                        { text: "🔐 Create/Import Wallet", callback_data: "open_wallet_manager" }
                    ]]
            }
        });
    }
    else {
        const activeWallet = getActiveWallet(userId);
        const activeText = activeWallet
            ? `**Active Wallet:** ${activeWallet.name}\nAddress: \`${activeWallet.address}\``
            : "No wallet is currently active.";
        const walletButtons = session.wallets.map((wallet, index) => [{
                text: `${index === session.activeWalletIndex ? '✅ ' : ''}${wallet.name}`,
                callback_data: `select_wallet_${index}`
            }]);
        walletButtons.push([
            { text: "➕ Add New Wallet", callback_data: "open_wallet_manager" }
        ]);
        ctx.reply(`🔐 **Wallet Management**\n\n${activeText}\n\nSelect a wallet to make it active:`, {
            reply_markup: { inline_keyboard: walletButtons },
            parse_mode: 'Markdown'
        });
    }
});
// Add command to test 0xGasless integration
bot.command('agentkit', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId)
        return;
    ctx.reply("🔧 Initializing 0xGasless AgentKit with your active wallet...");
    try {
        const agentkit = await getOrCreateAgentKit(userId);
        if (!agentkit) {
            ctx.reply("❌ No active wallet found. Please create or select a wallet first.");
            return;
        }
        const activeWallet = getActiveWallet(userId);
        if (!activeWallet) {
            ctx.reply("❌ No active wallet found.");
            return;
        }
        ctx.reply(`✅ **0xGasless AgentKit Ready!**\n\n` +
            `🔐 **Active Wallet:** ${activeWallet.name}\n` +
            `📍 **Address:** \`${activeWallet.address}\`\n` +
            `🔗 **Chain ID:** ${process.env.CHAIN_ID || '43114'}\n\n` +
            `The AgentKit is now configured with your wallet's private key and ready to perform gasless transactions!`, { parse_mode: 'Markdown' });
    }
    catch (error) {
        console.error('Error testing AgentKit:', error);
        ctx.reply("❌ Error initializing AgentKit. Please check your configuration.");
    }
});
// Handle callback queries (button clicks)
bot.on('callback_query', (ctx) => {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery))
        return;
    console.log('Callback query received');
    console.log('Query data:', callbackQuery.data);
    console.log('Query ID:', callbackQuery.id);
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const session = getUserSession(userId);
    // Answer the callback query to remove loading state
    ctx.answerCbQuery("Processing...")
        .catch((err) => console.log('Error answering callback query:', err));
    const chatId = ctx.chat?.id;
    if (!chatId)
        return;
    if (callbackQuery.data === 'open_wallet_manager') {
        console.log('Sending keyboard button to chat:', chatId);
        ctx.reply("🔐 Use the button below to open the wallet manager:", {
            reply_markup: {
                keyboard: [[{ text: "Open Wallet Manager", web_app: { url: walletManagerUrl } }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        }).then(() => {
            console.log('✅ Keyboard button sent successfully');
        }).catch((err) => {
            console.log('❌ Error sending keyboard button:', err);
        });
    }
    else if (callbackQuery.data === 'manage_wallets') {
        if (session.wallets.length === 0) {
            ctx.reply("You don't have any wallets yet. Create or import one first:", {
                reply_markup: {
                    inline_keyboard: [[
                            { text: "🔐 Create/Import Wallet", callback_data: "open_wallet_manager" }
                        ]]
                }
            });
        }
        else {
            const activeWallet = getActiveWallet(userId);
            const activeText = activeWallet
                ? `**Active Wallet:** ${activeWallet.name}\nAddress: \`${activeWallet.address}\``
                : "No wallet is currently active.";
            const walletButtons = session.wallets.map((wallet, index) => [{
                    text: `${index === session.activeWalletIndex ? '✅ ' : ''}${wallet.name}`,
                    callback_data: `select_wallet_${index}`
                }]);
            walletButtons.push([
                { text: "➕ Add New Wallet", callback_data: "open_wallet_manager" }
            ]);
            ctx.reply(`🔐 **Wallet Management**\n\n${activeText}\n\nSelect a wallet to make it active:`, {
                reply_markup: { inline_keyboard: walletButtons },
                parse_mode: 'Markdown'
            });
        }
    }
    else if (callbackQuery.data?.startsWith('select_wallet_')) {
        const parts = callbackQuery.data.split('_');
        const walletIndex = parseInt(parts[2] || '0');
        if (setActiveWallet(userId, walletIndex)) {
            const activeWallet = getActiveWallet(userId);
            ctx.reply(`✅ **Wallet activated**\n\n**${activeWallet?.name}**\nAddress: \`${activeWallet?.address}\`\n\nYou can now use this wallet for transactions.`, {
                parse_mode: 'Markdown'
            });
        }
        else {
            ctx.reply("❌ Error selecting wallet. Please try again.");
        }
    }
});
// Handle WebApp data from wallet manager
bot.on('web_app_data', (ctx) => {
    console.log('===== WEB APP DATA RECEIVED =====');
    console.log('User ID:', ctx.from?.id);
    console.log('Data:', ctx.webAppData?.data);
    console.log('===================================');
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const chatId = ctx.chat.id;
    try {
        const dataStr = typeof ctx.webAppData?.data === 'string' ? ctx.webAppData.data : ctx.webAppData?.data?.text() || '{}';
        const data = JSON.parse(dataStr);
        if (data.type === 'wallet_created' && data.wallet) {
            const wallet = data.wallet;
            addWalletToSession(userId, wallet);
            const session = getUserSession(userId);
            const walletIndex = session.wallets.length - 1; // Get the index of the just-added wallet
            if (walletIndex >= 0) {
                setActiveWallet(userId, walletIndex);
                ctx.reply(`✅ **Wallet added successfully!**\n\n**${wallet.name}**\nAddress: \`${wallet.address}\`\n\nThis wallet is now active and ready to use.`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                                { text: "🔐 Manage Wallets", callback_data: "manage_wallets" }
                            ]]
                    }
                });
            }
            else {
                ctx.reply("❌ Error adding wallet to session. Please try again.");
            }
        }
    }
    catch (error) {
        console.error('Error processing WebApp data:', error);
        ctx.reply("❌ Error processing wallet data. Please try again.");
    }
});
// Catch all events for debugging
bot.catch((err) => {
    console.log('Bot error:', err);
});
bot.hears(/create|import wallet/i, (ctx) => {
    // Step 1: Send info message
    ctx.reply("To manage your wallet, please use the button below.");
    // Step 2: Send a message with the keyboard attached
    ctx.reply("Open the wallet manager below:", {
        reply_markup: {
            keyboard: [[{ text: "Open Wallet Manager", web_app: { url: walletManagerUrl } }]],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});
// Launch the bot
bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
//# sourceMappingURL=bot.js.map