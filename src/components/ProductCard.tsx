import { useEffect, useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { productCategoryLabels, formatPrice, FALLBACK_PRODUCT_IMAGE } from '../lib';
import { trackEvent } from '../lib/analytics';
import { useStore } from '../context/StoreContext';

export function ProductCard({ product, onQuickAdd }: { product: Product; onQuickAdd: (product: Product) => void }) {
  const { wishlist, toggleWishlist } = useStore(); const [hovered, setHovered] = useState(false); const [imageReady,setImageReady]=useState(false); const [failed,setFailed]=useState(false);
  const primary=product.thumbnails?.[0]||product.images[0]||FALLBACK_PRODUCT_IMAGE;
  const secondary=product.thumbnails?.[1]||product.images[1];
  const image=hovered&&secondary?secondary:primary;
  useEffect(()=>{setImageReady(false);setFailed(false)},[image]);
  const discount = Math.round((1-product.price/product.oldPrice)*100);
  const quickAdd = () => { trackEvent('quick_add', { productId: product.id, productName: product.name }); onQuickAdd(product); };
  return <article className="product-card" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
    <div className={`product-image ${imageReady?'image-ready':''}`}><Link to={`/product/${product.slug}`}><img loading="lazy" decoding="async" src={failed?FALLBACK_PRODUCT_IMAGE:image} onLoad={()=>setImageReady(true)} onError={()=>{setFailed(true);setImageReady(true)}} alt={product.name}/></Link>{product.badge&&<span className={`product-badge ${product.badge==='NEW'?'new-badge':'sale-badge'}`}>{product.badge==='NEW'?'NEW':`${discount}% OFF`}</span>}<button className={`wishlist-button ${wishlist.includes(product.id)?'liked':''}`} onClick={()=>toggleWishlist(product.id)} aria-label={wishlist.includes(product.id)?'Remove from wishlist':'Add to wishlist'}><Heart fill={wishlist.includes(product.id)?'currentColor':'none'} size={18}/></button><button className="quick-add" onClick={quickAdd}>QUICK ADD</button></div>
    <div className="product-info"><div className="product-name-row"><Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link><span className="rating"><Star size={12} fill="currentColor"/>{product.rating.toFixed(1)}</span></div><span className="product-subtitle">{product.fit} fit · {productCategoryLabels[product.category]}</span><div className="price-row"><strong>{formatPrice(product.price)}</strong>{product.oldPrice>product.price&&<del>{formatPrice(product.oldPrice)}</del>}</div></div>
  </article>;
}
