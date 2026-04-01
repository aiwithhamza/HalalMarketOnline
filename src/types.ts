export type Role = 'customer' | 'vendor';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'original', symbol: '', name: 'Original Currency' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeName?: string;
  storeDescription?: string;
  profileImage?: string;
  coverImage?: string;
  lastShippingDetails?: ShippingDetails;
}

export interface ProductVariation {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  imageUrl: string;
  stock: number;
  tags: string[];
  isHalalCertified: boolean;
  availableCountries?: string[]; // For Fresh Items
  availableCities?: string[]; // For Fresh Items
  variations?: ProductVariation[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariations?: Record<string, string>;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered';
export type PaymentMethod = 'card' | 'cod';

export interface OrderStatusUpdate {
  id: string;
  orderId: string;
  status: OrderStatus;
  description: string;
  timestamp: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  vendorId: string;
  selectedVariations?: Record<string, string>;
}

export interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  shippingDetails: ShippingDetails;
  paymentMethod: PaymentMethod;
  history?: OrderStatusUpdate[];
}

