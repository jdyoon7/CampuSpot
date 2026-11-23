import type { Report } from '../api/reports';
type Offer = Pick<Report, 'details' | 'starts_on' | 'ends_on' | 'source_url'>;
export function OfferDetails({ offer }: { offer: Offer }) {
  return (
    <>
      <p>{offer.details}</p>
      <small>
        {offer.starts_on && offer.ends_on
          ? offer.starts_on + ' ~ ' + offer.ends_on
          : '상시 혜택'}
      </small>
      <a href={offer.source_url} target="_blank" rel="noreferrer">
        공식 공지 보기
      </a>
    </>
  );
}
