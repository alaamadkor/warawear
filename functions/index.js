import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

function fillTemplate(template, data) {
  return template
    .replace(/\{orderId\}/g, data.orderId)
    .replace(/\{customerName\}/g, data.customerName)
    .replace(/\{customerPhone\}/g, data.customerPhone)
    .replace(/\{customerAddress\}/g, data.customerAddress)
    .replace(/\{paymentMethod\}/g, data.paymentMethod)
    .replace(/\{total\}/g, data.total)
    .replace(/\{items\}/g, data.items)
    .replace(/\{cancelReason\}/g, data.cancelReason)
    .replace(/\{returnReason\}/g, data.returnReason);
}

function buildItemsList(items) {
  return (items || []).map(i =>
    `• ${i.product.name} (${i.size} × ${i.quantity}) - ${(i.product.price * i.quantity).toLocaleString()} ج`
  ).join('\n');
}

const paymentLabels = {
  cash: '💰 كاش عند الاستلام',
  instapay: '💜 InstaPay',
  vodafone: '🔴 فودافون كاش',
};

async function sendWhatsAppMessage(token, phoneNumberId, to, message) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/^\+|^00/, ''),
      type: 'text',
      text: { body: message },
    }),
  });
  return response.json();
}

export const sendOrderToWhatsApp = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data.data();
  const orderId = event.params.orderId;

  // Read site settings from Firestore
  const settingsSnap = await db.doc('settings/site').get();
  const settings = settingsSnap.data() || {};

  const token = settings.whatsappBusinessToken;
  const phoneNumberId = settings.whatsappPhoneNumberId;

  if (!token || !phoneNumberId) {
    console.log('⚠️ WhatsApp Business API not configured — skipping');
    return;
  }

  const itemsList = buildItemsList(order.items);
  const paymentLabel = paymentLabels[order.paymentMethod] || order.paymentMethod;

  const templateData = {
    orderId,
    customerName: order.userName || '',
    customerPhone: order.phone || '',
    customerAddress: order.address || '',
    paymentMethod: paymentLabel,
    total: (order.total || 0).toLocaleString(),
    items: itemsList,
  };

  // Send to admin
  const adminNumber = settings.whatsappNotificationNumber || settings.whatsappNumber;
  if (adminNumber) {
    const adminMsg = fillTemplate(settings.adminNotifyTemplate || '', templateData);
    try {
      const result = await sendWhatsAppMessage(token, phoneNumberId, adminNumber, adminMsg);
      console.log('✅ Admin notification sent:', result);
    } catch (err) {
      console.error('❌ Admin notification failed:', err.message);
    }
  }

  // Send to customer
  const customerNumber = order.phone;
  if (customerNumber && settings.customerNotifyTemplate) {
    const customerMsg = fillTemplate(settings.customerNotifyTemplate, templateData);
    try {
      const result = await sendWhatsAppMessage(token, phoneNumberId, customerNumber, customerMsg);
      console.log('✅ Customer confirmation sent:', result);
    } catch (err) {
      console.error('❌ Customer confirmation failed:', err.message);
    }
  }
});

export const sendOrderStatusNotifications = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;
  if (before.status === after.status) return;

  const orderId = event.params.orderId;

  // Read site settings from Firestore
  const settingsSnap = await db.doc('settings/site').get();
  const settings = settingsSnap.data() || {};

  const token = settings.whatsappBusinessToken;
  const phoneNumberId = settings.whatsappPhoneNumberId;

  if (!token || !phoneNumberId) {
    console.log('⚠️ WhatsApp Business API not configured — skipping status notification');
    return;
  }

  const itemsList = buildItemsList(after.items);
  const paymentLabel = paymentLabels[after.paymentMethod] || after.paymentMethod;

  const templateData = {
    orderId,
    customerName: after.userName || '',
    customerPhone: after.phone || '',
    customerAddress: after.address || '',
    paymentMethod: paymentLabel,
    total: (after.total || 0).toLocaleString(),
    items: itemsList,
    cancelReason: after.cancelReason || 'بدون سبب',
    returnReason: after.returnReason || 'بدون سبب',
  };

  const adminNumber = settings.whatsappNotificationNumber || settings.whatsappNumber;

  // Customer cancelled an order → send them an apology/love message
  if (after.status === 'cancelled') {
    const customerMsg = fillTemplate(settings.cancelNotifyTemplate || '', templateData);
    if (after.phone) {
      try {
        const result = await sendWhatsAppMessage(token, phoneNumberId, after.phone, customerMsg);
        console.log('✅ Cancel apology sent to customer:', result);
      } catch (err) {
        console.error('❌ Cancel apology failed:', err.message);
      }
    }
    if (adminNumber) {
      const adminMsg = `⚠️ *تم إلغاء الطلب #{orderId}*\n━━━━━━━━━━━━━━━\n👤 العميل: {customerName}\n📞 التليفون: {customerPhone}\n💰 الإجمالي: {total} ج\n🗒 السبب: {cancelReason}\n━━━━━━━━━━━━━━━\n✅ Style It`
        .replace(/#\{orderId\}/g, orderId)
        .replace(/\{customerName\}/g, templateData.customerName)
        .replace(/\{customerPhone\}/g, templateData.customerPhone)
        .replace(/\{total\}/g, templateData.total)
        .replace(/\{cancelReason\}/g, templateData.cancelReason);
      try {
        const result = await sendWhatsAppMessage(token, phoneNumberId, adminNumber, adminMsg);
        console.log('✅ Admin cancel notice sent:', result);
      } catch (err) {
        console.error('❌ Admin cancel notice failed:', err.message);
      }
    }
  }

  // Customer requested a return → notify admin
  if (after.status === 'returned') {
    const adminMsg = fillTemplate(settings.returnNotifyTemplate || '', templateData);
    if (adminNumber) {
      try {
        const result = await sendWhatsAppMessage(token, phoneNumberId, adminNumber, adminMsg);
        console.log('✅ Admin return notice sent:', result);
      } catch (err) {
        console.error('❌ Admin return notice failed:', err.message);
      }
    }
  }
});
