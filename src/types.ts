export type Category = 't-shirts' | 'shirts' | 'jeans' | 'cargos' | 'pants' | 'track-pants' | 'shorts' | 'hoodies' | 'shoes' | 'watches' | 'accessories' | string;
export type ProductSize = { name: string; stock: number };
export type ProductImage = { id?: number; url: string; publicId?: string | null; type?: 'main' | 'gallery'; position?: number; checksum?: string | null; thumbnail?: string };
export type Product = {
  id: string; slug: string; name: string; category: Category; fit: 'Slim' | 'Regular' | 'Relaxed';
  price: number; oldPrice: number; badge: string; colors: string[]; sizes: ProductSize[]; images: string[]; thumbnails?: string[];
  rating: number; reviewCount: number; description: string; fabricCare: string; subcategory?: string;
};
export type CartLine = { productId: string; size: string; color: string; quantity: number };
export type Notice = { id: number; message: string };
