const TelegramBot = require('node-telegram-bot-api');
const { all, run } = require('./db');

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL || 'https://leadplay.app';

let bot = null;

if (token && token.trim() !== '') {
  try {
    bot = new TelegramBot(token, { polling: true });
    console.log('[Telegram Bot] Bot polling service started!');

    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from.first_name || 'Разработчик';

      // Store user profile in DB
      await run(`
        INSERT INTO user_profiles (telegram_id, updated_at)
        VALUES (?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET updated_at = excluded.updated_at
      `, [String(chatId), new Date().toISOString()]);

      const welcomeMessage = `👋 Привет, ${firstName}!\n\n` +
        `🤖 **LeadPlay Bot** непрерывно мониторит новые заказы на **Playable Ads**, **HTML5-баннеры** и **интерактивную рекламу**.\n\n` +
        `Я буду присылать вам свежие заказы сюда, а в Mini App вы можете отслеживать их по этапам воронки!`;

      bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Открыть LeadPlay App', web_app: { url: miniAppUrl } }]
          ]
        }
      });
    });
  } catch (err) {
    console.error('[Telegram Bot] Initialization error:', err.message);
  }
} else {
  console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN not set in .env. Bot notifications running in simulation mode.');
}

async function notifyUsersAboutNewLeads(newLeads = []) {
  if (!bot || newLeads.length === 0) return;

  try {
    const users = await all('SELECT telegram_id FROM user_profiles');
    if (users.length === 0) return;

    for (const user of users) {
      const chatId = user.telegram_id;

      for (const lead of newLeads) {
        if (lead.score < 75) continue; // Only notify high matching leads

        const isNotified = await all('SELECT 1 FROM notified_leads WHERE telegram_id = ? AND lead_id = ?', [chatId, lead.id]);
        if (isNotified.length > 0) continue;

        const tagsStr = Array.isArray(lead.tags) ? lead.tags.join(', ') : (lead.tags || '');
        const text = `🔥 **Новый подходящий заказ (${lead.score}% совпадение)**\n\n` +
          `📌 **${lead.title}**\n` +
          `💰 **Бюджет:** ${lead.budget}\n` +
          `🌐 **Источник:** ${lead.source}\n` +
          `🏷️ **Теги:** ${tagsStr}\n\n` +
          `${lead.description.substring(0, 200)}...\n\n` +
          `🔗 [Открыть оригинал объявления](${lead.url})`;

        await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Открыть в LeadPlay', web_app: { url: miniAppUrl } }]
            ]
          }
        });

        await run(`
          INSERT INTO notified_leads (telegram_id, lead_id, sent_at)
          VALUES (?, ?, ?)
        `, [chatId, lead.id, new Date().toISOString()]);
      }
    }
  } catch (err) {
    console.error('[Telegram Bot] Notification error:', err.message);
  }
}

module.exports = {
  bot,
  notifyUsersAboutNewLeads
};
