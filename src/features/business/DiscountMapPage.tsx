import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { client } from '../../shared/auth/account';
import { pageSize } from '../discounts/api/reports';
import { businessName } from './api';
import { businessPath } from './BusinessDirectory';
import { BusinessMapLink } from './BusinessMapLink';
import { findMapPoint, kakaoMapKey, loadKakaoMap } from './kakaoMap';

async function loadMapBusinesses(offset: number) {
  const { data, error } = await client().rpc('list_discount_map_businesses', {
    p_limit: pageSize + 1,
    p_offset: offset,
  });
  if (error) throw error;
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

type Business = Awaited<ReturnType<typeof loadMapBusinesses>>['items'][number];

function MapPanel({
  businesses,
  onSelect,
}: {
  businesses: Business[];
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    { count: number } | 'loading' | 'failed'
  >('loading');
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let active = true;
    const dispose: Array<() => void> = [];
    void loadKakaoMap()
      .then(async (maps) => {
        if (!active) return;
        const points = await Promise.all(
          businesses.map(async (business) => ({
            business,
            point: await findMapPoint(maps, business.address),
          })),
        );
        if (!active) return;
        const located = points.filter((item) => item.point !== null);
        const first = located[0]?.point;
        setStatus({ count: located.length });
        if (!first) return;
        const map = new maps.Map(element, { center: first, level: 4 });
        const bounds = new maps.LatLngBounds();
        for (const { business, point } of located) {
          if (!point) continue;
          bounds.extend(point);
          const marker = new maps.Marker({
            map,
            position: point,
            title: businessName(business),
          });
          const activate = () => onSelect(business.id);
          maps.event.addListener(marker, 'click', activate);
          dispose.push(() => {
            maps.event.removeListener(marker, 'click', activate);
            marker.setMap(null);
          });
        }
        if (located.length > 1) map.setBounds(bounds);
      })
      .catch(() => {
        if (active) setStatus('failed');
      });
    return () => {
      active = false;
      dispose.forEach((remove) => remove());
      element.replaceChildren();
    };
  }, [attempt, businesses, onSelect]);

  return (
    <>
      <div
        ref={container}
        className="discount-map-canvas"
        aria-label="혜택 매장 지도"
        hidden={
          status === 'failed' ||
          (typeof status === 'object' && status.count === 0)
        }
        style={{ visibility: status === 'loading' ? 'hidden' : undefined }}
      />
      {status === 'loading' && (
        <p role="status">지도에서 매장 위치를 찾는 중입니다.</p>
      )}
      {status === 'failed' && (
        <p role="alert">
          지도를 불러오지 못했습니다.{' '}
          <button
            type="button"
            onClick={() => {
              setStatus('loading');
              setAttempt((value) => value + 1);
            }}
          >
            지도 다시 불러오기
          </button>
        </p>
      )}
      {typeof status === 'object' && status.count < businesses.length && (
        <p role="status">
          {businesses.length - status.count}곳은 아래 목록에서 주소와 카카오맵
          링크를 확인할 수 있습니다.
        </p>
      )}
    </>
  );
}

export function DiscountMapPage() {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] =
    useState<Awaited<ReturnType<typeof loadMapBusinesses>>>();
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void loadMapBusinesses(page * pageSize).then(
      (rows) => {
        if (active) setData(rows);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [page, attempt]);

  function changePage(next: number) {
    setData(undefined);
    setSelected(undefined);
    setPage(next);
  }

  return (
    <article className="discounts-page">
      <header>
        <Link to="/discounts">← 할인·혜택</Link>
        <h1>혜택 지도</h1>
      </header>
      {!supabase ? (
        <p role="status">혜택 서비스 연결 후 매장을 조회할 수 있습니다.</p>
      ) : failed ? (
        <p role="alert">
          매장을 불러오지 못했습니다.{' '}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            다시 불러오기
          </button>
        </p>
      ) : !data ? (
        <p role="status">공개 혜택 매장을 불러오는 중입니다.</p>
      ) : data.items.length === 0 ? (
        <p>
          공개 혜택이 연결된 지점이 없습니다.{' '}
          {page > 0 && (
            <button type="button" onClick={() => changePage(page - 1)}>
              이전
            </button>
          )}
        </p>
      ) : (
        <>
          {kakaoMapKey ? (
            <MapPanel businesses={data.items} onSelect={setSelected} />
          ) : (
            <p role="status">
              앱 내 지도 연결 전에는 목록에서 카카오맵을 열 수 있습니다.
            </p>
          )}
          <section className="discount-history" aria-label="공개 혜택 매장">
            <h2>공개 혜택 매장</h2>
            <ul>
              {data.items.map((business) => (
                <li
                  key={business.id}
                  className={
                    selected === business.id
                      ? 'discount-map-selected'
                      : undefined
                  }
                >
                  <Link
                    to={businessPath + '/' + business.id}
                    aria-current={
                      selected === business.id ? 'location' : undefined
                    }
                  >
                    {businessName(business)}
                  </Link>
                  <p>
                    {business.address} · 공개 혜택 {business.offer_count}건
                  </p>
                  <BusinessMapLink
                    address={business.address}
                    name={businessName(business)}
                  />
                </li>
              ))}
            </ul>
            {(page > 0 || data.hasNext) && (
              <div className="discount-pager">
                <button
                  type="button"
                  disabled={!page}
                  onClick={() => changePage(page - 1)}
                >
                  이전
                </button>
                <span>{page + 1}페이지</span>
                <button
                  type="button"
                  disabled={!data.hasNext}
                  onClick={() => changePage(page + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </article>
  );
}
