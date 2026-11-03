import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { CartLine, Product } from '../types';
import { formatPrice } from '../lib';
import { useStore } from '../context/StoreContext';
import type { OrderDetails } from '../context/StoreContext';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';
import { AuthPanel } from '../components/AuthPanel';
import { SectionHeading } from './HomePage';

export function CartPage({ quickAdd }: { quickAdd: (product: Product) => void }) {
  const { products } = useCatalog();
  const { cart, removeFromCart, updateQuantity, moveToWishlist, user } = useStore();
  const [coupon, setCoupon] = useState(() => sessionStorage.getItem('spidy-coupon-v2') || '');
  const [activeCoupon, setActiveCoupon] = useState(() => sessionStorage.getItem('spidy-coupon-v2') || '');
  const [discount, setDiscount] = useState(() => Number(sessionStorage.getItem('spidy-coupon-discount-v2') || 0));
  const [couponMessage, setCouponMessage] = useState('');
  const navigate = useNavigate();
  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.price || 0) * line.quantity, 0), [cart, products]);
  const shipping = subtotal >= 1499 || subtotal === 0 ? 0 : 79;
  const total = Math.max(0, subtotal - discount + shipping);

  useEffect(() => { if (activeCoupon) sessionStorage.setItem('spidy-coupon-v2', activeCoupon); else { sessionStorage.removeItem('spidy-coupon-v2'); sessionStorage.removeItem('spidy-coupon-discount-v2'); } }, [activeCoupon]);
  useEffect(() => {
    if (!activeCoupon || !subtotal) { setDiscount(0); return; }
    let live = true;
    fetch('/api/coupons/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: activeCoupon, subtotal }) })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; })
      .then((result) => { if (live) { setDiscount(result.discount); sessionStorage.setItem('spidy-coupon-discount-v2', String(result.discount)); } })
      .catch((error) => { if (live) { setActiveCoupon(''); setDiscount(0); setCouponMessage(error.message || 'Coupon could not be applied.'); } });
    return () => { live = false; };
  }, [activeCoupon, subtotal]);
  const apply = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) { setCouponMessage('Enter a coupon code.'); return; }
    try {
      const response = await fetch('/api/coupons/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, subtotal }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setActiveCoupon(code); setDiscount(result.discount); setCouponMessage(`${code} applied`); sessionStorage.setItem('spidy-coupon-discount-v2', String(result.discount));
    } catch (error) { setActiveCoupon(''); setDiscount(0); setCouponMessage(error instanceof Error ? error.message : 'Coupon could not be applied.'); }
  };

  return <>
    <main className="container cart-page">
      <div className="checkout-steps"><b>01 <span>CART</span></b><i/><span>02 &nbsp; ADDRESS</span><i/><span>03 &nbsp; PAYMENT</span></div>
      {cart.length === 0 ? <div className="empty-state"><span className="empty-icon"><ShoppingBag size={36}/></span><h1>Your cart's taking a breather.</h1><p>Let's find a few things you'll want to wear on repeat.</p><Link className="button button-primary" to="/shop">CONTINUE SHOPPING <ArrowRight size={15}/></Link></div> : <>
        <h1 className="cart-title">YOUR SHOPPING CART <small>({cart.reduce((count, line) => count + line.quantity, 0)} items)</small></h1>
        <div className="shipping-progress"><p>{subtotal >= 1499 ? 'You unlocked free shipping!' : `You’re ${formatPrice(1499 - subtotal)} away from free shipping`}</p><div><i style={{ width: `${Math.min(100, subtotal / 1499 * 100)}%` }}/></div></div>
        <div className="cart-layout">
          <section className="cart-items">{cart.map((line) => {
            const product = products.find((item) => item.id === line.productId);
            if (!product) return null;
            return <article className="cart-line" key={`${line.productId}-${line.size}-${line.color}`}>
              <Link to={`/product/${product.slug}`}><img src={product.images[0]} alt={product.name}/></Link>
              <div className="cart-line-info"><Link to={`/product/${product.slug}`}><strong>{product.name}</strong></Link><p>Size {line.size} · {line.color}</p>
                <div className="cart-line-actions"><button onClick={() => removeFromCart(line.productId, line.size, line.color)}><Trash2 size={13}/> REMOVE</button><button onClick={() => moveToWishlist(line.productId, line.size, line.color)}>MOVE TO WISHLIST</button></div>
                <div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => updateQuantity(line.productId, line.size, line.quantity - 1, line.color)}><Minus size={13}/></button><span>{line.quantity}</span><button aria-label="Increase quantity" onClick={() => updateQuantity(line.productId, line.size, line.quantity + 1, line.color)}><Plus size={13}/></button></div>
              </div><strong className="cart-line-total">{formatPrice(product.price * line.quantity)}</strong>
            </article>;
          })}</section>
          <aside className="order-summary"><h2>ORDER SUMMARY</h2><div className="summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div><div className="summary-row"><span>Discount</span><span className="discount-value">−{formatPrice(discount)}</span></div><div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
            <div className="coupon-row"><label className="sr-only" htmlFor="coupon">Coupon code</label><input id="coupon" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Coupon code"/><button onClick={apply}>APPLY</button></div>{couponMessage && <p className="coupon-message">{couponMessage}</p>}
            <div className="summary-total"><span>TOTAL</span><strong>{formatPrice(total)}</strong></div><button className="button button-primary full-width" onClick={() => navigate('/checkout')}>PROCEED TO CHECKOUT <ArrowRight size={15}/></button>{!user&&<p className="checkout-hint">You’ll sign in or create an account at checkout.</p>}<p className="secure-caption">Secure checkout · Cash on delivery</p>
          </aside>
        </div>
        <section className="complete-look"><SectionHeading kicker="A FEW GOOD ADDITIONS" title="COMPLETE THE LOOK"/><div className="product-grid">{products.slice(19, 24).map((product) => <ProductCard key={product.id} product={product} onQuickAdd={quickAdd}/>)}</div></section>
      </>}
    </main>
    {cart.length > 0 && <div className="mobile-cart-bar"><span>TOTAL <strong>{formatPrice(total)}</strong></span><button className="button button-primary" onClick={() => navigate('/checkout')}>CHECKOUT <ArrowRight size={15}/></button></div>}
  </>;
}

