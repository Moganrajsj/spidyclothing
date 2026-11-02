import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  ArrowRight, BadgeIndianRupee, Banknote, ChevronLeft, ChevronRight, Clock3, Copy, Instagram,
  Layers, MapPin, Repeat2, RotateCcw, Ruler, ShieldCheck, Sparkles, Truck, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { categoryLabels, formatPrice } from '../lib';
import { apiRequest } from '../lib/api';
import { trackEvent } from '../lib/analytics';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { useCatalog } from '../context/CatalogContext';

const RECENT_KEY = 'spidy-recently-viewed';
const trendingIds = ['tee-crimson', 'tee-oversized', 'shirt-linen', 'shirt-weekend', 'cargo-olive', 'cargo-canvas'];
const mostSellingIds = ['tee-crimson', 'shirt-oxford', 'jean-slim', 'cargo-utility', 'tee-core', 'jean-dark'];
const looks = {
  shirt: { src: '/images/campaign-shirt.webp', alt: 'Model in an ivory shirt and black trousers' },
  overshirt: { src: '/images/campaign-overshirt.webp', alt: 'Model in a navy overshirt and relaxed denim' },
  olive: { src: '/images/campaign-olive.webp', alt: 'Model in an olive overshirt and black trousers' },
  cargo: { src: '/images/campaign-cargo.webp', alt: 'Model in a white tee and relaxed cargo trousers' },
};

const benefits = [
  { icon: Truck, title: 'Free shipping', note: 'On orders above ₹1,499' },
  { icon: Banknote, title: 'Cash on delivery', note: 'Pay when it reaches you' },
  { icon: RotateCcw, title: 'Easy returns', note: '7-day returns and exchanges' },
  { icon: ShieldCheck, title: 'Secure checkout', note: 'Your details stay protected' },
];

const values = [
  { icon: Layers, title: 'Fabric first', note: 'Breathable cottons and sturdy weaves chosen for daily wear, not just the first wash.' },
  { icon: Ruler, title: 'Fits that work', note: 'Slim, regular, and relaxed cuts sized so you can pick a silhouette, not guess.' },
  { icon: Repeat2, title: 'Made to repeat', note: 'Everyday pieces built to rotate through the week without losing shape.' },
  { icon: BadgeIndianRupee, title: 'Honest pricing', note: 'Direct-to-you pricing with no inflated tags and no seasonal markups.' },
];

const fits = [
  { name: 'Slim', note: 'Close through the chest and waist with a clean, tapered leg.' },
  { name: 'Regular', note: 'The everyday standard: room to move without extra fabric.' },
  { name: 'Relaxed', note: 'A looser drape through the body and leg for an easy silhouette.' },
];

const reviews = [
  { name: 'Arjun M.', stars: 5, text: 'The cotton tee has held its shape after a dozen washes. Fit is exactly as described.', tag: 'Verified buyer' },
  { name: 'Rohit K.', stars: 5, text: 'Ordered the linen shirt for a wedding and wore it again the next weekend. Light and sharp.', tag: 'Verified buyer' },
  { name: 'Sanjay P.', stars: 4, text: 'Cargos are sturdy without feeling heavy. Delivery was quick and the COD option helped.', tag: 'Verified buyer' },
];

const faqs = [
  { q: 'How long does delivery take?', a: 'Orders are dispatched within 1–2 working days and usually arrive in 3–6 working days. You will get tracking details once the parcel leaves our warehouse.' },
  { q: 'Do you offer cash on delivery?', a: 'Yes. Cash on delivery is available across India. You pay the courier when the order reaches you.' },
  { q: 'What is your return policy?', a: 'Unused items with tags intact can be returned or exchanged within 7 days of delivery. Start a request from the contact page and we will guide you through it.' },
  { q: 'How do I choose the right size?', a: 'Use the size guide on any product page, or open the fit guide on this page. If you are between sizes, size up for a relaxed fit or stay true to size for a regular fit.' },
  { q: 'Can I change or cancel an order?', a: 'Contact us as soon as possible. We can usually update an order before it is packed; once dispatched, it follows the return process.' },
  { q: 'How do I track my order?', a: 'Sign in and open your account to see order history, or use the tracking link sent with your dispatch email.' },
];

const curatedProducts = (ids: string[], products: Product[]) => ids.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));

