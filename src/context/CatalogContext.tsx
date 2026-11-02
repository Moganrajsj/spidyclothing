import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { Product } from '../types';
import { apiRequest } from '../lib/api';

type CatalogValue = { products: Product[]; loading: boolean; error: string; refresh: () => void };
const CatalogContext = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: PropsWithChildren) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiRequest<{ products: Product[] }>('/products')
      .then((result) => { if (active) setProducts(result.products); })
      .catch((requestError: Error) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  const value = useMemo(() => ({ products, loading, error, refresh }), [products, loading, error, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used within CatalogProvider');
  return value;
}
