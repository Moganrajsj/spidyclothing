export const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;
export const FALLBACK_PRODUCT_IMAGE = '/images/product-placeholder.svg';

/**
 * Ensures any Cloudinary image URL is delivered in optimized WebP format.
 */
export function toWebpUrl(url: string, transform = 'c_limit,w_1200,q_auto,f_webp'): string {
  if (!url) return '';
  if (url.includes('/image/upload/')) {
    if (url.includes('/image/upload/c_') || url.includes('/image/upload/f_') || url.includes('/image/upload/w_')) {
      return url.replace(/\/image\/upload\/[^/]+\//, `/image/upload/${transform}/`);
    }
    return url.replace('/image/upload/', `/image/upload/${transform}/`);
  }
  return url;
}

export function thumbnailUrl(url: string): string {
  return toWebpUrl(url, 'c_fill,w_400,h_500,q_auto,f_webp');
}
export const categoryLabels: Record<string, string> = {
  shirts: 'Shirts', pants: 'Pants', 't-shirts': 'T-Shirts', 'track-pants': 'Track Pants',
  shorts: 'Shorts', hoodies: 'Hoodies', shoes: 'Shoes', watches: 'Watches', accessories: 'Accessories',
};
export const categorySubcategories: Record<string, string[]> = {
  shirts: ['Cotton Shirts', 'Baggy Shirts', 'Party Wear Shirts', 'Linen Shirts', 'Embroidery Design Shirts', 'Body Fit Shirts', 'Trending Shirts'],
  pants: ['Formal Pants', 'Linen Pants', 'Cargo Pants', 'Lycra Pants', 'Baggy Pants', 'Mom Fit Pants', 'Cotton Pants', 'Formal Baggy Pants'],
  't-shirts': ['Printed T-Shirts', 'Oversized T-Shirts', 'Acid Wash T-Shirts', 'Collar T-Shirts'],
  'track-pants': ['All Track Pants'], shorts: ['All Shorts'], hoodies: ['Hoodies'],
  shoes: ['Baggy Style Shoes', 'Formal Shoes', 'Casual Shoes'], watches: ['All Watches'], accessories: ['All Accessories'],
};
export const productCategoryLabels: Record<string, string> = { ...categoryLabels, jeans: 'Pants', cargos: 'Pants' };
export const readJSON = <T,>(key: string, fallback: T): T => {
  try { const item = localStorage.getItem(key); return item ? JSON.parse(item) as T : fallback; }
  catch { return fallback; }
};
