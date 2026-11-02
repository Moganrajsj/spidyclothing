import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../lib';

export function QuickAddModal({ product, close }: { product: Product | null; close: () => void }) {
  const [size, setSize] = useState(''); const { addToCart } = useStore();
  useEffect(()=>{if(!product)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')close()};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[product,close]);
  if (!product) return null;
  return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)close()}}><section className="quick-modal" role="dialog" aria-modal="true" aria-labelledby="quick-title"><button autoFocus className="modal-close" onClick={close} aria-label="Close size picker"><X/></button><img src={product.images[0]} alt=""/><div className="quick-details"><span className="eyebrow">QUICK ADD</span><h2 id="quick-title">{product.name}</h2><strong>{formatPrice(product.price)}</strong><p>Choose your size</p><div className="size-chips">{product.sizes.map((item)=><button key={item.name} disabled={!item.stock} className={`${size===item.name?'selected':''} ${item.stock===0?'out-of-stock':''}`} onClick={()=>setSize(item.name)}>{item.name}</button>)}</div><button className="button button-primary full-width" disabled={!size} onClick={()=>{addToCart(product.id,size,product.colors[0]);close()}}>ADD TO CART</button></div></section></div>;
}
