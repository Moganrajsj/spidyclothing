import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Menu, Search, ShoppingBag, X, Youtube, Heart } from 'lucide-react';
import type { Product } from '../types';
import { categoryLabels, categorySubcategories, formatPrice, productCategoryLabels } from '../lib';
import { useStore } from '../context/StoreContext';
import { useConsent } from '../context/ConsentContext';
import { useCatalog } from '../context/CatalogContext';
import { LEGAL_CONTACT, LEGAL_PAGES } from '../content/legal';

export function Announcement() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return <div className="announcement"><span>Free shipping above ₹1,499</span><button aria-label="Dismiss announcement" onClick={() => setVisible(false)}><X size={14}/></button></div>;
}
export function Header() {
  const [menu, setMenu] = useState(false); const [search, setSearch] = useState(false); const [query, setQuery] = useState('');
  const { cart } = useStore(); const { products: allProducts } = useCatalog(); const location = useLocation();
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const suggestions = query.trim() ? allProducts.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4) : [];
  const close = () => setMenu(false);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(false);setSearch(false)}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[]);
  return <>
    <header className="site-header">
      <button className="icon-button menu-toggle" aria-label="Open menu" onClick={() => setMenu(true)}><Menu/></button>
      <Link className="brand" to="/" aria-label="Spidy Clothing home"><span className="brand-mark">S</span><span className="brand-text">SPIDY CLOTHING</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation"><div className="shop-menu-wrap"><NavLink to="/shop">Shop</NavLink><div className="mega-menu"><div className="mega-categories"><small>SHOP BY CATEGORY</small>{Object.entries(categoryLabels).map(([slug,label])=><section key={slug}><Link to={`/shop/${slug}`}>{label}<ArrowRight size={13}/></Link><div className="mega-subcategories">{categorySubcategories[slug].map((subcategory)=><Link key={subcategory} to={`/shop/${slug}?subcategory=${encodeURIComponent(subcategory)}`}>{subcategory}</Link>)}</div></section>)}</div><div className="mega-feature"><span>SPIDY CLOTHING</span><strong>Good clothes.<br/>Good days.</strong><Link to="/shop">Explore the collection →</Link></div></div></div><NavLink to="/shop?tag=new">New</NavLink><NavLink to="/shop?tag=sale">Sale</NavLink><NavLink to="/wishlist">Wishlist</NavLink><NavLink to="/account">Account</NavLink></nav>
      <div className="header-actions"><button className="icon-button" aria-label="Search" onClick={() => setSearch(!search)}><Search/></button><Link className="icon-button" to="/cart" aria-label="Cart"><ShoppingBag/><span className="count-badge">{count}</span></Link></div>
    </header>
    {search && <div className="search-panel"><div className="search-inner"><Search size={18}/><input autoFocus value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search tees, shirts, denim..." aria-label="Search products"/><button onClick={()=>{setQuery('');setSearch(false)}} aria-label="Close search"><X/></button></div>{suggestions.length>0&&<div className="suggestions">{suggestions.map((product)=><Link key={product.id} to={`/product/${product.slug}`} onClick={()=>setSearch(false)}><img src={product.images[0]} alt=""/><span>{product.name}<small>{productCategoryLabels[product.category]}</small></span><strong>{formatPrice(product.price)}</strong></Link>)}<Link className="all-results" to={`/shop?q=${encodeURIComponent(query)}`} onClick={()=>setSearch(false)}>See all results <ArrowRight size={15}/></Link></div>}</div>}
    <div className={`drawer-shade ${menu?'visible':''}`} onClick={close}/><aside className={`menu-drawer ${menu?'open':''}`} aria-hidden={!menu}><div className="drawer-head"><Link className="brand" to="/" onClick={close}><span className="brand-mark">S</span><span className="brand-text">SPIDY CLOTHING</span></Link><button className="icon-button" onClick={close} aria-label="Close menu"><X/></button></div><button className="drawer-search" onClick={()=>{setMenu(false);setSearch(true)}}><Search size={18}/> Search products</button>{Object.entries(categoryLabels).map(([slug,label])=><div className="drawer-category" key={slug}><Link className="drawer-link" to={`/shop/${slug}`} onClick={close}>{label}<ArrowRight size={15}/></Link><div className="drawer-subcategories">{categorySubcategories[slug].map((subcategory)=><Link key={subcategory} to={`/shop/${slug}?subcategory=${encodeURIComponent(subcategory)}`} onClick={close}>{subcategory}</Link>)}</div></div>)}<Link className="drawer-link sale-link" to="/shop?tag=sale" onClick={close}>Sale<ArrowRight size={15}/></Link><Link className="drawer-link" to="/store" onClick={close}>Store locator<ArrowRight size={15}/></Link><Link className="drawer-link" to="/about" onClick={close}>About<ArrowRight size={15}/></Link><Link className="drawer-link" to="/contact" onClick={close}>Contact<ArrowRight size={15}/></Link><Link className="drawer-link" to="/wishlist" onClick={close}>Wishlist<ArrowRight size={15}/></Link><Link className="drawer-link" to="/account" onClick={close}>Login / Sign up<ArrowRight size={15}/></Link><Link className="drawer-link" to="/contact" onClick={close}>Track order<ArrowRight size={15}/></Link></aside>
    {location.pathname!=='/checkout'&&<nav className={`mobile-tabs ${location.pathname==='/'?'mobile-tabs-home':''}`} aria-label="Mobile navigation"><NavLink to="/" end><span>⌂</span>Home</NavLink><NavLink to="/shop"><span>▦</span>Shop</NavLink><button onClick={()=>setSearch(true)}><span><Search size={19}/></span>Search</button><NavLink to="/wishlist"><span><Heart size={19}/></span>Wishlist</NavLink><NavLink to="/cart"><span><ShoppingBag size={19}/><b>{count}</b></span>Cart</NavLink></nav>}
  </>;
}
export function Footer() {
  const { openPreferences } = useConsent();
  return <footer className="footer">
    <div className="footer-topline"><span>SPIDY CLOTHING · MADE FOR EVERYDAY</span><Link to="/shop?tag=new">Explore the latest <ArrowRight size={16}/></Link></div>
    <div className="footer-main">
      <div className="footer-brand">
        <Link className="brand brand-light" to="/" aria-label="Spidy Clothing home"><span className="brand-mark">S</span><span className="brand-text">SPIDY CLOTHING</span></Link>
        <p>Good clothes for every day.<br/>Find your fit. Make it yours.</p>
        <div className="social-links" aria-label="Follow Spidy Clothing">
          <a aria-label="Instagram" href="https://www.instagram.com/spidy__clothing?obrf=MTZ2d2lpb3pzb29jcQ==" target="_blank" rel="noopener noreferrer"><Instagram/></a>
          <a aria-label="Facebook" href="https://facebook.com" target="_blank" rel="noopener noreferrer"><Facebook/></a>
          <a aria-label="YouTube" href="https://youtube.com/@spidymenswear?si=7exjZ95yDaOThgXR" target="_blank" rel="noopener noreferrer"><Youtube/></a>
        </div>
      </div>
      <nav className="footer-column" aria-label="Shop categories"><h2>Shop</h2><Link to="/shop">Shop all</Link>{Object.entries(categoryLabels).slice(0, 6).map(([slug, label]) => <Link key={slug} to={`/shop/${slug}`}>{label}</Link>)}</nav>
      <nav className="footer-column" aria-label="Customer care"><h2>Customer care</h2><Link to="/contact">Contact us</Link><Link to="/return-refund-policy">Returns & exchanges</Link><Link to="/contact">Track your order</Link><Link to="/about">About Spidy</Link><Link to="/store">Find a store</Link></nav>
      <div className="footer-note"><span className="footer-note-mark">S/01</span><p>Everyday essentials.<br/>A little more you.</p><Link to="/shop?tag=new">Shop the collection <ArrowRight size={16}/></Link></div>
    </div>
    <div className="footer-legal">
      <nav className="footer-legal-links" aria-label="Legal policies">
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/cookie-policy">Cookie Policy</Link>
        <Link to="/return-refund-policy">Return, Refund & Exchange Policy</Link>
        <Link to="/terms-and-conditions">Terms & Conditions</Link>
        <button type="button" onClick={openPreferences}>Cookie preferences</button>
      </nav>
      <p>SPIDY CLOTHING · <a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a> · Policies last updated {LEGAL_PAGES['privacy-policy'].lastUpdated}</p>
    </div>
    <section className="footer-signature" aria-label="Spidy Clothing">
      <div className="footer-signature-wordmark" aria-hidden="true">
        <span className="footer-signature-spidy">SPIDY</span>
        <span className="footer-signature-rule"/>
        <div className="footer-signature-base">
          <span className="footer-signature-clothing">CLOTHING</span>
        </div>
      </div>
    </section>
    <div className="footer-bottom">
      <span className="footer-copyright">© 2026 Spidy Clothing</span>
      <span className="footer-payments">Cash on delivery · India-wide shipping</span>
        <a className="footer-credit" href="mailto:mjwebdesigns.in@gmail.com"><span className="footer-credit-label">Designed by</span><strong>MJ Web Design</strong></a>
    </div>
  </footer>;
}
export function Toasts() { const { notices } = useStore(); return <div className="toast-stack" aria-live="polite">{notices.map((notice)=><div key={notice.id} className="toast"><span>✓</span>{notice.message}</div>)}</div>; }
