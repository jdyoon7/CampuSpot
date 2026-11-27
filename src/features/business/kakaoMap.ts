import { businessMapQuery } from './mapQuery';

export type KakaoPoint = object;
type MapInstance = {
  setBounds(bounds: Bounds): void;
};
type Bounds = { extend(point: KakaoPoint): void };
type Marker = { setMap(map: MapInstance | null): void };
type Result = { x: string; y: string; place_name?: string };
type SearchCallback = (rows: Result[], status: string) => void;
type Kakao = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoPoint;
  LatLngBounds: new () => Bounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoPoint; level: number },
  ) => MapInstance;
  Marker: new (options: {
    map: MapInstance;
    position: KakaoPoint;
    title: string;
  }) => Marker;
  event: {
    addListener(marker: Marker, event: 'click', callback: () => void): void;
    removeListener(marker: Marker, event: 'click', callback: () => void): void;
  };
  services: {
    Places: new () => {
      keywordSearch(query: string, callback: SearchCallback): void;
    };
    Geocoder: new () => {
      addressSearch(query: string, callback: SearchCallback): void;
    };
  };
};
const mapsWindow = window as Window & { kakao?: { maps?: Kakao } };
export const kakaoMapKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
let loading: Promise<Kakao> | undefined;

export function loadKakaoMap() {
  if (loading) return loading;
  const script = document.createElement('script');
  const url = new URL('https://dapi.kakao.com/v2/maps/sdk.js');
  url.search = new URLSearchParams({
    appkey: kakaoMapKey ?? '',
    autoload: 'false',
    libraries: 'services',
  }).toString();
  script.src = url.href;
  script.async = true;
  loading = new Promise<Kakao>((resolve, reject) => {
    function fail() {
      window.clearTimeout(timeout);
      reject(new Error('Kakao map could not load'));
    }
    const timeout = window.setTimeout(fail, 10_000);
    script.onerror = fail;
    script.onload = () => {
      const maps = mapsWindow.kakao?.maps;
      if (!maps) return fail();
      maps.load(() => {
        window.clearTimeout(timeout);
        resolve(maps);
      });
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    script.remove();
    loading = undefined;
    throw error;
  });
  return loading;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace('대학교', '대')
    .replace(/[^\p{L}\p{N}]/gu, '');

export function findMapPoint(maps: Kakao, address: string) {
  return new Promise<KakaoPoint | null>((resolve) => {
    const query = businessMapQuery(address);
    const timeout = window.setTimeout(() => resolve(null), 5000);
    const callback: SearchCallback = (rows, status) => {
      window.clearTimeout(timeout);
      const result =
        status === 'OK' &&
        (query === address.trim()
          ? rows[0]
          : rows.find(
              (item) => normalize(item.place_name ?? '') === normalize(query),
            ));
      const lat = result ? Number(result.y) : NaN;
      const lng = result ? Number(result.x) : NaN;
      resolve(
        Number.isFinite(lat) && Number.isFinite(lng)
          ? new maps.LatLng(lat, lng)
          : null,
      );
    };
    if (query === address.trim())
      new maps.services.Geocoder().addressSearch(query, callback);
    else new maps.services.Places().keywordSearch(query, callback);
  });
}
