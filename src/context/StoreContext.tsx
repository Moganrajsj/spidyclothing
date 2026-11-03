import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { CartLine, Notice } from '../types';
import { readJSON } from '../lib';
import { apiRequest } from '../lib/api';

export type Customer = { id: number; name: string; email: string; phone: string; avatarUrl?: string };
export type OrderDetails = {
  orderNumber: string; name: string; email: string; phone: string; paymentMethod: string; paymentStatus: string;
  orderStatus: string; subtotal: number; discount: number; shipping: number; total: number;
  createdAt?: string;
  items: { name: string; productId: string; size: string; color: string; quantity: number; total: number }[];
};
type Credentials = { email: string; password: string };
type Registration = Credentials & { name: string };
type CheckoutDetails = { name: string; phone: string; address: string; city: string; state: string; pincode: string; paymentMethod: string; couponCode: string };
type StoreValue = {
  cart: CartLine[]; wishlist: string[]; notices: Notice[]; user: Customer | null; authLoading: boolean;
  addToCart: (productId: string, size: string, color: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  toggleWishlist: (productId: string) => void; moveToWishlist: (productId: string, size: string, color?: string) => void;
  clearCart: () => void; createOrder: (details: CheckoutDetails) => Promise<OrderDetails>;
  login: (details: Credentials) => Promise<void>; register: (details: Registration) => Promise<void>; logout: () => Promise<void>;
  updateProfile: (details: { name: string; phone: string }) => Promise<void>;
  googleSignIn: (next?: string) => void;
  getOrders: () => Promise<OrderDetails[]>; getOrder: (orderNumber: string) => Promise<OrderDetails>;
  cancelOrder: (orderNumber: string, reason?: string) => Promise<void>;
  toast: (message: string) => void;
};
const StoreContext = createContext<StoreValue | null>(null);
const ownerKey = 'spidy-data-owner-v1';

function mergeCart(remote: CartLine[], guest: CartLine[]): CartLine[] {
  const combined = new Map<string, CartLine>();
  for (const item of [...remote, ...guest]) {
    const key = `${item.productId}|${item.size}|${item.color}`;
    const existing = combined.get(key);
    combined.set(key, { ...item, quantity: Math.min(99, (existing?.quantity || 0) + item.quantity) });
  }
  return [...combined.values()];
}

export function StoreProvider({ children }: PropsWithChildren) {
  const [cart, setCart] = useState<CartLine[]>(() => readJSON('spidy-cart-v2', []));
  const [wishlist, setWishlist] = useState<string[]>(() => readJSON('spidy-wishlist-v2', []));
  const [notices, setNotices] = useState<Notice[]>([]);
  const [user, setUser] = useState<Customer | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setNotices((current) => [...current, { id, message }]);
    window.setTimeout(() => setNotices((current) => current.filter((notice) => notice.id !== id)), 3200);
  }, []);

  const adoptUser = useCallback(async (customer: Customer) => {
    const [remoteCartResult, remoteWishlistResult] = await Promise.all([
      apiRequest<{ items: CartLine[] }>('/cart'), apiRequest<{ productIds: string[] }>('/wishlist'),
    ]);
    const owner = localStorage.getItem(ownerKey);
    const guestCart = owner ? [] : readJSON<CartLine[]>('spidy-cart-v2', []);
    const guestWishlist = owner ? [] : readJSON<string[]>('spidy-wishlist-v2', []);
    const nextCart = mergeCart(remoteCartResult.items, guestCart);
    const nextWishlist = [...new Set([...remoteWishlistResult.productIds, ...guestWishlist])];
    try {
      const [savedCart, savedWishlist] = await Promise.all([
        apiRequest<{ items: CartLine[] }>('/cart', { method: 'PUT', body: { items: nextCart } }),
        apiRequest<{ productIds: string[] }>('/wishlist', { method: 'PUT', body: { productIds: nextWishlist } }),
      ]);
      setCart(savedCart.items);
      setWishlist(savedWishlist.productIds);
    } catch {
      setCart(remoteCartResult.items);
      setWishlist(remoteWishlistResult.productIds);
      toast('Some saved items were unavailable and were left out.');
    }
    localStorage.setItem(ownerKey, String(customer.id));
    setUser(customer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    apiRequest<{ user: Customer | null }>('/auth/me')
      .then(async ({ user: customer }) => {
        if (!active || !customer) return;
        await adoptUser(customer);
      })
      .catch(() => {})
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, [adoptUser]);

  useEffect(() => { localStorage.setItem('spidy-cart-v2', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('spidy-wishlist-v2', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => {
    if (!user || authLoading) return;
    const timeout = window.setTimeout(() => {
      void apiRequest('/cart', { method: 'PUT', body: { items: cart } }).catch((error: Error) => toast(error.message));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [cart, user, authLoading, toast]);
  useEffect(() => {
    if (!user || authLoading) return;
    const timeout = window.setTimeout(() => {
      void apiRequest('/wishlist', { method: 'PUT', body: { productIds: wishlist } }).catch((error: Error) => toast(error.message));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [wishlist, user, authLoading, toast]);

  const addToCart = useCallback((productId: string, size: string, color: string, quantity = 1) => {
    setCart((current) => {
      const existing = current.find((line) => line.productId === productId && line.size === size && line.color === color);
      return existing ? current.map((line) => line === existing ? { ...line, quantity: Math.min(99, line.quantity + quantity) } : line) : [...current, { productId, size, color, quantity }];
    });
    toast('Added to cart');
  }, [toast]);

  const removeFromCart = useCallback((productId: string, size: string, color?: string) => {
    setCart((current) => current.filter((line) => line.productId !== productId || line.size !== size || (color !== undefined && line.color !== color)));
  }, []);
  const updateQuantity = useCallback((productId: string, size: string, quantity: number, color?: string) => {
    if (quantity < 1) return removeFromCart(productId, size, color);
    setCart((current) => current.map((line) => line.productId === productId && line.size === size && (color === undefined || line.color === color) ? { ...line, quantity: Math.min(99, quantity) } : line));
  }, [removeFromCart]);
  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((current) => {
      const exists = current.includes(productId);
      toast(exists ? 'Removed from wishlist' : 'Saved to wishlist');
      return exists ? current.filter((id) => id !== productId) : [...current, productId];
    });
  }, [toast]);
  const moveToWishlist = useCallback((productId: string, size: string, color?: string) => {
    setWishlist((current) => current.includes(productId) ? current : [...current, productId]);
    removeFromCart(productId, size, color);
    toast('Moved to wishlist');
  }, [removeFromCart, toast]);
  const clearCart = useCallback(() => setCart([]), []);

  const login = useCallback(async (details: Credentials) => {
    const result = await apiRequest<{ user: Customer }>('/auth/login', { method: 'POST', body: details });
    await adoptUser(result.user);
    toast(`Welcome back, ${result.user.name}.`);
  }, [adoptUser, toast]);
  const register = useCallback(async (details: Registration) => {
    const result = await apiRequest<{ user: Customer }>('/auth/register', { method: 'POST', body: details });
    await adoptUser(result.user);
    toast('Your Spidy account is ready.');
  }, [adoptUser, toast]);
  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST', body: {} });
    setUser(null);
    setCart([]);
    setWishlist([]);
    localStorage.removeItem(ownerKey);
    localStorage.removeItem('spidy-cart-v2');
    localStorage.removeItem('spidy-wishlist-v2');
    toast('You have signed out.');
  }, [toast]);
  const updateProfile = useCallback(async (details: { name: string; phone: string }) => {
    const result = await apiRequest<{ user: Customer }>('/auth/profile', { method: 'PUT', body: details });
    setUser(result.user);
    toast('Your profile has been saved.');
  }, [toast]);
  const googleSignIn = useCallback((next = '/account') => {
    window.location.href = `/api/auth/google/start?next=${encodeURIComponent(next)}`;
  }, []);
  const createOrder = useCallback(async (details: CheckoutDetails) => {
    const result = await apiRequest<{ order: OrderDetails }>('/orders', { method: 'POST', body: details });
    setCart([]);
    toast('Order placed. Payment is due on delivery.');
    return result.order;
  }, [toast]);
  const getOrders = useCallback(async () => (await apiRequest<{ orders: OrderDetails[] }>('/orders')).orders, []);
  const getOrder = useCallback(async (orderNumber: string) => (await apiRequest<{ order: OrderDetails }>(`/orders/${encodeURIComponent(orderNumber)}`)).order, []);
  const cancelOrder = useCallback(async (orderNumber: string, reason?: string) => {
    await apiRequest<{ ok: boolean }>(`/orders/${encodeURIComponent(orderNumber)}/cancel`, {
      method: 'POST',
      body: { reason },
    });
    toast('Order cancelled successfully.');
  }, [toast]);

  const value = useMemo(() => ({ cart, wishlist, notices, user, authLoading, addToCart, removeFromCart, updateQuantity, toggleWishlist, moveToWishlist, clearCart, createOrder, login, register, logout, updateProfile, googleSignIn, getOrders, getOrder, cancelOrder, toast }), [cart, wishlist, notices, user, authLoading, addToCart, removeFromCart, updateQuantity, toggleWishlist, moveToWishlist, clearCart, createOrder, login, register, logout, updateProfile, googleSignIn, getOrders, getOrder, cancelOrder, toast]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used within StoreProvider');
  return value;
};
