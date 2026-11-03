import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Product } from './types';
import { StoreProvider } from './context/StoreContext';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { ConsentProvider } from './context/ConsentContext';
import { Announcement, Footer, Header, Toasts } from './components/Shell';
import { QuickAddModal } from './components/QuickAddModal';
const AdminApp=lazy(()=>import('./admin/AdminApp'));
const HomePage=lazy(()=>import('./pages/HomePage').then((m)=>({default:m.HomePage})));
const ShopPage=lazy(()=>import('./pages/ShopPage').then((m)=>({default:m.ShopPage})));
const ProductPage=lazy(()=>import('./pages/ProductPage').then((m)=>({default:m.ProductPage})));
const CartPage=lazy(()=>import('./pages/CartPage').then((m)=>({default:m.CartPage})));
const CheckoutPage=lazy(()=>import('./pages/CartPage').then((m)=>({default:m.CheckoutPage})));
const OrderSuccessPage=lazy(()=>import('./pages/CartPage').then((m)=>({default:m.OrderSuccessPage})));
const AboutPage=lazy(()=>import('./pages/StaticPages').then((m)=>({default:m.AboutPage})));
const AccountPage=lazy(()=>import('./pages/StaticPages').then((m)=>({default:m.AccountPage})));
const ContactPage=lazy(()=>import('./pages/StaticPages').then((m)=>({default:m.ContactPage})));
const NotFoundPage=lazy(()=>import('./pages/StaticPages').then((m)=>({default:m.NotFoundPage})));
const StorePage=lazy(()=>import('./pages/StaticPages').then((m)=>({default:m.StorePage})));
const WishlistPage=lazy(()=>import('./pages/StaticPages').then((m)=>({default:m.WishlistPage})));
const PrivacyPolicyPage=lazy(()=>import('./pages/LegalPages').then((m)=>({default:m.PrivacyPolicyPage})));
const CookiePolicyPage=lazy(()=>import('./pages/LegalPages').then((m)=>({default:m.CookiePolicyPage})));
const ReturnRefundPolicyPage=lazy(()=>import('./pages/LegalPages').then((m)=>({default:m.ReturnRefundPolicyPage})));
const TermsPage=lazy(()=>import('./pages/LegalPages').then((m)=>({default:m.TermsPage})));

function ScrollReset(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo({top:0,behavior:'instant'})},[pathname]);return null}
function Site(){const [quickProduct,setQuickProduct]=useState<Product|null>(null);const {error,refresh}=useCatalog();const quickAdd=(product:Product)=>setQuickProduct(product);return <><ScrollReset/><Announcement/>{error&&<div className="api-status" role="alert"><span>Live catalog is temporarily unavailable.</span><button type="button" onClick={refresh}>TRY AGAIN</button></div>}<Header/><Suspense fallback={<main className="container route-loading"><span className="loading-block"/><span className="loading-block"/><span className="loading-block"/><span className="loading-block"/></main>}><Routes><Route path="/" element={<HomePage quickAdd={quickAdd}/>}/><Route path="/shop" element={<ShopPage quickAdd={quickAdd}/>}/><Route path="/shop/:category" element={<ShopPage quickAdd={quickAdd}/>}/><Route path="/product/:slug" element={<ProductPage quickAdd={quickAdd}/>}/><Route path="/cart" element={<CartPage quickAdd={quickAdd}/>}/><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/order-success" element={<OrderSuccessPage/>}/><Route path="/order-success/:orderNumber" element={<OrderSuccessPage/>}/><Route path="/store" element={<StorePage/>}/><Route path="/about" element={<AboutPage/>}/><Route path="/contact" element={<ContactPage/>}/><Route path="/wishlist" element={<WishlistPage quickAdd={quickAdd}/>}/><Route path="/account" element={<AccountPage/>}/><Route path="/privacy-policy" element={<PrivacyPolicyPage/>}/><Route path="/cookie-policy" element={<CookiePolicyPage/>}/><Route path="/return-refund-policy" element={<ReturnRefundPolicyPage/>}/><Route path="/terms-and-conditions" element={<TermsPage/>}/><Route path="*" element={<NotFoundPage/>}/></Routes></Suspense><Footer/><QuickAddModal product={quickProduct} close={()=>setQuickProduct(null)}/><Toasts/></>}
export default function App(){return <BrowserRouter><Routes><Route path="/admin/*" element={<Suspense fallback={<main className="admin-boot"><span className="loading-block"/></main>}><AdminApp/></Suspense>}/><Route path="*" element={<CatalogProvider><StoreProvider><ConsentProvider><Site/></ConsentProvider></StoreProvider></CatalogProvider>}/></Routes></BrowserRouter>}
