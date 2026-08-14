import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveSettings } from '../lib/settingsService';
import { saveOrderToFirestore, saveUnreadIdsToFirestore, deleteOrderFromFirestore, updateOrderStatusInFirestore, updateOrderFieldsInFirestore, saveCustomersToFirestore } from '../lib/ordersService';
import { saveAllProducts } from '../lib/productsService';

async function syncProducts(products: Product[], showError?: (msg: string) => void) {
  try {
    await saveAllProducts(products);
  } catch (err) {
    console.error('Firestore sync failed:', err);
    showError?.('فشل في المزامنة مع السحابة! التغييرات محفوظة محلياً فقط');
  }
}

export type Category = 'رجالي' | 'حريمي' | 'أطفال' | 'رياضي' | 'اكسسوارات' | 'عطور' | 'مستحضرات تجميل';
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | string;

export interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  oldPrice?: number;
  category: Category;
  sizes: Size[];
  colors: string[];
  colorLabels?: Record<string, string>;
  images: string[];
  colorImages?: Record<string, string[]>;
  description: string;
  stock: Record<string, number>;
  rating: number;
  reviews: Review[];
  featured: boolean;
  newArrival: boolean;
  createdAt: string;
}

export function stockKey(size: string, color: string): string {
  return `${size}|${color}`;
}

export function getStock(product: Product, size: string, color: string): number {
  return product.stock[stockKey(size, color)] ?? 0;
}

export function getTotalStock(product: Product): number {
  return Object.values(product.stock).reduce((a, b) => a + b, 0);
}

export function getAvailableSizes(product: Product, color?: string): string[] {
  return product.sizes.filter(s => {
    if (color) return getStock(product, s, color) > 0;
    return product.colors.some(c => getStock(product, s, c) > 0);
  });
}

export function getAvailableColors(product: Product, size?: string): string[] {
  return product.colors.filter(c => {
    if (size) return getStock(product, size, c) > 0;
    return product.sizes.some(s => getStock(product, s, c) > 0);
  });
}

export function getProductImages(product: Product, color?: string): string[] {
  if (color && product.colorImages?.[color]?.length) return product.colorImages[color];
  return product.images;
}

export function getColorLabel(color: string, product?: Product): string {
  if (product?.colorLabels?.[color]) return product.colorLabels[color];
  return COLOR_NAMES[color] || color;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: Size;
  color: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  address: string;
  phone: string;
  createdAt: string;
  paymentMethod: string;
  subtotal?: number;
  shipping?: number;
  couponCode?: string;
  couponDiscount?: number;
  cancelReason?: string;
  returnReason?: string;
  cancelledBy?: 'customer' | 'admin';
  statusUpdatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'customer';
  avatar?: string;
  wishlist: string[];
  orders: string[];
  createdAt: string;
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
}

export interface SiteSettings {
  heroTitle: string;
  heroBadge: string;
  heroSubtitle: string;
  heroBtnText: string;
  heroBtn2Text: string;
  heroImages: string[];
  instapayName: string;
  vodafoneName: string;
  features: { title: string; desc: string; emoji: string; visible?: boolean }[];
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  footerBrand: string;
  footerQuickLinks: { label: string; page: string }[];
  footerServiceLinks: { label: string; page: string }[];
  footerSocial: { icon: string; url: string }[];
  footerAbout: string;
  primaryColor: string;
  secondaryColor: string;
  showFeatures: boolean;
  showCategories: boolean;
  showFeatured: boolean;
  showNewArrivals: boolean;
  showSaleBanner: boolean;
  saleBannerBadge: string;
  saleBannerTitle: string;
  saleBannerSubtitle: string;
  saleBannerCoupon: string;
  saleBannerBtnText: string;
  saleBannerIcon: string;
  saleBannerColor: string;
  saleBannerColor2: string;
  instapayAccount: string;
  vodafoneAccount: string;
  whatsappNumber: string;
  whatsappNotificationNumber: string;
  whatsappBusinessToken: string;
  whatsappPhoneNumberId: string;
  adminNotifyTemplate: string;
  customerNotifyTemplate: string;
  coupons: Coupon[];
  orderTrackingMessage: string;
  cancelNotifyTemplate: string;
  returnNotifyTemplate: string;
  shippingCost: number;
  freeShippingThreshold: number;
}