export function CheckoutPage() {
  const { cart, user, authLoading, createOrder } = useStore();
  const { products } = useCatalog();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const subtotal = cart.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.price || 0) * line.quantity, 0);
  const code = sessionStorage.getItem('spidy-coupon-v2') || '';
  const discount = Number(sessionStorage.getItem('spidy-coupon-discount-v2') || 0);
  const total = subtotal - discount + (subtotal >= 1499 ? 0 : 79);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    setSubmitError('');
    try {
      const order = await createOrder({
        name: String(values.get('name') || ''), phone: String(values.get('phone') || ''),
        address: String(values.get('address') || ''), city: String(values.get('city') || ''),
        state: String(values.get('state') || ''), pincode: String(values.get('pincode') || ''),
        paymentMethod: 'cod', couponCode: code,
      });
      sessionStorage.removeItem('spidy-coupon-v2');
      sessionStorage.removeItem('spidy-coupon-discount-v2');
      navigate(`/order-success/${encodeURIComponent(order.orderNumber)}`, { state: { order } });
    } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Unable to place your order.'); }
  };

  if (!cart.length) return <main className="container empty-state checkout-empty"><h1>Your cart is empty</h1><Link className="button button-primary" to="/shop">SHOP THE COLLECTION</Link></main>;
  if (authLoading) return <main className="container route-loading"><span className="loading-block"/><span className="loading-block"/></main>;
  if (!user) return <main className="container checkout-page">
    <div className="checkout-steps"><Link to="/cart">01 &nbsp; CART</Link><i/><b>02 <span>ACCOUNT</span></b><i/><span>03 &nbsp; PAYMENT</span></div><h1>CHECKOUT</h1>
    <div className="checkout-layout">
      <section className="address-form checkout-auth">
        <AuthPanel next="/checkout" title="Sign in or create an account" note="Create an account to check out, save your cart across devices, and track every order. It only takes a moment."/>
      </section>
      <CheckoutSummary cart={cart} products={products} subtotal={subtotal} discount={discount} total={total}/>
    </div>
  </main>;

  return <main className="container checkout-page">
    <div className="checkout-steps"><Link to="/cart">01 &nbsp; CART</Link><i/><b>02 <span>ADDRESS</span></b><i/><span>03 &nbsp; PAYMENT</span></div><h1>CHECKOUT</h1>
    <div className="checkout-layout">
      <form id="checkout-form" className="address-form" onSubmit={submit}>
        <section><h2>Contact details</h2><div className="form-grid"><label>Full name<input name="name" autoComplete="name" required minLength={2} defaultValue={user.name} placeholder="Your full name"/></label><label>Phone number<input name="phone" autoComplete="tel" required pattern="[6-9][0-9]{9}" maxLength={10} inputMode="numeric" defaultValue={user.phone} placeholder="10-digit mobile number"/></label><div className="wide"><span className="field-label">Email address</span><p className="checkout-email">{user.email}</p></div></div></section>
        <section><h2>Delivery address</h2><div className="form-grid"><label className="wide">Address<input name="address" autoComplete="street-address" required minLength={6} placeholder="House / flat, street, area"/></label><label>City<input name="city" autoComplete="address-level2" required placeholder="City"/></label><label>State<input name="state" autoComplete="address-level1" required placeholder="State"/></label><label>Pincode<input name="pincode" autoComplete="postal-code" required pattern="[1-9][0-9]{5}" maxLength={6} inputMode="numeric" placeholder="6-digit pincode"/></label></div></section>
        <section><h2>Choose how to pay</h2><div className="payment-options"><label className="chosen"><input type="radio" name="payment" value="cod" checked readOnly/><span><strong>Cash on Delivery</strong><small>Pay when your order arrives</small></span><b>COD</b></label><p className="demo-note">UPI and card payments will be available once online payments are connected.</p></div></section>
        {submitError && <p className="form-error" role="alert">{submitError}</p>}
        <button className="button button-primary checkout-submit">PLACE COD ORDER · {formatPrice(total)}</button>
      </form>
      <CheckoutSummary cart={cart} products={products} subtotal={subtotal} discount={discount} total={total}/>
    </div>
  </main>;
}

