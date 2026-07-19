'use client';

import { useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

const HOA_LAC_CENTER = { lat: 21.008, lng: 105.526 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const PIN_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="#275838" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`
  );

// Ghim kéo được + tự bay tới khi tọa độ đổi từ bên ngoài
function PickMarker({ lat, lng, onPick }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    if (lat == null || lng == null) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        draggable: true,
        icon: {
          url: PIN_URL,
          scaledSize: new google.maps.Size(28, 36),
          anchor: new google.maps.Point(14, 36),
        },
      });
      markerRef.current.addListener('dragend', (e) => {
        onPick(e.latLng.lat(), e.latLng.lng());
      });
    }
    markerRef.current.setPosition({ lat, lng });
    map.panTo({ lat, lng });
    if (map.getZoom() < 17) map.setZoom(17);
  }, [map, lat, lng, onPick]);

  useEffect(() => () => markerRef.current?.setMap(null), []);
  return null;
}

// Bản đồ nhỏ để chấm vị trí BĐS: click đặt ghim, kéo ghim tinh chỉnh
export default function LocationPicker({ lat, lng, onPick }) {
  const hasPoint = lat != null && lng != null;

  if (!API_KEY) {
    return (
      <div className="location-picker-map map-loading">
        Chưa cấu hình Google Maps — thêm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <div className="location-picker-map">
      <APIProvider apiKey={API_KEY} language="vi" region="VN">
        <Map
          defaultCenter={hasPoint ? { lat, lng } : HOA_LAC_CENTER}
          defaultZoom={hasPoint ? 16 : 14}
          gestureHandling="greedy"
          mapTypeControl
          streetViewControl={false}
          fullscreenControl={false}
          className="gmap-container"
          onClick={(e) => {
            const ll = e.detail?.latLng;
            if (ll) onPick(ll.lat, ll.lng);
          }}
        >
          <PickMarker lat={lat} lng={lng} onPick={onPick} />
        </Map>
      </APIProvider>
    </div>
  );
}