export const COLOR_NAMES: Record<string, string> = {
  '#ffffff': 'أبيض',
  '#000000': 'أسود',
  '#1a1a2e': 'كحلي',
  '#4a90d9': 'أزرق',
  '#c0392b': 'أحمر',
  '#2c3e50': 'نيلي',
  '#8e44ad': 'بنفسجي',
  '#27ae60': 'أخضر',
  '#2980b9': 'أزرق سماوي',
  '#e74c3c': 'أحمر',
  '#1a5276': 'أزرق غامق',
  '#7f8c8d': 'رمادي',
  '#3498db': 'أزرق',
  '#2ecc71': 'أخضر',
  '#8B4513': 'بني',
  '#1a1a1a': 'أسود',
  '#c0c0c0': 'فضي',
  '#f43f5e': 'وردي',
  '#a855f7': 'بنفسجي',
  '#f97316': 'برتقالي',
  '#6c3483': 'بنفسجي غامق',
  '#4338ca': 'نيلي',
  '#0ea5e9': 'أزرق فاتح',
  '#10b981': 'أخضر زمردي',
  '#f59e0b': 'ذهبي',
  '#ef4444': 'أحمر',
};

export interface Customer {
  name: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  email?: string;
  orders: string[];
  createdAt: string;
}

interface StoreState {
  // Auth
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (name: string, email: string, password: string) => boolean;
  updateUser: (user: User) => void;

  // Products
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  saveAllToFirestore: () => void;
  addReview: (productId: string, review: Review) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, size: Size, color: string, qty?: number) => void;
  removeFromCart: (productId: string, size: Size, color: string) => void;
  updateCartQty: (productId: string, size: Size, color: string, qty: number) => void;
  clearCart: () => void;
  appliedCoupon: { code: string; discount: number } | null;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;

  // Wishlist
  toggleWishlist: (productId: string) => void;

  // Orders
  orders: Order[];
  unreadOrderIds: string[];
  placeOrder: (order: Omit<Order, 'id' | 'createdAt' | 'total' | 'subtotal' | 'shipping' | 'couponCode' | 'couponDiscount'>) => string;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  requestReturn: (orderId: string, reason: string) => void;
  markOrdersRead: (orderIds: string[]) => void;

  // UI
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  adminSection: string;
  setAdminSection: (section: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  // Site Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  productsUpdatedAt: number;
  customers: Customer[];
  saveCustomer: (info: Customer) => void;
  deleteCustomer: (phone: string) => void;
  deleteOrder: (orderId: string) => void;
}

