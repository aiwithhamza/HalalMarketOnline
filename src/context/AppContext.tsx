import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Product, CartItem, Order, OrderStatus, ShippingDetails, PaymentMethod, SUPPORTED_CURRENCIES, Notification, ChatMessage, ChatConversation, Review } from '../types';
import { io, Socket } from 'socket.io-client';

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  PKR: 278.5,
  CNY: 7.23,
  GBP: 0.79,
  JPY: 151.30,
  AUD: 1.52,
  CAD: 1.35,
  CHF: 0.90,
  HKD: 7.82,
  SGD: 1.34,
  AED: 3.67,
  SAR: 3.75,
  INR: 83.30,
  BDT: 109.50,
  TRY: 32.20,
  MYR: 4.73,
  IDR: 15850,
  ZAR: 18.80,
  NZD: 1.66,
  BRL: 5.05,
};

interface AppContextType {
  currentUser: User | null;
  preferredCurrency: string;
  setPreferredCurrency: (code: string) => void;
  formatPrice: (amount: number, fromCurrency?: string) => string;
  convertPrice: (amount: number, fromCurrency: string, toCurrency: string) => number;
  login: (user: User, token: string) => void;
  logout: () => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'vendorId' | 'vendorName'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, selectedVariations?: Record<string, string>) => void;
  removeFromCart: (productId: string, selectedVariations?: Record<string, string>) => void;
  clearCart: () => void;
  orders: Order[];
  placeOrder: (shippingDetails: ShippingDetails, paymentMethod: PaymentMethod) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, description?: string) => Promise<void>;
  vendors: User[];
  updateVendorProfile: (vendor: User) => Promise<void>;
  updateUserProfile: (user: Partial<User>) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  adminStats: any;
  adminVendors: User[];
  adminProducts: Product[];
  adminOrders: Order[];
  adminCustomers: User[];
  fetchAdminStats: () => Promise<void>;
  fetchAdminVendors: () => Promise<void>;
  fetchAdminProducts: () => Promise<void>;
  fetchAdminOrders: () => Promise<void>;
  fetchAdminCustomers: () => Promise<void>;
  updateVendorStatus: (vendorId: string, status: string) => Promise<void>;
  deleteUserAdmin: (id: string) => Promise<void>;
  deleteProductAdmin: (id: string) => Promise<void>;
  updateOrderStatusAdmin: (orderId: string, status: OrderStatus, description?: string) => Promise<void>;
  customers: User[];
  isAuthReady: boolean;
  notifications: Notification[];
  markNotificationAsRead: (id: string) => Promise<void>;
  conversations: ChatConversation[];
  activeMessages: ChatMessage[];
  activeChatUserId: string | null;
  setActiveChatUserId: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (otherUserId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  fetchProductReviews: (productId: string) => Promise<Review[]>;
  fetchVendorReviews: (vendorId: string) => Promise<Review[]>;
  submitReview: (review: { productId?: string, vendorId?: string, rating: number, comment: string }) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [preferredCurrency, setPreferredCurrency] = useState<string>(() => {
    return localStorage.getItem('preferredCurrency') || 'original';
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    localStorage.setItem('preferredCurrency', preferredCurrency);
  }, [preferredCurrency]);

  const convertPrice = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    const baseAmount = amount / (EXCHANGE_RATES[fromCurrency] || 1);
    return baseAmount * (EXCHANGE_RATES[toCurrency] || 1);
  };

  const formatPrice = (amount: number, fromCurrency: string = 'USD'): string => {
    const targetCurrency = preferredCurrency === 'original' ? fromCurrency : preferredCurrency;
    const converted = convertPrice(amount, fromCurrency, targetCurrency);
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === targetCurrency) || SUPPORTED_CURRENCIES[0];
    const symbol = currency.code === 'original' ? '' : currency.symbol;
    
    // If it's original, we still need a symbol. If fromCurrency is not in SUPPORTED_CURRENCIES, we use its code.
    const displaySymbol = symbol || SUPPORTED_CURRENCIES.find(c => c.code === fromCurrency)?.symbol || fromCurrency;
    
    return `${displaySymbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('halal_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminVendors, setAdminVendors] = useState<User[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const activeChatUserIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    activeChatUserIdRef.current = activeChatUserId;
  }, [activeChatUserId]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const handleResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}...`);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/users/vendors');
      if (res.ok) {
        const data = await handleResponse(res);
        setVendors(data.vendors || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrders(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setNotifications(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminStats = async () => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAdminStats(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminVendors = async () => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/vendors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAdminVendors(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminProducts = async () => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAdminProducts(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminOrders = async () => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAdminOrders(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminCustomers = async () => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAdminCustomers(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await handleResponse(res);
            setCurrentUser(data.user);
          } else {
            setToken(null);
            localStorage.removeItem('auth_token');
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsAuthReady(true);
    };
    initAuth();
  }, [token]);

  useEffect(() => {
    fetchProducts();
    fetchVendors();
    if (token) {
      fetchOrders();
      fetchNotifications();
      fetchConversations();
      if (currentUser?.role === 'admin') {
        fetchAdminStats();
        fetchAdminVendors();
        fetchAdminProducts();
        fetchAdminOrders();
        fetchAdminCustomers();
      }
    }

    const newSocket = io();
    setSocket(newSocket);

    if (currentUser) {
      newSocket.emit('join', currentUser.id);
    }

    newSocket.on('products_updated', fetchProducts);
    newSocket.on('vendors_updated', fetchVendors);
    newSocket.on('orders_updated', () => {
      if (token) fetchOrders();
    });
    newSocket.on('notifications_updated', () => {
      if (token) fetchNotifications();
    });
    newSocket.on('new_message', (message: ChatMessage) => {
      const activeId = activeChatUserIdRef.current;
      const currentUserId = currentUserRef.current?.id;
      
      // If the message is for the current active chat, add it to activeMessages
      setActiveMessages(prev => {
        const isFromActive = message.senderId === activeId;
        const isToActive = message.receiverId === activeId;
        const isFromMe = message.senderId === currentUserId;
        const isToMe = message.receiverId === currentUserId;

        if ((isFromActive && isToMe) || (isFromMe && isToActive)) {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        }
        return prev;
      });
      // Always refresh conversations list
      fetchConversations();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('halal_cart', JSON.stringify(cart));
  }, [cart]);

  const login = (user: User, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  const addProduct = async (product: Omit<Product, 'id' | 'vendorId' | 'vendorName'>) => {
    if (!currentUser || currentUser.role !== 'vendor' || !token) return;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...product,
          vendorName: currentUser.storeName || currentUser.name
        })
      });
      if (res.ok) {
        await fetchProducts();
      } else {
        const errorData = await handleResponse(res);
        throw new Error(errorData.error || 'Failed to add product');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updateProduct = async (product: Product) => {
    if (!token) return;
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(product)
    });
  };

  const deleteProduct = async (id: string) => {
    if (!token) return;
    await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const addToCart = (product: Product, quantity: number, selectedVariations?: Record<string, string>) => {
    setCart(prev => {
      const existingItemIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        JSON.stringify(item.selectedVariations) === JSON.stringify(selectedVariations || {})
      );

      if (existingItemIndex >= 0) {
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      }

      return [...prev, {
        product,
        quantity,
        selectedVariations
      }];
    });
  };

  const removeFromCart = (productId: string, selectedVariations?: Record<string, string>) => {
    setCart(prev => prev.filter(item => 
      !(item.product.id === productId && JSON.stringify(item.selectedVariations) === JSON.stringify(selectedVariations || {}))
    ));
  };

  const clearCart = () => setCart([]);

  const placeOrder = async (shippingDetails: ShippingDetails, paymentMethod: PaymentMethod) => {
    if (!currentUser || cart.length === 0 || !token) return;

    // Group cart items by vendor
    const itemsByVendor = cart.reduce((acc, item) => {
      if (!acc[item.product.vendorId]) acc[item.product.vendorId] = [];
      acc[item.product.vendorId].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);

    // Create an order for each vendor
    for (const [vendorId, items] of Object.entries(itemsByVendor)) {
      const vendor = vendors.find(v => v.id === vendorId);
      const totalAmount = (items as CartItem[]).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

      const orderItems = (items as CartItem[]).map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        selectedVariations: item.selectedVariations,
        imageUrl: item.product.imageUrl
      }));

      await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vendorId,
          vendorName: vendor?.storeName || vendor?.name || 'Unknown Vendor',
          items: orderItems,
          totalAmount,
          shippingDetails,
          paymentMethod
        })
      });
    }

    clearCart();
    
    // Update local user state with new shipping details
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        lastShippingDetails: shippingDetails
      });
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, description?: string) => {
    if (!token) return;
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status, description })
    });
  };

  const updateVendorProfile = async (vendor: User) => {
    if (!token) return;
    await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(vendor)
    });
    setCurrentUser(vendor);
  };

  const updateUserProfile = async (userData: Partial<User>) => {
    if (!token || !currentUser) return;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...currentUser, ...userData })
      });
      if (res.ok) {
        setCurrentUser({ ...currentUser, ...userData } as User);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!token || !currentUser) return;
    try {
      const res = await fetch('/api/users/wishlist', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        const data = await handleResponse(res);
        setCurrentUser({ ...currentUser, wishlist: data.wishlist });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateVendorStatus = async (vendorId: string, status: string) => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAdminVendors();
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUserAdmin = async (id: string) => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminVendors();
        fetchAdminCustomers();
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProductAdmin = async (id: string) => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminProducts();
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateOrderStatusAdmin = async (orderId: string, status: OrderStatus, description?: string) => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, description })
      });
      if (res.ok) {
        fetchAdminOrders();
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setConversations(await handleResponse(res));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!token) return;
    setActiveChatUserId(otherUserId);
    try {
      const res = await fetch(`/api/chat/messages/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActiveMessages(await handleResponse(res));
        fetchConversations(); // Refresh unread counts
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (receiverId: string, content: string) => {
    if (!token || !content.trim()) return;
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId, content })
      });
      if (res.ok) {
        // Message will be added via socket event
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitReview = async (review: { productId?: string, vendorId?: string, rating: number, comment: string }) => {
    if (!token) return;
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(review)
      });
      if (res.ok) {
        fetchProducts();
        fetchVendors();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProductReviews = async (productId: string): Promise<Review[]> => {
    try {
      const res = await fetch(`/api/reviews/product/${productId}`);
      if (res.ok) return await handleResponse(res);
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const fetchVendorReviews = async (vendorId: string): Promise<Review[]> => {
    try {
      const res = await fetch(`/api/reviews/vendor/${vendorId}`);
      if (res.ok) return await handleResponse(res);
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      preferredCurrency,
      setPreferredCurrency,
      formatPrice,
      convertPrice,
      login,
      logout,
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      orders,
      placeOrder,
      updateOrderStatus,
      vendors,
      updateVendorProfile,
      updateUserProfile,
      toggleWishlist,
      adminStats,
      adminVendors,
      adminProducts,
      adminOrders,
      adminCustomers,
      fetchAdminStats,
      fetchAdminVendors,
      fetchAdminProducts,
      fetchAdminOrders,
      fetchAdminCustomers,
      updateVendorStatus,
      deleteUserAdmin,
      deleteProductAdmin,
      updateOrderStatusAdmin,
      customers,
      isAuthReady,
      notifications,
      markNotificationAsRead,
      conversations,
      activeMessages,
      activeChatUserId,
      setActiveChatUserId,
      fetchConversations,
      fetchMessages,
      sendMessage,
      fetchProductReviews,
      fetchVendorReviews,
      submitReview
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
