import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Banknote, CheckCircle, Package, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getProductImages } from '../store/useStore';

export default function CheckoutPage() {
  const { cart, currentUser, placeOrder, clearCart, setActivePage, showNotification, siteSettings, appliedCoupon } = useStore();
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [orderId, setOrderId] = useState('');
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    address: '',
    city: '',
    notes: '',
    paymentMethod: 'cash',
  });

  const shippingCost = siteSettings.shippingCost ?? 50;
  const freeShippingThreshold = siteSettings.freeShippingThreshold ?? 500;
  const subtotal = cart.reduce((a, i) => a + i.product.price * i.quantity, 0);
  const couponDiscount = appliedCoupon?.discount || 0;
  const afterDiscount = subtotal - couponDiscount;
  const shipping = afterDiscount >= freeShippingThreshold ? 0 : shippingCost;
  const total = afterDiscount + shipping;

  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone || !form.address || !form.city) {
      showNotification('من فضلك اكمل جميع البيانات المطلوبة', 'error');
      return;
    }
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    const id = placeOrder({
      userId: currentUser?.id || '',
      userName: form.name,
      userEmail: form.email,
      items: cart,
      status: 'pending',
      address: `${form.address}, ${form.city}`,
      phone: form.phone,
      paymentMethod: form.paymentMethod,
    });
    const placedOrder = useStore.getState().orders.find(o => o.id === id);
    // Save customer data
    const info = {
      name: form.name,
      phone: form.phone,
      email: form.email || currentUser?.email || '',
      address: form.address,
      city: form.city,
      notes: form.notes,
      orders: [id],
      createdAt: new Date().toISOString().split('T')[0],
    };
    useStore.getState().saveCustomer(info);
    setOrderId(id);
    setConfirmedTotal(placedOrder?.total || total);
    clearCart();
    setStep('success');
    showNotification('تم تقديم طلبك بنجاح! 🎉');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>
          <h2 className="text-2xl font-black text-gray-900 font-cairo mb-3">تم تقديم طلبك! 🎉</h2>
          <p className="text-gray-500 font-cairo mb-4">سيتم التواصل معك خلال 24 ساعة لتأكيد الطلب</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 font-cairo">رقم الطلب</p>
            <p className="font-black text-gray-900 font-cairo text-lg">{orderId}</p>
            <p className="text-sm font-bold text-pink-600 font-cairo mt-1">الإجمالي: {confirmedTotal.toLocaleString()} جنيه</p>
            <p className="text-xs text-gray-500 font-cairo mt-1">طريقة الدفع: {form.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : form.paymentMethod === 'instapay' ? 'InstaPay' : 'فودافون كاش'}</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => setActivePage('orders')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-pink-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-pink-600 transition-all"
              >
                <Package className="w-4 h-4" /> تتبع الطلب
              </button>
              <button
                onClick={() => setActivePage('home')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-cairo text-sm hover:bg-gray-200 transition-all"
              >
                الرئيسية
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {['بيانات الشحن', 'طريقة الدفع', 'تأكيد الطلب'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-cairo ${
                i < (step === 'info' ? 0 : 1) || (step === 'payment' && i === 0)
                  ? 'bg-green-500 text-white'
                  : i === (step === 'info' ? 0 : 1)
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              <span className="text-sm font-cairo text-gray-600 hidden sm:block">{s}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Form */}
          <div className="md:col-span-2">
            {step === 'info' ? (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-6"
              >
                <h2 className="text-xl font-black text-gray-900 font-cairo mb-6">بيانات الشحن</h2>
                <form onSubmit={handleSubmitInfo} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">الاسم *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">رقم الموبايل *</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">العنوان التفصيلي *</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="الشارع، رقم المبنى، الشقة..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">المحافظة / المدينة *</label>
                    <select
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300"
                      required
                    >
                      <option value="">اختر المدينة</option>
                      {['القاهرة', 'الإسكندرية', 'الجيزة', 'الشرقية', 'الدقهلية', 'البحيرة', 'المنوفية', 'الغربية', 'كفر الشيخ', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'مطروح'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 font-cairo block mb-1">ملاحظات (اختياري)</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="أي تعليمات للتوصيل..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold font-cairo flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    التالي: اختر طريقة الدفع
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-6"
              >
                <h2 className="text-xl font-black text-gray-900 font-cairo mb-6">طريقة الدفع</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { value: 'cash', label: 'الدفع عند الاستلام', icon: <Banknote className="w-5 h-5 text-green-600" />, desc: 'ادفع كاش لما يوصلك الطلب' },
                    { value: 'instapay', label: 'InstaPay', icon: <Smartphone className="w-5 h-5 text-purple-600" />, desc: 'تحويل فوري عبر انستاباي' },
                    { value: 'vodafone', label: 'فودافون كاش', icon: <Smartphone className="w-5 h-5 text-red-600" />, desc: 'دفع عبر فودافون كاش' },
                  ].map(method => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        form.paymentMethod === method.value ? 'border-pink-500 bg-pink-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.value}
                        checked={form.paymentMethod === method.value}
                        onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                        className="accent-pink-500"
                      />
                      <div className={`p-2 rounded-lg ${form.paymentMethod === method.value ? 'bg-white' : 'bg-gray-50'}`}>
                        {method.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 font-cairo text-sm">{method.label}</p>
                        <p className="text-xs text-gray-500 font-cairo">{method.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {form.paymentMethod === 'instapay' && siteSettings.instapayAccount && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                    <p className="text-sm font-bold text-purple-700 font-cairo mb-1">حساب InstaPay للتحويل</p>
                    <p className="text-base font-bold text-purple-800 font-cairo text-center">{siteSettings.instapayName || 'InstaPay'}</p>
                    <p className="text-lg font-black text-purple-900 font-cairo text-center" dir="ltr">{siteSettings.instapayAccount}</p>
                    <p className="text-xs text-purple-500 font-cairo mt-1 text-center">حول المبلغ على الحساب أعلاه ثم أرسل إثبات الدفع عبر واتساب</p>
                    {siteSettings.whatsappNumber && (
                      <a href={`https://wa.me/${siteSettings.whatsappNumber.replace(/^\+|^00/, '')}?text=${encodeURIComponent(`طلب جديد - أريد تأكيد تحويل مبلغ ${total.toLocaleString()} جنيه عبر InstaPay`)}`} target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-green-600 transition-all">
                        💬 أرسل إثبات الدفع عبر واتساب
                      </a>
                    )}
                  </div>
                )}
                {form.paymentMethod === 'vodafone' && siteSettings.vodafoneAccount && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <p className="text-sm font-bold text-red-700 font-cairo mb-1">رقم فودافون كاش للتحويل</p>
                    <p className="text-base font-bold text-red-800 font-cairo text-center">{siteSettings.vodafoneName || 'فودافون كاش'}</p>
                    <p className="text-lg font-black text-red-900 font-cairo text-center" dir="ltr">{siteSettings.vodafoneAccount}</p>
                    <p className="text-xs text-red-500 font-cairo mt-1 text-center">حول المبلغ على الرقم أعلاه ثم أرسل إثبات الدفع عبر واتساب</p>
                    {siteSettings.whatsappNumber && (
                      <a href={`https://wa.me/${siteSettings.whatsappNumber.replace(/^\+|^00/, '')}?text=${encodeURIComponent(`طلب جديد - أريد تأكيد تحويل مبلغ ${total.toLocaleString()} جنيه عبر فودافون كاش`)}`} target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white rounded-xl font-bold font-cairo text-sm hover:bg-green-600 transition-all">
                        💬 أرسل إثبات الدفع عبر واتساب
                      </a>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('info')}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-cairo text-sm hover:bg-gray-200 transition-all"
                  >
                    رجوع
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    className="flex-1 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold font-cairo flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                  >
                    <CheckCircle className="w-5 h-5" />
                    تأكيد الطلب - {total.toLocaleString()} جنيه
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <h3 className="font-bold text-gray-900 font-cairo mb-4">ملخص الطلب</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cart.map(item => (
                  <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-3">
                    <img src={getProductImages(item.product, item.color)[0] || item.product.images[0]} alt={item.product.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 font-cairo line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-400 font-cairo">{item.size} × {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900 font-cairo flex-shrink-0">
                      {(item.product.price * item.quantity).toLocaleString()} ج
                    </p>
                  </div>
                ))}
              </div>
              <hr className="border-gray-100 mb-3" />
              <div className="space-y-2 text-sm font-cairo">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toLocaleString()} جنيه</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm font-cairo text-red-500">
                    <span>خصم الكوبون {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span>
                    <span className="font-bold">-{couponDiscount.toLocaleString()} ج</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>الشحن</span>
                  <span className={shipping === 0 ? 'text-green-600 font-bold' : ''}>{shipping === 0 ? 'مجاني 🎉' : `${shipping} جنيه`}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between font-black text-gray-900 text-base">
                  <span>الإجمالي</span>
                  <span>{total.toLocaleString()} جنيه</span>
                </div>
              </div>
              {afterDiscount < freeShippingThreshold && (
                <p className="text-xs text-orange-500 font-cairo mt-3 text-center">
                  أضف {(freeShippingThreshold - afterDiscount).toLocaleString()} جنيه للحصول على شحن مجاني
                </p>
              )}
              {freeShippingThreshold > 0 && (
                <p className="text-[11px] text-gray-400 font-cairo mt-1 text-center">
                  🚚 الشحن مجاني للطلبات من {freeShippingThreshold.toLocaleString()} جنيه فأكثر
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