const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'قميص كاجوال كلاسيك',
    price: 299,
    oldPrice: 450,
    category: 'رجالي',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#ffffff', '#1a1a2e', '#4a90d9'],
    images: [
      'https://images.pexels.com/photos/5698851/pexels-photo-5698851.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'قميص كاجوال أنيق مصنوع من القطن الخالص 100%، مثالي للإطلالات اليومية العصرية.',
    stock: { 'S|#ffffff': 5, 'S|#1a1a2e': 3, 'M|#ffffff': 8, 'M|#1a1a2e': 6, 'M|#4a90d9': 4, 'L|#ffffff': 5, 'L|#1a1a2e': 2, 'XL|#ffffff': 3 },
    rating: 4.5,
    reviews: [],
    featured: true,
    newArrival: true,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'فستان سهرة راقي',
    price: 850,
    oldPrice: 1200,
    category: 'حريمي',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['#c0392b', '#2c3e50', '#8e44ad'],
    images: [
      'https://images.pexels.com/photos/8311880/pexels-photo-8311880.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'فستان سهرة فاخر بتصميم عصري يناسب المناسبات الخاصة والحفلات.',
    stock: { 'XS|#c0392b': 2, 'S|#c0392b': 4, 'S|#2c3e50': 3, 'M|#c0392b': 3, 'M|#8e44ad': 3, 'L|#2c3e50': 2 },
    rating: 4.8,
    reviews: [],
    featured: true,
    newArrival: false,
    createdAt: '2024-01-20',
  },
  {
    id: '3',
    name: 'تراكسوت رياضي',
    price: 450,
    oldPrice: 600,
    category: 'رياضي',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#27ae60', '#2980b9', '#e74c3c'],
    images: [
      'https://images.pexels.com/photos/5698851/pexels-photo-5698851.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'تراكسوت رياضي عالي الجودة مصنوع من أقمشة تقنية تمتص العرق.',
    stock: { 'S|#27ae60': 3, 'S|#2980b9': 2, 'M|#27ae60': 5, 'M|#2980b9': 4, 'M|#e74c3c': 3, 'L|#27ae60': 4, 'L|#e74c3c': 3, 'XL|#2980b9': 3, 'XL|#e74c3c': 2, 'XXL|#27ae60': 1 },
    rating: 4.3,
    reviews: [],
    featured: false,
    newArrival: true,
    createdAt: '2024-02-01',
  },
  {
    id: '4',
    name: 'جاكيت جينز ترندي',
    price: 650,
    oldPrice: undefined,
    category: 'حريمي',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['#1a5276', '#7f8c8d'],
    images: [
      'https://images.pexels.com/photos/8386666/pexels-photo-8386666.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'جاكيت جينز بتصميم عصري مناسب لجميع الأوقات.',
    stock: { 'XS|#1a5276': 2, 'S|#1a5276': 4, 'S|#7f8c8d': 3, 'M|#1a5276': 3, 'M|#7f8c8d': 3, 'L|#7f8c8d': 3, 'XL|#1a5276': 2 },
    rating: 4.6,
    reviews: [],
    featured: true,
    newArrival: true,
    createdAt: '2024-02-05',
  },
  {
    id: '5',
    name: 'بنطلون كاجوال للأطفال',
    price: 180,
    oldPrice: 250,
    category: 'أطفال',
    sizes: ['XS', 'S', 'M'],
    colors: ['#3498db', '#e74c3c', '#2ecc71'],
    images: [
      'https://images.pexels.com/photos/35045845/pexels-photo-35045845.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'بنطلون كاجوال مريح للأطفال من أقمشة ناعمة وعالية الجودة.',
    stock: { 'XS|#3498db': 5, 'XS|#e74c3c': 4, 'S|#3498db': 6, 'S|#2ecc71': 5, 'M|#3498db': 5, 'M|#e74c3c': 5, 'M|#2ecc71': 5 },
    rating: 4.2,
    reviews: [],
    featured: false,
    newArrival: false,
    createdAt: '2024-01-10',
  },
  {
    id: '6',
    name: 'حقيبة يد فاخرة',
    price: 1200,
    oldPrice: 1800,
    category: 'اكسسوارات',
    sizes: ['M'],
    colors: ['#8B4513', '#1a1a1a', '#c0c0c0'],
    images: [
      'https://images.pexels.com/photos/8307678/pexels-photo-8307678.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'حقيبة يد فاخرة من الجلد الطبيعي بتصميم أنيق يناسب جميع المناسبات.',
    stock: { 'M|#8B4513': 4, 'M|#1a1a1a': 3, 'M|#c0c0c0': 3 },
    rating: 4.9,
    reviews: [],
    featured: true,
    newArrival: false,
    createdAt: '2024-01-25',
  },
  {
    id: '7',
    name: 'تيشرت أوفرسايز',
    price: 199,
    oldPrice: undefined,
    category: 'رجالي',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['#ffffff', '#000000', '#e74c3c', '#3498db'],
    images: [
      'https://images.pexels.com/photos/5698851/pexels-photo-5698851.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'تيشرت أوفرسايز عصري مريح للاستخدام اليومي والخروجات.',
    stock: { 'M|#ffffff': 8, 'M|#000000': 6, 'M|#e74c3c': 4, 'M|#3498db': 4, 'L|#ffffff': 7, 'L|#000000': 5, 'L|#e74c3c': 3, 'XL|#ffffff': 5, 'XL|#000000': 4, 'XL|#3498db': 4, 'XXL|#000000': 3, 'XXL|#ffffff': 3 },
    rating: 4.4,
    reviews: [],
    featured: false,
    newArrival: true,
    createdAt: '2024-02-10',
  },
  {
    id: '8',
    name: 'عباية تطريز ملكي',
    price: 950,
    oldPrice: 1400,
    category: 'حريمي',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#2c3e50', '#6c3483'],
    images: [
      'https://images.pexels.com/photos/8387127/pexels-photo-8387127.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    description: 'عباية فاخرة بتطريز يدوي ملكي من أجود أنواع الأقمشة.',
    stock: { 'S|#000000': 3, 'S|#2c3e50': 2, 'M|#000000': 4, 'M|#6c3483': 3, 'L|#2c3e50': 2, 'L|#6c3483': 2, 'XL|#000000': 1 },
    rating: 4.7,
    reviews: [],
    featured: true,
    newArrival: false,
    createdAt: '2024-01-30',
  },
];

const defaultUsers: User[] = [
  {
    id: 'admin-1',
    name: 'المدير',
    email: 'admin@admin.com',
    password: '123456',
    role: 'admin',
    wishlist: [],
    orders: [],
    createdAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'user-1',
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    password: '123456',
    role: 'customer',
    wishlist: [],
    orders: [],
    createdAt: new Date().toISOString().split('T')[0],
  },
];

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: defaultUsers,
      products: [],
      cart: [],
      appliedCoupon: null,
      orders: [],
      unreadOrderIds: [],
      searchQuery: '',
      selectedCategory: 'الكل',
      activePage: 'home',
      adminSection: 'dashboard',
      isCartOpen: false,
      notification: null,
      customers: [],
      productsUpdatedAt: 0,
      siteSettings: {
        heroTitle: 'أحدث صيحات الموضة في مكان واحد',
        heroBadge: '🔥 تخفيضات الموسم - حتى 50% خصم',
        heroSubtitle: 'تشكيلة واسعة من الملابس العصرية والإكسسوارات الفاخرة بأفضل الأسعار',
        heroBtnText: 'تسوق الآن',
        heroBtn2Text: 'تعرف علينا',
        heroImages: [],
        features: [
          { title: 'شحن سريع', desc: 'توصيل خلال 3-7 أيام عمل', emoji: '🚚' },
          { title: 'جودة عالية', desc: 'من أفضل الماركات العالمية', emoji: '🌟' },
          { title: 'دفع آمن', desc: 'طرق دفع متعددة ومشّفرة', emoji: '🔒' },
          { title: 'دعم 24 ساعة', desc: 'فريق خدمة العملاء جاهز', emoji: '💬' },
        ],
        footerEmail: 'info@warawear.com',
        footerPhone: '+201234567890',
        footerAddress: 'القاهرة، مصر',
        footerBrand: 'Style It',
        footerAbout: 'متجرك الأول للأزياء العصرية. نقدم أرقى الملابس بأفضل الأسعار.',
        footerQuickLinks: [
          { label: 'الرئيسية', page: 'home' },
          { label: 'المتجر', page: 'shop' },
          { label: 'العروض', page: 'shop' },
          { label: 'من نحن', page: 'contact' },
        ],
        footerServiceLinks: [
          { label: 'تتبع الطلب', page: 'orders' },
          { label: 'الأسئلة الشائعة', page: 'contact' },
          { label: 'تواصل معنا', page: 'contact' },
        ],
        footerSocial: [
          { icon: '📘', url: '#' },
          { icon: '📸', url: '#' },
          { icon: '🐦', url: '#' },
          { icon: '▶️', url: '#' },
        ],
        primaryColor: '#f43f5e',
        secondaryColor: '#a855f7',
        showFeatures: true,
        showCategories: true,
        showFeatured: true,
        showNewArrivals: true,
        showSaleBanner: true,
        saleBannerBadge: 'عرض محدود الوقت',
        saleBannerTitle: 'تخفيض 40% على كل شيء!',
        saleBannerSubtitle: 'استخدم كود {coupon} عند الدفع',
        saleBannerCoupon: 'MODA40',
        saleBannerBtnText: 'تسوق الآن',
        saleBannerIcon: '🏷️',
        saleBannerColor: '#f97316',
        saleBannerColor2: '#ec4899',
        instapayAccount: 'instapay@warawear.com',
        instapayName: 'Style It',
        vodafoneAccount: '01000000000',
        vodafoneName: 'Style It',
        whatsappNumber: '01000000000',
        whatsappNotificationNumber: '01000000000',
        whatsappBusinessToken: '',
        whatsappPhoneNumberId: '',
        adminNotifyTemplate: '🛍 طلب جديد #{orderId}\n━━━━━━━━━━━━━━━\n👤 العميل: {customerName}\n📞 التليفون: {customerPhone}\n📍 العنوان: {customerAddress}\n💳 الدفع: {paymentMethod}\n💰 الإجمالي: {total} ج\n━━━━━━━━━━━━━━━\n📦 المنتجات:\n{items}\n━━━━━━━━━━━━━━━\n✅ Style It',
        customerNotifyTemplate: '🎉 شكراً لطلبك من Style It!\n━━━━━━━━━━━━━━━\n📋 رقم الطلب: #{orderId}\n💰 الإجمالي: {total} ج\n💳 الدفع: {paymentMethod}\n━━━━━━━━━━━━━━━\n📦 المنتجات:\n{items}\n━━━━━━━━━━━━━━━\nسيتم تأكيد طلبك قريباً 📞',
        coupons: [
          { code: 'SAVE10', type: 'percentage', value: 10 },
        ],
        orderTrackingMessage: 'شكراً لطلبك من وارا وير! 🎉 طلبك قيد التجهيز وسيتم شحنه قريباً. يمكنك تتبع حالة طلبك من هنا.',
        shippingCost: 50,
        freeShippingThreshold: 500,
        cancelNotifyTemplate: '💔 إحنا آسفين يا {customerName} ❤️\n\nإحنا استلمنا إلغاء طلبك #{orderId}، وبنعتذرلك بجد لو منتجاتنا معجبتكيش.\n\nوعد مننا إحنا شغالين على تحسين الجودة باستمرار عشان نستاهل ثقتك، ومنورنا في أي وقت 🌹',
        returnNotifyTemplate: '📦 طلب استرجاع جديد #{orderId}\n━━━━━━━━━━━━━━━\n👤 العميل: {customerName}\n📞 التليفون: {customerPhone}\n💰 الإجمالي: {total} ج\n🗒 السبب: {returnReason}\n━━━━━━━━━━━━━━━\n✅ Style It',
      },

      login: (email, password) => {
        const state = get();
        let user = state.users.find(u => u.email === email && u.password === password && u.role === 'admin');
        if (!user) {
          set({ users: state.users.map(u => {
            if (u.id === 'admin-1' || u.email?.startsWith('admin')) {
              return { ...u, email: 'admin@admin.com', password: '123456', role: 'admin' };
            }
            return u;
          }) });
          user = get().users.find(u => u.email === email && u.password === password && u.role === 'admin');
        }
        if (user) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },

      logout: () => set({ currentUser: null, activePage: 'home' }),

      register: () => false,

      updateUser: (user) => {
        set(state => ({
          users: state.users.map(u => u.id === user.id ? user : u),
          currentUser: state.currentUser?.id === user.id ? user : state.currentUser,
        }));
      },

      addProduct: (product) => {
        const ts = Date.now();
        set(state => ({ products: [...state.products, product], productsUpdatedAt: ts }));
        syncProducts(useStore.getState().products, useStore.getState().showNotification);
      },

      updateProduct: (product) => {
        const ts = Date.now();
        set(state => ({ products: state.products.map(p => p.id === product.id ? product : p), productsUpdatedAt: ts }));
        syncProducts(useStore.getState().products, useStore.getState().showNotification);
      },

      deleteProduct: (id) => {
        const ts = Date.now();
        set(state => ({ products: state.products.filter(p => p.id !== id), productsUpdatedAt: ts }));
        syncProducts(useStore.getState().products, useStore.getState().showNotification);
      },

      saveAllToFirestore: async () => {
        const state = useStore.getState();
        const ts = Date.now();
        useStore.setState({ productsUpdatedAt: ts });
        await syncProducts(state.products, state.showNotification);
        try {
          await saveSettings(state.siteSettings);
        } catch (err) {
          console.error('Settings sync failed:', err);
          state.showNotification?.('فشل في حفظ الإعدادات على السحابة');
        }
      },

      addReview: (productId, review) =>
        set(state => ({
          products: state.products.map(p =>
            p.id === productId
              ? {
                  ...p,
                  reviews: [...p.reviews, review],
                  rating: [...p.reviews, review].reduce((a, r) => a + r.rating, 0) / (p.reviews.length + 1),
                }
              : p
          ),
        })),

      addToCart: (product, size, color, qty = 1) => {
        const cart = get().cart;
        const existing = cart.find(
          i => i.product.id === product.id && i.size === size && i.color === color
        );
        if (existing) {
          set({
            cart: cart.map(i =>
              i.product.id === product.id && i.size === size && i.color === color
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
          });
        } else {
          set({ cart: [...cart, { product, quantity: qty, size, color }] });
        }
      },

      removeFromCart: (productId, size, color) =>
        set(state => ({
          cart: state.cart.filter(
            i => !(i.product.id === productId && i.size === size && i.color === color)
          ),
        })),

      updateCartQty: (productId, size, color, qty) =>
        set(state => ({
          cart: state.cart.map(i =>
            i.product.id === productId && i.size === size && i.color === color
              ? { ...i, quantity: qty }
              : i
          ),
        })),

      clearCart: () => set({ cart: [], appliedCoupon: null }),

      applyCoupon: (code) => {
        const state = get();
        const coupon = state.siteSettings.coupons.find(c => c.code.toUpperCase() === code.toUpperCase().trim());
        if (!coupon) return false;
        const subtotal = state.cart.reduce((a, i) => a + i.product.price * i.quantity, 0);
        const discount = coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value;
        set({ appliedCoupon: { code: coupon.code, discount: Math.min(discount, subtotal) } });
        return true;
      },
      removeCoupon: () => set({ appliedCoupon: null }),

      toggleWishlist: (productId) => {
        const user = get().currentUser;
        if (!user) return;
        const inWishlist = user.wishlist.includes(productId);
        const updatedUser = {
          ...user,
          wishlist: inWishlist
            ? user.wishlist.filter(id => id !== productId)
            : [...user.wishlist, productId],
        };
        get().updateUser(updatedUser);
      },

      placeOrder: (order) => {
        const id = `${get().orders.length + 1}`;
        const settings = get().siteSettings;
        const shippingCost = Number(settings.shippingCost) || 0;
        const freeThreshold = Number(settings.freeShippingThreshold) || 0;
        const itemsTotal = order.items.reduce((a, i) => a + i.product.price * i.quantity, 0);
        const coupon = get().appliedCoupon;
        const couponDiscount = coupon?.discount || 0;
        const afterDiscount = itemsTotal - couponDiscount;
        const shipping = afterDiscount >= freeThreshold ? 0 : shippingCost;
        const newOrder: Order = {
          ...order,
          subtotal: itemsTotal,
          shipping,
          couponCode: coupon?.code || undefined,
          couponDiscount: couponDiscount || undefined,
          total: afterDiscount + shipping,
          id,
          createdAt: new Date().toISOString().split('T')[0],
        };
        set(state => {
          const user = state.users.find(u => u.id === order.userId);
          const updatedUsers = user
            ? state.users.map(u =>
                u.id === order.userId ? { ...u, orders: [...u.orders, id] } : u
              )
            : state.users;
          const updatedProducts = state.products.map(p => {
            const orderedItems = order.items.filter(i => i.product.id === p.id);
            if (orderedItems.length > 0) {
              const newStock = { ...p.stock };
              for (const item of orderedItems) {
                const key = stockKey(item.size as string, item.color);
                newStock[key] = Math.max(0, (newStock[key] ?? 0) - item.quantity);
              }
              return { ...p, stock: newStock };
            }
            return p;
          });
          return {
            orders: [...state.orders, newOrder],
            users: updatedUsers,
            products: updatedProducts,
            unreadOrderIds: [...state.unreadOrderIds, id],
            currentUser:
              state.currentUser?.id === order.userId
                ? { ...state.currentUser, orders: [...(state.currentUser.orders || []), id] }
                : state.currentUser,
          };
        });
        saveOrderToFirestore(newOrder);
        saveUnreadIdsToFirestore([...useStore.getState().unreadOrderIds, id]);
        const prods = useStore.getState().products;
        const ts = Date.now();
        useStore.setState({ productsUpdatedAt: ts });
        syncProducts(prods, useStore.getState().showNotification);
        return id;
      },

      markOrdersRead: (orderIds) => {
        const newIds = useStore.getState().unreadOrderIds.filter(id => !orderIds.includes(id));
        set({ unreadOrderIds: newIds });
        saveUnreadIdsToFirestore(newIds);
      },

      updateOrderStatus: (orderId, status) => {
        const order = get().orders.find(o => o.id === orderId);
        if (!order) return;
        if (order.status === 'cancelled' && order.cancelledBy === 'customer') {
          get().showNotification('لا يمكن تغيير حالة طلب ألغاه العميل', 'error');
          return;
        }
        set(state => ({
          orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o),
        }));
        updateOrderStatusInFirestore(orderId, status);
      },

      cancelOrder: (orderId, reason) => {
        const state = get();
        const order = state.orders.find(o => o.id === orderId);
        if (!order || order.status === 'cancelled') return;
        const now = new Date().toISOString();
        const updated: Order = {
          ...order,
          status: 'cancelled',
          cancelReason: reason,
          cancelledBy: 'customer',
          statusUpdatedAt: now,
        };
        const products = get().products.map(p => {
          const orderedItems = order.items.filter(i => i.product.id === p.id);
          if (orderedItems.length === 0) return p;
          const newStock = { ...p.stock };
          for (const item of orderedItems) {
            const key = stockKey(item.size as string, item.color);
            newStock[key] = (newStock[key] ?? 0) + item.quantity;
          }
          return { ...p, stock: newStock };
        });
        set(state => ({
          orders: state.orders.map(o => o.id === orderId ? updated : o),
          products,
          productsUpdatedAt: Date.now(),
        }));
        updateOrderFieldsInFirestore(orderId, {
          status: 'cancelled',
          cancelReason: reason,
          cancelledBy: 'customer',
          statusUpdatedAt: now,
        });
        syncProducts(products, get().showNotification);
      },

      requestReturn: (orderId, reason) => {
        const state = get();
        const order = state.orders.find(o => o.id === orderId);
        if (!order || order.status === 'returned') return;
        const now = new Date().toISOString();
        set(state => ({
          orders: state.orders.map(o =>
            o.id === orderId
              ? { ...o, status: 'returned' as const, returnReason: reason, cancelledBy: 'customer' as const, statusUpdatedAt: now }
              : o
          ),
        }));
        updateOrderFieldsInFirestore(orderId, {
          status: 'returned',
          returnReason: reason,
          cancelledBy: 'customer',
          statusUpdatedAt: now,
        });
      },

      setSearchQuery: (q) => set({ searchQuery: q }),
      setSelectedCategory: (cat) => set({ selectedCategory: cat }),
      setActivePage: (page) => set({ activePage: page }),
      setAdminSection: (section) => set({ adminSection: section }),
      setIsCartOpen: (open) => set({ isCartOpen: open }),
      showNotification: (message, type = 'success') => {
        set({ notification: { message, type } });
        setTimeout(() => set({ notification: null }), 3000);
      },

      updateSiteSettings: (settings) => {
        set(state => ({ siteSettings: { ...state.siteSettings, ...settings } }));
      },

      saveCustomer: async (info) => {
        const state = get();
        let updated: Customer[];
        const exists = state.customers.find(c => c.phone === info.phone);
        if (exists) {
          updated = state.customers.map(c =>
            c.phone === info.phone
              ? { ...c, orders: [...new Set([...c.orders, ...info.orders])], name: info.name, email: info.email || c.email, address: info.address, city: info.city, notes: info.notes || c.notes }
              : c
          );
        } else {
          updated = [...state.customers, info];
        }
        set({ customers: updated });
        try {
          await saveCustomersToFirestore(updated);
        } catch (err) {
          console.error('saveCustomersToFirestore error:', err);
        }
      },

      deleteCustomer: (phone) => {
        const state = get();
        const updated = state.customers.filter(c => c.phone !== phone);
        set({ customers: updated });
        saveCustomersToFirestore(updated).catch(err => {
          console.error('deleteCustomer Firestore error:', err);
        });
      },

      deleteOrder: (orderId) => {
        set(state => ({
          orders: state.orders.filter(o => o.id !== orderId),
          users: state.users.map(u => ({
            ...u,
            orders: u.orders.filter(id => id !== orderId),
          })),
          unreadOrderIds: state.unreadOrderIds.filter(id => id !== orderId),
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                orders: state.currentUser.orders.filter(id => id !== orderId),
              }
            : null,
        }));
        deleteOrderFromFirestore(orderId);
        const remaining = useStore.getState().unreadOrderIds;
        saveUnreadIdsToFirestore(remaining);
      },
    }),
    {
      name: 'wara-wear-storage',
      version: 7,
      migrate: (persisted: any) => {
        if (persisted.siteSettings?.shippingCost === undefined) {
          persisted.siteSettings = {
            ...persisted.siteSettings,
            shippingCost: 50,
            freeShippingThreshold: 500,
          };
        }
        if (!persisted.siteSettings?.heroBadge) {
          persisted.siteSettings = {
            ...persisted.siteSettings,
            heroBadge: '🔥 تخفيضات الموسم - حتى 50% خصم',
          };
        }
        if (!persisted.siteSettings?.orderTrackingMessage) {
          persisted.siteSettings = {
            ...persisted.siteSettings,
        orderTrackingMessage: 'شكراً لطلبك من وارا وير! 🎉 طلبك قيد التجهيز وسيتم شحنه قريباً. يمكنك تتبع حالة طلبك من هنا.',
          };
        }
        if (!persisted.siteSettings?.cancelNotifyTemplate) {
          persisted.siteSettings = {
            ...persisted.siteSettings,
            cancelNotifyTemplate: '💔 إحنا آسفين يا {customerName} ❤️\n\nإحنا استلمنا إلغاء طلبك #{orderId}، وبنعتذرلك بجد لو منتجاتنا معجبتكيش.\n\nوعد مننا إحنا شغالين على تحسين الجودة باستمرار عشان نستاهل ثقتك، ومنورنا في أي وقت 🌹',
            returnNotifyTemplate: '📦 طلب استرجاع جديد #{orderId}\n━━━━━━━━━━━━━━━\n👤 العميل: {customerName}\n📞 التليفون: {customerPhone}\n💰 الإجمالي: {total} ج\n🗒 السبب: {returnReason}\n━━━━━━━━━━━━━━━\n✅ Style It',
          };
        }
        if (!persisted.siteSettings?.footerQuickLinks) {
          persisted.siteSettings = {
            ...persisted.siteSettings,
            footerAbout: persisted.siteSettings?.footerAbout || 'متجرك الأول للأزياء العصرية. نقدم أرقى الملابس بأفضل الأسعار.',
            footerQuickLinks: persisted.siteSettings?.footerQuickLinks || [
              { label: 'الرئيسية', page: 'home' },
              { label: 'المتجر', page: 'shop' },
              { label: 'العروض', page: 'shop' },
              { label: 'من نحن', page: 'contact' },
            ],
            footerServiceLinks: persisted.siteSettings?.footerServiceLinks || [
              { label: 'تتبع الطلب', page: 'orders' },
              { label: 'الأسئلة الشائعة', page: 'contact' },
              { label: 'تواصل معنا', page: 'contact' },
            ],
            footerSocial: persisted.siteSettings?.footerSocial || [
              { icon: '📘', url: '#' },
              { icon: '📸', url: '#' },
              { icon: '🐦', url: '#' },
              { icon: '▶️', url: '#' },
            ],
          };
        }
        if (!persisted.siteSettings?.saleBannerTitle) {
          persisted.siteSettings = {
            ...persisted.siteSettings,
            saleBannerBadge: persisted.siteSettings?.saleBannerBadge || 'عرض محدود الوقت',
            saleBannerTitle: persisted.siteSettings?.saleBannerTitle || 'تخفيض 40% على كل شيء!',
            saleBannerSubtitle: persisted.siteSettings?.saleBannerSubtitle || 'استخدم كود {coupon} عند الدفع',
            saleBannerCoupon: persisted.siteSettings?.saleBannerCoupon || 'MODA40',
            saleBannerBtnText: persisted.siteSettings?.saleBannerBtnText || 'تسوق الآن',
            saleBannerIcon: persisted.siteSettings?.saleBannerIcon || '🏷️',
            saleBannerColor: persisted.siteSettings?.saleBannerColor || '#f97316',
            saleBannerColor2: persisted.siteSettings?.saleBannerColor2 || '#ec4899',
          };
        }
        if (persisted.users) {
          persisted.users = persisted.users.map((u: any) => {
            if (u.email === 'admin@warawear.com') { u.email = 'admin@admin.com'; u.password = '123456'; }
            if (!u.role) u.role = 'admin';
            return u;
          });
        }
        if (persisted.products) {
          persisted.products = persisted.products.map((p: any) => {
            if (typeof p.stock === 'number') {
              const newStock: Record<string, number> = {};
              const total = p.stock;
              const sizes = p.sizes || [];
              const colors = p.colors || ['#000000'];
              const perCombo = sizes.length > 0 && colors.length > 0 ? Math.ceil(total / (sizes.length * colors.length)) : 0;
              for (const s of sizes) {
                for (const c of colors) {
                  newStock[`${s}|${c}`] = perCombo;
                }
              }
              p.stock = newStock;
            }
            if (!p.colorImages) p.colorImages = {};
            return p;
          });
        }
        return persisted as any;
      },
      partialize: (state) => ({
        currentUser: state.currentUser,
        users: state.users,
        products: state.products,
        productsUpdatedAt: state.productsUpdatedAt,
        cart: state.cart,
        appliedCoupon: state.appliedCoupon,
        orders: state.orders,
        unreadOrderIds: state.unreadOrderIds,
        customers: state.customers,
        siteSettings: state.siteSettings,
      }),
      onRehydrateStorage: () => () => {
        const s = useStore.getState();
        s.users = s.users.map((u: any) => {
          if (u.id === 'admin-1' || u.email?.includes('admin') || u.role === 'admin') {
            return { ...u, email: 'admin@admin.com', password: '123456', role: 'admin', id: 'admin-1', name: u.name || 'المدير' };
          }
          if (!u.role) u.role = 'customer';
          return u;
        });
        const hasAdmin = s.users.some((u: any) => u.role === 'admin' && u.email === 'admin@admin.com');
        if (!hasAdmin) {
          s.users.push({ id: 'admin-1', name: 'المدير', email: 'admin@admin.com', password: '123456', role: 'admin', wishlist: [], orders: [], createdAt: new Date().toISOString().split('T')[0] });
        }
        useStore.setState({ users: [...s.users], activePage: 'home' });
      },
    }
  )
);
