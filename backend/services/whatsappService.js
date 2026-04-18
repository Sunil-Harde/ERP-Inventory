const twilio = require('twilio');

let client = null;

/**
 * Get env values at call time (not module load) to ensure dotenv has loaded.
 */
const getConfig = () => ({
  sid: process.env.TWILIO_ACCOUNT_SID,
  auth: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  to: process.env.ALERT_WHATSAPP_TO || '',
});

/**
 * Initialize the Twilio client (lazy — only when credentials exist).
 */
const getClient = () => {
  if (client) return client;
  const { sid, auth } = getConfig();
  if (!sid || !auth) {
    console.warn('[WhatsApp] Twilio credentials not configured — alerts disabled');
    return null;
  }
  client = twilio(sid, auth);
  return client;
};

/**
 * Send a WhatsApp message via Twilio.
 */
const sendWhatsAppMessage = async (to, body) => {
  const c = getClient();
  if (!c) return null;

  const { from } = getConfig();

  try {
    const msg = await c.messages.create({ from, to, body });
    console.log(`[WhatsApp] ✅ Message sent: ${msg.sid}`);
    return msg;
  } catch (err) {
    console.error(`[WhatsApp] ❌ Failed to send:`, err.message);
    return null;
  }
};

/**
 * Check if an item is below threshold and send a WhatsApp alert.
 * Prevents duplicate alerts using the alertSent flag.
 */
const checkAndAlertLowStock = async (item) => {
  const { to } = getConfig();

  // Skip if no recipient configured
  if (!to) {
    return false;
  }

  console.log(`[WhatsApp] Checking ${item.itemCode}: stock=${item.stock}, min=${item.minStock}, alertSent=${item.alertSent}`);

  // Stock is still above threshold — reset flag if it was set
  if (item.stock > item.minStock) {
    if (item.alertSent) {
      item.alertSent = false;
      await item.save();
      console.log(`[WhatsApp] Reset alertSent for ${item.itemCode} (stock replenished)`);
    }
    return false;
  }

  // Stock is low but alert already sent — skip
  if (item.alertSent) {
    console.log(`[WhatsApp] Skipping ${item.itemCode} — alert already sent`);
    return false;
  }

  // Build message
  const message = [
    `⚠️ *LOW STOCK ALERT*`,
    ``,
    `📦 *Item:* ${item.itemName}`,
    `🔖 *Code:* ${item.itemCode}`,
    `📉 *Available Stock:* ${item.stock} ${item.uom}`,
    `🎯 *Threshold:* ${item.minStock} ${item.uom}`,
    ``,
    `Please reorder immediately to avoid stockout.`,
    `— ERP Inventory System`,
  ].join('\n');

  console.log(`[WhatsApp] 🚨 Sending low stock alert for ${item.itemCode}...`);
  const result = await sendWhatsAppMessage(to, message);

  if (result) {
    item.alertSent = true;
    await item.save();
    return true;
  }

  return false;
};

module.exports = {
  sendWhatsAppMessage,
  checkAndAlertLowStock,
};
