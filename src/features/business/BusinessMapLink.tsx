import { MapPin } from 'lucide-react';

export function BusinessMapLink({
  address,
  name,
}: {
  address: string;
  name: string;
}) {
  // Campus addresses can share the same street number. Use the building
  // name when the address includes one, leaving the floor in the on-page address.
  const building = address.match(/,\s*(.+?)\s+(?:지하\s*)?\d+\s*층\s*$/)?.[1];
  const search = building ?? address.trim();
  return (
    <a
      className="discount-map-link"
      href={'https://map.kakao.com/link/search/' + encodeURIComponent(search)}
      target="_blank"
      rel="noreferrer"
      aria-label={`${name} 카카오맵에서 보기 (새 창)`}
    >
      <MapPin aria-hidden="true" size={18} />
      카카오맵에서 보기
    </a>
  );
}
