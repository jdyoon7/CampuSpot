import { MapPin } from 'lucide-react';
import { businessMapQuery } from './mapQuery';

export function BusinessMapLink({
  address,
  name,
}: {
  address: string;
  name: string;
}) {
  return (
    <a
      className="discount-map-link"
      href={
        'https://map.kakao.com/link/search/' +
        encodeURIComponent(businessMapQuery(address))
      }
      target="_blank"
      rel="noreferrer"
      aria-label={`${name} 카카오맵에서 보기 (새 창)`}
    >
      <MapPin aria-hidden="true" size={18} />
      카카오맵에서 보기
    </a>
  );
}