export function HomePage({ quickAdd }: { quickAdd: (product: Product) => void }) {
  const [look, setLook] = useState<keyof typeof looks>('shirt');
  const { products: list, loading } = useCatalog();
  const { toast, user } = useStore();
  const [sizeGuide, setSizeGuide] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(stored)) setRecentIds(stored.filter((id): id is string => typeof id === 'string'));
    } catch { setRecentIds([]); }
  }, []);

  useEffect(() => {
    if (!sizeGuide) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setSizeGuide(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sizeGuide]);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-look]');
    const observer = new IntersectionObserver((entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const next = active?.target.getAttribute('data-look') as keyof typeof looks | undefined;
      if (next && next in looks) setLook(next);
      active?.target.classList.add('is-visible');
    }, { rootMargin: '-18% 0px -42% 0px', threshold: [0.15, 0.35, 0.6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [list.length, recentIds.length]);

  const ranked = useMemo(() => [...list].sort((a, b) => (b.rating * Math.log10(b.reviewCount + 10)) - (a.rating * Math.log10(a.reviewCount + 10))), [list]);
  const fillShelf = (ids: string[]) => {
    const picked = curatedProducts(ids, list);
    const seen = new Set(picked.map((product) => product.id));
    for (const product of ranked) {
      if (picked.length >= 6) break;
      if (!seen.has(product.id)) { picked.push(product); seen.add(product.id); }
    }
    return picked;
  };
  const trendingProducts = fillShelf(trendingIds);
  const mostSellingProducts = fillShelf(mostSellingIds);
  const newArrivals = (list.some((product) => product.badge === 'NEW') ? list.filter((product) => product.badge === 'NEW') : ranked).slice(0, 5);
  const recentlyViewed = recentIds.map((id) => list.find((product) => product.id === id)).filter((product): product is Product => Boolean(product)).slice(0, 6);
  const ugcProducts = list.filter((product) => product.images[0]).slice(0, 6);

  const reviewStats = useMemo(() => {
    const total = list.reduce((sum, product) => sum + product.reviewCount, 0);
    const weighted = list.reduce((sum, product) => sum + product.rating * product.reviewCount, 0);
    return { total, average: total ? weighted / total : 0 };
  }, [list]);

  const welcomeName = user ? (user.name || user.email).split(' ')[0] : '';

  const copyCoupon = async () => {
    trackEvent('home_coupon_copy', { code: 'SPIDY10' });
    try {
      await navigator.clipboard.writeText('SPIDY10');
      toast('Coupon SPIDY10 copied.');
    } catch {
      toast('Use code SPIDY10 at checkout.');
    }
  };

  return <main className="home-lookbook">
    <aside className="lookbook-stage" aria-label="Spidy Clothing campaign">
      <div className="lookbook-media">{Object.entries(looks).map(([key, item], index) => <img key={key} className={look === key ? 'active' : ''} src={item.src} alt={look === key ? item.alt : ''} aria-hidden={look !== key} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'low'} decoding="async"/>)}</div>
    </aside>
    <div className="lookbook-copy">
      <section className="lookbook-intro" data-look="shirt">
        <p className="lookbook-overline">{user ? `WELCOME BACK, ${welcomeName.toUpperCase()}` : 'SPIDY CLOTHING · EVERYDAY MENSWEAR'}</p>
        <h1>Spidy<br/>Clothing</h1>
        <p className="lookbook-lead">Men’s shirts, tees, pants, and more for repeat wear.</p>
        <div className="lookbook-actions">
          <Link className="lookbook-primary" to="/shop?tag=new" onClick={() => trackEvent('home_hero_cta', { target: 'new_arrivals' })}>Shop new arrivals <ArrowRight size={18}/></Link>
          <Link className="lookbook-text-link" to="/shop" onClick={() => trackEvent('home_hero_cta', { target: 'browse_all' })}>Browse everything</Link>
          <Link className="lookbook-text-link lookbook-account-link" to="/account" onClick={() => trackEvent('home_hero_cta', { target: user ? 'account' : 'sign_in' })}>{user ? 'Your account' : 'Sign in'}</Link>
        </div>
      </section>

      <section className="lookbook-section home-trust" aria-label="Why shop with Spidy" data-look="shirt">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return <div className="home-trust-item" key={benefit.title}><Icon size={20} strokeWidth={1.6}/><div><strong>{benefit.title}</strong><span>{benefit.note}</span></div></div>;
        })}
      </section>

      <section className="lookbook-section category-index" aria-labelledby="category-heading" data-look="olive">
        <h2 id="category-heading">Shop by category</h2>
        <p>Pick a starting point.</p>
        <div className="category-index-list">{Object.entries(categoryLabels).map(([slug, label]) => <Link key={slug} to={`/shop/${slug}`} onClick={() => trackEvent('home_category_click', { category: slug })}><span>{label}</span><ArrowRight size={17}/></Link>)}</div>
      </section>

      <section className="lookbook-section home-offer" aria-labelledby="offer-heading" data-look="overshirt">
        <div className="home-offer-copy"><p className="eyebrow">FIRST ORDER OFFER</p><strong id="offer-heading">10% off your first order.</strong><span>Use the code at checkout.</span></div>
        <div className="home-coupon"><code>SPIDY10</code><button type="button" onClick={() => void copyCoupon()}><Copy size={15}/> COPY CODE</button></div>
      </section>

      {loading && !list.length ? <SkeletonShelf/> : <ProductShelf title="Trending now" description="Pieces getting noticed." products={trendingProducts} onQuickAdd={quickAdd} to="/shop?tag=new" action="Shop new" look="overshirt"/>}
      {loading && !list.length ? <SkeletonShelf/> : <ProductShelf title="Most selling" description="Customer favourites in the rotation." products={mostSellingProducts} onQuickAdd={quickAdd} to="/shop" action="Shop all" look="cargo"/>}

      {loading && !list.length ? <SkeletonShelf/> : <section className="lookbook-section arrival-list" aria-labelledby="arrival-heading" data-look="shirt">
        <div className="section-title-row"><div><h2 id="arrival-heading">Just landed</h2><p>New pieces in the rotation.</p></div><Link to="/shop?tag=new">View all <ArrowRight size={15}/></Link></div>
        {newArrivals.length ? <div className="arrival-products">{newArrivals.map((product) => <article className="arrival-row" key={product.id}>
          <Link className="arrival-image" to={`/product/${product.slug}`} aria-label={`View ${product.name}`}><img loading="lazy" src={product.images[0]} alt=""/></Link>
          <div className="arrival-copy"><Link to={`/product/${product.slug}`}>{product.name}</Link><span>{product.fit} fit</span><strong>{formatPrice(product.price)}</strong></div>
          <button className="arrival-add" onClick={() => quickAdd(product)} aria-label={`Choose size for ${product.name}`}>+</button>
        </article>)}</div> : <p className="shelf-empty">New pieces are on the way. Check back soon.</p>}
      </section>}

      {recentlyViewed.length > 0 && <ProductShelf title="Recently viewed" description="Pick up where you left off." products={recentlyViewed} onQuickAdd={quickAdd} to="/shop" action="Shop all" look="shirt"/>}

      <section className="lookbook-section home-reviews" aria-labelledby="reviews-heading" data-look="olive">
        <div className="section-title-row home-reviews-head">
          <div><h2 id="reviews-heading">Loved by our customers</h2><p>Real notes from people wearing Spidy on repeat.</p></div>
          <div className="home-rating-summary" aria-label={reviewStats.total ? `Average rating ${reviewStats.average.toFixed(1)} out of 5 from ${reviewStats.total} reviews` : 'Customer reviews'}>
            <span className="home-rating-stars" aria-hidden="true">★★★★★</span>
            <span>{reviewStats.total ? `${reviewStats.average.toFixed(1)}/5 · ${reviewStats.total} reviews` : 'Customer favourites'}</span>
          </div>
        </div>
        <div className="home-review-grid">{reviews.map((review) => <article className="home-review" key={review.name}>
          <span className="home-review-stars" aria-label={`${review.stars} out of 5 stars`}>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</span>
          <p>“{review.text}”</p>
          <footer><strong>{review.name}</strong><span>{review.tag}</span></footer>
        </article>)}</div>
      </section>

      <section className="lookbook-section home-ugc" aria-labelledby="ugc-heading" data-look="cargo">
        <div className="section-title-row">
          <div><h2 id="ugc-heading">As worn by you</h2><p>Tag <strong>@spidyclothing</strong> for a chance to be featured.</p></div>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" onClick={() => trackEvent('home_ugc_instagram')}><Instagram size={16}/> Follow along</a>
        </div>
        {ugcProducts.length ? <div className="home-ugc-grid">{ugcProducts.map((product) => <Link className="home-ugc-item" key={product.id} to={`/product/${product.slug}`} onClick={() => trackEvent('home_ugc_click', { productId: product.id })} aria-label={`Shop ${product.name}`}>
          <img loading="lazy" src={product.images[0]} alt={`${product.name} worn by a Spidy customer`}/>
          <span><Instagram size={13}/> Shop this look</span>
        </Link>)}</div> : <p className="shelf-empty">Customer photos are on the way.</p>}
      </section>

      <section className="lookbook-section home-values-section" aria-labelledby="values-heading" data-look="overshirt">
        <h2 id="values-heading">Why Spidy</h2>
        <p>Fewer, better pieces that earn their place in your week.</p>
        <div className="home-values">{values.map((value) => {
          const Icon = value.icon;
          return <article className="home-value" key={value.title}><Icon size={21} strokeWidth={1.6}/><strong>{value.title}</strong><p>{value.note}</p></article>;
        })}</div>
      </section>

      <section className="lookbook-section home-fit" aria-labelledby="fit-heading" data-look="shirt">
        <h2 id="fit-heading">Find your fit</h2>
        <p>Three silhouettes, one size guide. Pick the drape you actually reach for.</p>
        <div className="home-fit-grid">{fits.map((fit) => <div className="home-fit" key={fit.name}><strong>{fit.name} fit</strong><span>{fit.note}</span></div>)}</div>
        <button type="button" className="home-fit-guide-btn" onClick={() => { setSizeGuide(true); trackEvent('home_size_guide_open'); }}><Ruler size={16}/> Open the size guide</button>
      </section>

      <section className="lookbook-section cargo-offer" data-look="cargo">
        <h2>Cargo combos</h2><p className="cargo-discount">20% off.</p><Link to="/shop/cargos" onClick={() => trackEvent('home_offer_click', { offer: 'cargo_20' })}>Shop cargos <ArrowRight size={17}/></Link>
      </section>

      <section className="lookbook-section home-faq" aria-labelledby="faq-heading" data-look="olive">
        <h2 id="faq-heading">Questions, answered</h2>
        <p>Everything you need before you order.</p>
        <div className="home-faq-list">{faqs.map((faq) => <details key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>)}</div>
      </section>

      <section className="lookbook-section home-store" aria-labelledby="store-heading" data-look="cargo">
        <div className="home-store-photo"><img loading="lazy" src="/images/store-hello.webp?v=4" alt="Inside the Spidy Clothing store"/></div>
        <div className="home-store-copy">
          <h2 id="store-heading">Come say hello.</h2>
          <p>Feel the fabrics, try the fits, and meet the team behind Spidy.</p>
          <div className="home-store-meta"><span><MapPin size={16}/> Find us in person</span><span><Clock3 size={16}/> Monday–Saturday · 10:00 AM–8:00 PM</span><span><Sparkles size={16}/> New drops arrive weekly</span></div>
          <Link className="lookbook-primary" to="/store" onClick={() => trackEvent('home_store_click')}>Visit the store <ArrowRight size={17}/></Link>
        </div>
      </section>

      <Newsletter/>
      <div className="lookbook-signoff"><span>SPIDY CLOTHING</span><span>Good clothes for every day.</span></div>
    </div>

    {sizeGuide && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSizeGuide(false); }}>
      <section className="size-guide-modal" role="dialog" aria-modal="true" aria-labelledby="home-size-title">
        <button className="modal-close" onClick={() => setSizeGuide(false)} aria-label="Close size guide"><X/></button>
        <p className="eyebrow">FIND YOUR FIT</p>
        <h2 id="home-size-title">Size guide</h2>
        <p>Measurements are in inches. Between sizes? Size up for a relaxed fit, stay true to size for regular.</p>
        <div className="size-table"><table><thead><tr><th>SIZE</th><th>CHEST</th><th>WAIST</th></tr></thead><tbody>
          {['S', 'M', 'L', 'XL', 'XXL', '3XL'].map((size, index) => <tr key={size}><td>{size}</td><td>{36 + index * 2}–{38 + index * 2} in</td><td>{30 + index * 2}–{32 + index * 2} in</td></tr>)}
        </tbody></table></div>
      </section>
    </div>}
  </main>;
}

