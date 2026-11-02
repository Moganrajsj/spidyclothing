export const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;
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
