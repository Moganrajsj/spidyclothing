import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Clock3, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { AuthPanel } from '../components/AuthPanel';
import { useStore } from '../context/StoreContext';
import type { OrderDetails } from '../context/StoreContext';
import { useCatalog } from '../context/CatalogContext';
import { formatPrice } from '../lib';

export function WishlistPage({quickAdd}:{quickAdd:(product:Product)=>void}){const {products:list}=useCatalog();const {wishlist,toggleWishlist,addToCart}=useStore();const saved=list.filter(p=>wishlist.includes(p.id));return <main className="container static-page"><PageHeader kicker="SAVED FOR LATER" title="YOUR WISHLIST" note={`${saved.length} saved styles`}/>{saved.length?<div className="product-grid">{saved.map(product=><div key={product.id} className="wishlist-card"><ProductCard product={product} onQuickAdd={quickAdd}/><button className="move-to-cart" onClick={()=>{const size=product.sizes.find(s=>s.stock)?.name||'M';addToCart(product.id,size,product.colors[0]);toggleWishlist(product.id)}}>MOVE TO CART <ArrowRight size={14}/></button></div>)}</div>:<Empty title="Nothing saved just yet." copy="Tap the heart on anything you like and it’ll be waiting here." action="EXPLORE THE COLLECTION" to="/shop"/>}</main>}
export function StorePage(){return <main className="container static-page"><PageHeader kicker="COME SAY HELLO" title="VISIT OUR STORE" note="Find your fit in person, feel the fabrics, and meet the team."/><div className="store-page-grid"><div className="store-large-photo"><img src="/images/store.webp" alt="Spidy Clothing shop interior"/></div><div className="store-facts"><h2>Come by and say hello.</h2><p>We’d love to help you find your new everyday favourite.</p><ul><li><MapPin/> <span><strong>ADDRESS</strong><small>Add your store address, India</small></span></li><li><Clock3/> <span><strong>OPENING HOURS</strong><small>Monday–Saturday · 10:00 AM–8:00 PM</small></span></li><li><Phone/> <span><strong>PHONE</strong><small>Add your store phone number</small></span></li></ul><a className="button button-blue" target="_blank" rel="noreferrer" href="https://maps.google.com/?q=menswear+store+India">GET DIRECTIONS <ArrowRight size={15}/></a></div></div><div className="map-placeholder"><MapPin size={25}/><strong>Store map</strong><span>Add your store location to show directions here.</span></div></main>}
export function AboutPage(){return <main className="container static-page"><PageHeader kicker="GOOD CLOTHES. GOOD DAYS." title="MADE FOR THE EVERYDAY" note="Menswear that shows up for whatever the day brings."/><div className="about-hero"><img src="/images/about.webp" alt="Spidy Clothing campaign placeholder"/><div><p className="eyebrow">OUR STORY</p><h2>Less fuss.<br/>More life.</h2><p>Spidy Clothing is built around the pieces you reach for again and again: tees that fit just right, shirts that go anywhere, denim that moves with you, and cargos ready for a little more.</p><p>Good fabric, thoughtful fits, easy exchanges. That’s the whole idea.</p><Link className="button button-primary" to="/shop">SHOP THE COLLECTION</Link></div></div><div className="values-grid">{[['01','Good by design','Considered fits and details that feel right, not overdone.'],['02','Made to move','Comfort and quality you can count on, day after day.'],['03','Here for you','A real team, easy exchanges, and help finding your fit.']].map(v=><article key={v[0]}><span>{v[0]}</span><h3>{v[1]}</h3><p>{v[2]}</p></article>)}</div></main>}
export function ContactPage(){const {toast}=useStore();return <main className="container static-page"><PageHeader kicker="WE’RE HERE TO HELP" title="GET IN TOUCH" note="Questions about fit, an order, or visiting our store? Say hello."/><div className="contact-layout"><form className="contact-form" onSubmit={(e)=>{e.preventDefault();if(e.currentTarget.reportValidity()){toast('Thanks for reaching out. We’ll be in touch soon.');e.currentTarget.reset()}}}><label>Your name<input required minLength={2} placeholder="Name"/></label><label>Email address<input required type="email" placeholder="you@example.com"/></label><label className="wide">What can we help with?<textarea required minLength={8} rows={5} placeholder="Write us a note..."/></label><button className="button button-primary">SEND MESSAGE <Send size={15}/></button></form><aside className="contact-details"><h2>Talk to the team.</h2><p>We’re happy to help with sizing, orders, or anything else.</p><a href="tel:+910000000000"><Phone/><span><strong>CALL US</strong><small>Add your business phone number</small></span></a><a href="mailto:hello@spidyclothing.in"><Mail/><span><strong>EMAIL</strong><small>hello@spidyclothing.in</small></span></a><a href="https://wa.me/" target="_blank" rel="noreferrer"><Send/><span><strong>WHATSAPP</strong><small>Add your WhatsApp business number</small></span></a></aside></div></main>}
export function AccountPage(){
  const [params]=useSearchParams();
  const next=params.get('next')||'';
  const authError=params.get('authError')||'';
  const {user,authLoading,logout,getOrders,updateProfile}=useStore();
  const [orders,setOrders]=useState<OrderDetails[]>([]);
  const [orderError,setOrderError]=useState('');
  const [profile,setProfile]=useState({name:'',phone:''});
  const [saving,setSaving]=useState(false);
  const [profileMessage,setProfileMessage]=useState('');
  const [profileError,setProfileError]=useState('');

  useEffect(()=>{if(user)setProfile({name:user.name,phone:user.phone||''})},[user]);
  useEffect(()=>{
    if(!user)return;
    let active=true;
    getOrders().then((result)=>{if(active)setOrders(result)}).catch((requestError:Error)=>{if(active)setOrderError(requestError.message)});
    return()=>{active=false};
  },[user,getOrders]);

  const saveProfile=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!e.currentTarget.reportValidity())return;
    setSaving(true);setProfileMessage('');setProfileError('');
    try{await updateProfile({name:profile.name.trim(),phone:profile.phone.trim()});setProfileMessage('Profile saved.')}
    catch(requestError){setProfileError(requestError instanceof Error?requestError.message:'Could not save your profile.')}
    finally{setSaving(false)}
  };

  if(authLoading)return <main className="account-page"><div className="account-card"><span className="loading-block"/></div></main>;
  if(!user)return <main className="account-page"><div className="account-card"><AuthPanel next={next} initialError={authError}/></div></main>;

  return <main className="account-page"><div className="account-card account-wide">
    <div className="account-head">
      <span className="account-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt="" referrerPolicy="no-referrer"/>:(user.name||user.email).trim().charAt(0).toUpperCase()}</span>
      <div className="account-identity"><p className="eyebrow">YOUR SPIDY ACCOUNT</p><h1>{user.name}</h1><p>{user.email}</p></div>
      <button className="button button-outline" onClick={()=>void logout()}>SIGN OUT</button>
    </div>
    <section className="account-profile">
      <h2>Profile details</h2>
      <p className="account-section-note">Keep your name and phone number up to date so we can reach you about your orders.</p>
      <form className="profile-form" onSubmit={saveProfile}>
        <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={120} value={profile.name} onChange={(e)=>setProfile((current)=>({...current,name:e.target.value}))}/></label>
        <label>Phone number<input name="phone" autoComplete="tel" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" placeholder="10-digit mobile number" value={profile.phone} onChange={(e)=>setProfile((current)=>({...current,phone:e.target.value.replace(/\D/g,'')}))}/></label>
        <label className="wide">Email address<input value={user.email} readOnly disabled/></label>
        <div className="profile-actions"><button className="button button-primary" disabled={saving}>{saving?'SAVING…':'SAVE PROFILE'}</button>{profileMessage&&<p className="profile-message" role="status">{profileMessage}</p>}{profileError&&<p className="profile-message error" role="alert">{profileError}</p>}</div>
      </form>
    </section>
    <section className="account-orders">
      <h2>Your orders</h2>
      {orderError&&<p className="form-error" role="alert">{orderError}</p>}
      {orders.length?orders.map(order=><Link className="account-order" key={order.orderNumber} to={`/order-success/${encodeURIComponent(order.orderNumber)}`}><span><strong>{order.orderNumber}</strong><small>{order.createdAt?new Date(order.createdAt).toLocaleDateString():'Recent'}</small></span><span><strong>{formatPrice(order.total)}</strong><small>{order.orderStatus} · COD</small></span><ArrowRight size={16}/></Link>):<p>No orders yet. Your order history will appear here.</p>}
    </section>
  </div></main>;
}
export function NotFoundPage(){return <main className="container empty-state not-found"><span className="eyebrow">404 · THAT PAGE GOT AWAY</span><h1>Nothing to see here.</h1><p>Let's find something good to wear instead.</p><Link className="button button-primary" to="/">BACK TO HOME</Link></main>}
export function PageHeader({kicker,title,note}:{kicker:string;title:string;note:string}){return <div className="static-page-header"><p className="eyebrow">{kicker}</p><h1>{title}</h1><p>{note}</p></div>}
function Empty({title,copy,action,to}:{title:string;copy:string;action:string;to:string}){return <div className="empty-state"><h2>{title}</h2><p>{copy}</p><Link className="button button-primary" to={to}>{action}</Link></div>}