function SkeletonShelf() {
  return <section className="lookbook-section home-skeleton" aria-hidden="true" data-look="shirt">
    <div className="home-skeleton-heading"/>
    <div className="home-skeleton-track"><span/><span/></div>
  </section>;
}

function ProductShelf({ title, description, products: shelfProducts, onQuickAdd, to, action, look }: {
  title: string;
  description: string;
  products: Product[];
  onQuickAdd: (product: Product) => void;
  to: string;
  action: string;
  look: keyof typeof looks;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const updateControls = () => {
      setCanGoBack(track.scrollLeft > 2);
      setCanGoForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
    };
    updateControls();
    track.addEventListener('scroll', updateControls, { passive: true });
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    return () => {
      track.removeEventListener('scroll', updateControls);
      observer.disconnect();
    };
  }, []);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.82, 220), behavior: 'smooth' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); scroll(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); scroll(1); }
  };

  return <section className="lookbook-section product-shelf" aria-labelledby={headingId} data-look={look}>
    <div className="product-shelf-header">
      <div><h2 id={headingId}>{title}</h2><p>{description}</p></div>
      <div className="product-shelf-actions">
        <button type="button" onClick={() => scroll(-1)} disabled={!canGoBack} aria-label={`Scroll ${title} products left`}><ChevronLeft size={18}/></button>
        <button type="button" onClick={() => scroll(1)} disabled={!canGoForward} aria-label={`Scroll ${title} products right`}><ChevronRight size={18}/></button>
        <Link to={to} onClick={() => trackEvent('home_shelf_click', { shelf: title, target: action })}>{action}<ArrowRight size={15}/></Link>
      </div>
    </div>
    {shelfProducts.length ? <>
      <div className="product-shelf-track" ref={trackRef} role="region" aria-label={`${title} products`} aria-roledescription="carousel" tabIndex={0} onKeyDown={onKeyDown}>
        {shelfProducts.map((product) => <ProductCard key={product.id} product={product} onQuickAdd={onQuickAdd}/>)}
      </div>
      <p className="sr-only" aria-live="polite">{canGoForward ? `${title}: more products to the right.` : `${title}: end of list.`}</p>
    </> : <p className="shelf-empty">New pieces are on the way. Check back soon.</p>}
  </section>;
}