function CheckoutSummary({ cart, products, subtotal, discount, total }: { cart: CartLine[]; products: Product[]; subtotal: number; discount: number; total: number }) {
  return <aside className="order-summary checkout-summary"><h2>YOUR ORDER</h2>{cart.map((line) => { const product = products.find((item) => item.id === line.productId); return product ? <div className="summary-row" key={`${line.productId}-${line.size}-${line.color}`}><span>{product.name} · {line.size} · {line.color} × {line.quantity}</span><span>{formatPrice(product.price * line.quantity)}</span></div> : null; })}<div className="summary-row"><span>Shipping</span><span>{subtotal >= 1499 ? 'FREE' : formatPrice(79)}</span></div><div className="summary-row"><span>Discount</span><span className="discount-value">−{formatPrice(discount)}</span></div><div className="summary-total"><span>TOTAL</span><strong>{formatPrice(total)}</strong></div></aside>;
}

export function OrderSuccessPage() {
  const { state } = useLocation();
  const { orderNumber = '' } = useParams();
  const { getOrder, cancelOrder, user } = useStore();
  const routeOrder = (state as { order?: OrderDetails } | null)?.order || null;
  const [order, setOrder] = useState<OrderDetails | null>(routeOrder);
  const [loading, setLoading] = useState(!routeOrder && Boolean(orderNumber));
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (routeOrder || !orderNumber || !user) return;
    let active = true;
    getOrder(orderNumber).then((result) => { if (active) setOrder(result); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [routeOrder, orderNumber, user, getOrder]);

  const handleCancel = async () => {
    if (!order || !window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      setCancelling(true);
      await cancelOrder(order.orderNumber, 'Customer cancelled from order page');
      setOrder((prev) => (prev ? { ...prev, orderStatus: 'cancelled' } : null));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <main className="container route-loading"><span className="loading-block"/><span className="loading-block"/></main>;
  if (!order) return <main className="container empty-state"><h1>Order details unavailable.</h1><Link className="button button-primary" to="/account">SIGN IN TO VIEW YOUR ORDERS</Link></main>;
  const isCancelled = order.orderStatus === 'cancelled';
  return <main className="container success-page">
    <div className="success-mark" style={isCancelled ? { background: '#FFF1F2', color: '#E02438' } : undefined}>
      <Check size={30}/>
    </div>
    <p className="eyebrow" style={isCancelled ? { color: '#E02438' } : undefined}>
      {isCancelled ? 'ORDER CANCELLED' : 'ORDER CONFIRMED'}
    </p>
    <h1>{isCancelled ? 'This order was cancelled.' : 'Thanks for choosing Spidy.'}</h1>
    <p>{isCancelled ? 'A confirmation email with refund details has been sent to your email.' : 'Your order is saved. Pay when it arrives.'}</p>
    <div className="order-id">ORDER ID <strong>{order.orderNumber}</strong></div>
    <div className="success-summary">
      <h2>ORDER SUMMARY</h2>
      {order.items.map((item, index) => <div className="summary-row" key={`${item.productId}-${item.size}-${index}`}><span>{item.name} · {item.size} · {item.color} × {item.quantity}</span><span>{formatPrice(item.total)}</span></div>)}
      <div className="summary-row"><span>Payment method</span><span>CASH ON DELIVERY</span></div>
      <div className="summary-total"><span>TOTAL</span><strong>{formatPrice(order.total)}</strong></div>
      <p className="demo-note">Payment is due on delivery. Order status: <strong style={{ textTransform: 'uppercase' }}>{order.orderStatus}</strong>.</p>
    </div>
    <div className="success-actions">
      <Link className="button button-primary" to="/shop">CONTINUE SHOPPING</Link>
      {order.orderStatus === 'pending' && <button className="button button-outline" onClick={handleCancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'CANCEL ORDER'}</button>}
      <Link className="button button-outline" to="/account">MY ACCOUNT</Link>
    </div>
  </main>;
}
