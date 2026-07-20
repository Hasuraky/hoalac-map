'use client';

import { useEffect, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';

const HOA_LAC_CENTER = [105.526, 21.008]; // [lng, lat]
const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;
const STYLE = 'https://tiles.goong.io/assets/goong_map_web.json';

function pinElement() {
  const el = document.createElement('div');
  el.className = 'goong-pin';
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z"
        fill="#275838" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`;
  return el;
}

// Bản đồ nhỏ để chấm vị trí BĐS: click đặt ghim, kéo ghim tinh chỉnh
export default function LocationPicker({ lat, lng, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!MAPTILES_KEY || mapRef.current || !containerRef.current) return;
    goongjs.accessToken = MAPTILES_KEY;
    const hasPoint = lat != null && lng != null;
    const map = new goongjs.Map({
      container: containerRef.current,
      style: STYLE,
      center: hasPoint ? [lng, lat] : HOA_LAC_CENTER,
      zoom: hasPoint ? 16 : 13,
    });
    map.addControl(new goongjs.NavigationControl(), 'top-left');
    map.on('click', (e) => onPickRef.current?.(e.lngLat.lat, e.lngLat.lng));
    map.on('load', () => setReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ ghim theo tọa độ (click bản đồ / dán Google Maps / GPS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (lat == null || lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new goongjs.Marker({
        element: pinElement(),
        anchor: 'bottom',
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(map);
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current.getLngLat();
        onPickRef.current?.(ll.lat, ll.lng);
      });
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16), duration: 600 });
  }, [lat, lng, ready]);

  if (!MAPTILES_KEY) {
    return (
      <div className="location-picker-map map-loading">
        Chưa cấu hình Goong — thêm NEXT_PUBLIC_GOONG_MAPTILES_KEY.
      </div>
    );
  }

  return <div ref={containerRef} className="location-picker-map" />;
}