function Newsletter() {
  const { toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const email = String(new FormData(form).get('email') || '').trim();
    setBusy(true); setStatus(''); setError('');
    try {
      await apiRequest('/newsletter', { method: 'POST', body: { email } });
      trackEvent('newsletter_subscribe', { source: 'home' });
      setStatus('You’re on the list. Use code SPIDY10 on your first order.');
      toast('You’re on the list. See you at the next drop!');
      form.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not join the list. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="lookbook-section newsletter-section" aria-labelledby="newsletter-heading" data-look="shirt">
    <h2 id="newsletter-heading">Get 10% off your first order.</h2>
    <p>New fits and restocks, straight to your inbox.</p>
    <form className="lookbook-newsletter" onSubmit={subscribe}>
      <label className="sr-only" htmlFor="newsletter-email">Email address</label>
      <input id="newsletter-email" name="email" type="email" placeholder="Your email address" autoComplete="email" required disabled={busy}/>
      <button type="submit" aria-label="Join the mailing list" disabled={busy}>{busy ? '…' : <ArrowRight size={19}/>}</button>
    </form>
    {status && <p className="home-newsletter-status" role="status">{status}</p>}
    {error && <p className="home-newsletter-status error" role="alert">{error}</p>}
    <p className="home-newsletter-privacy">No spam. Unsubscribe anytime. We only use your email for Spidy updates.</p>
  </section>;
}

export function SectionHeading({ kicker, title, action, to }: { kicker: string; title: string; action?: string; to?: string }) {
  return <div className="section-heading"><div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div>{action && (to?.startsWith('http') ? <a className="text-link" href={to} target="_blank" rel="noreferrer">{action}<ArrowRight size={15}/></a> : <Link className="text-link" to={to || '/shop'}>{action}<ArrowRight size={15}/></Link>)}</div>;
}
