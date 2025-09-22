import dotenv from 'dotenv';
dotenv.config();

import { Telegraf } from 'telegraf';
import { Agentkit } from "@0xgasless/agentkit";

// User session management - SECURE VERSION: No private keys stored on server
interface WalletInfo {
  address: string;
  name: string;
  // 🔐 SECURITY: privateKey and mnemonic are NEVER stored on server
}

interface UserSession {
  wallets: WalletInfo[];
  activeWalletIndex: number;
  // 🔐 SECURITY: No AgentKit instance stored (no private keys available)
}

// Store user sessions in memory (per bot session) - ONLY PUBLIC DATA
const userSessions = new Map<number, UserSession>();

// Helper functions for session management
function getUserSession(userId: number): UserSession {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      wallets: [],
      activeWalletIndex: -1
    });
  }
  return userSessions.get(userId)!;
}

function addWalletToSession(userId: number, wallet: WalletInfo): void {
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
  
  // Auto-select the new wallet as active
  session.activeWalletIndex = session.wallets.length - 1;
  // 🔐 SECURITY: No AgentKit to reset (no private keys stored)
}

function getActiveWallet(userId: number): WalletInfo | null {
  const session = getUserSession(userId);
  if (session.activeWalletIndex >= 0 && session.activeWalletIndex < session.wallets.length) {
    return session.wallets[session.activeWalletIndex] || null;
  }
  return null;
}

function setActiveWallet(userId: number, walletIndex: number): boolean {
  const session = getUserSession(userId);
  if (walletIndex >= 0 && walletIndex < session.wallets.length) {
    session.activeWalletIndex = walletIndex;
    // 🔐 SECURITY: No AgentKit to reset (no private keys stored)
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
} as any);

bot.command('start', (ctx) => {
  console.log('/start command received');
  const summary = `Welcome to Bateleur!\n\nThis Telegram bot lets you manage your blockchain assets and transactions easily, powered by 0xGasless.\n\n🔐 **SECURE ARCHITECTURE:**\n• Your private keys NEVER leave your device\n• Server only stores public addresses\n• Maximum security guaranteed\n\nMain features:\n• Smart account (gasless wallet) management\n• Address and balance queries\n• Gasless transfers and swaps\n• Natural language commands\n\n💡 **Quick commands:**\n• Type "wallet" or "wallets" to manage your wallets\n• Use /security to learn about our security model\n• Send natural language instructions for transactions\n\nInfrastructure powered by 0xGasless 🚀`;
  
  ctx.reply(summary, {
    reply_markup: {
      inline_keyboard: [[
        { text: "🔐 Create or Import Wallet", callback_data: "open_wallet_manager" }
      ]]
    },
    parse_mode: 'Markdown'
  }).then(() => {
    console.log('Message with inline keyboard sent successfully');
  }).catch((err: any) => {
    console.log('Error sending message:', err);
  });
});

// Handle natural language wallet management
bot.on('text', (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();
  const userId = ctx.from?.id;
  if (!userId) return;

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
    } else {
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
  if (!userId) return;

  const session = getUserSession(userId);
  
  if (session.wallets.length === 0) {
    ctx.reply("You don't have any wallets yet. Create or import one first:", {
      reply_markup: {
        inline_keyboard: [[
          { text: "🔐 Create/Import Wallet", callback_data: "open_wallet_manager" }
        ]]
      }
    });
  } else {
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

// Command to explain secure architecture
bot.command('security', async (ctx) => {
  const securityInfo = `🔐 **Bateleur Security Architecture**\n\n` +
    `✅ **Your private keys are NEVER stored on our servers**\n` +
    `✅ **Private keys remain only on your device**\n` +
    `✅ **Server only stores public addresses**\n\n` +
    `🛡️ **How it works:**\n` +
    `• Wallet creation/import happens in your browser\n` +
    `• Only public address is sent to bot\n` +
    `• Transactions are signed locally on your device\n` +
    `• Maximum security, even if server is compromised\n\n` +
    `For 0xGasless integration, private key signing will be handled client-side.`;
  
  ctx.reply(securityInfo, { parse_mode: 'Markdown' });
});

// Handle callback queries (button clicks)
bot.on('callback_query', (ctx) => {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) return;
  
  console.log('Callback query received');
  console.log('Query data:', callbackQuery.data);
  console.log('Query ID:', callbackQuery.id);
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const session = getUserSession(userId);
  
  // Answer the callback query to remove loading state
  ctx.answerCbQuery("Processing...")
    .catch((err: any) => console.log('Error answering callback query:', err));
  
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  
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
    }).catch((err: any) => {
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
    } else {
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
    } else {
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
  if (!userId) return;
  
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
      } else {
        ctx.reply("❌ Error adding wallet to session. Please try again.");
      }
    }
  } catch (error) {
    console.error('Error processing WebApp data:', error);
    ctx.reply("❌ Error processing wallet data. Please try again.");
  }
});

// Catch all events for debugging
bot.catch((err: any) => {
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