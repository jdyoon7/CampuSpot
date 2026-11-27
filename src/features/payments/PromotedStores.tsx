import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../shared/auth/account';
import type { Database } from '../../shared/types/database.generated';

type Ad =
  Database['public']['Functions']['list_active_groble_store_ads']['Returns'][number];

export function PromotedStores() {
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    let active = true;
    void client()
      .rpc('list_active_groble_store_ads', { p_limit: 6 })
      .then(({ data, error }) => {
        if (active && !error && data) setAds(data);
      });
    return () => {
      active = false;
    };
  }, []);
  if (!ads.length) return null;
  return (
    <section className="discount-history" aria-label="광고 매장">
      <h2>광고 매장</h2>
      <ul>
        {ads.map((ad) => (
          <li key={ad.id}>
            <Link to={'/discounts/business/' + ad.id}>
              {ad.name} · {ad.branch_name}
            </Link>
            {ad.description && <p>{ad.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
