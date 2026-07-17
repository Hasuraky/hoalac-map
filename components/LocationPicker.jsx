'use client';

import { useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

const HOA_LAC_CENTER = { lat: 21.008, lng: 105.526 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// Bay tới ghim khi tọa độ đổi từ bên ngoài (dán Google Maps / GPS)
function PanToPoint({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (map && lat != null && lng != null) {
      map.panTo({ lat, lng });
      if (map.getZoom() < 17) map.setZoom(17);
    }
  }, [lat, lng, map]);
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
          mapId={MAP_ID}
          defaultCenter={hasPoint ? { lat, lng } : HOA_LAC_CENTER}
          defaultZoom={hasPoint ? 16 : 14}
          gestureHandling="greedy"
          mapTypeControl
          streetViewControl={false}
          fullscreenControl={false}
          onClick={(e) => {
            const ll = e.detail?.latLng;
            if (ll) onPick(ll.lat, ll.lng);
          }}
        >
          {hasPoint && (
            <AdvancedMarker
              position={{ lat, lng }}
              draggable
              onDragEnd={(e) => {
                const ll = e.latLng;
                if (ll) onPick(ll.lat(), ll.lng());
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
                <path
                  d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z"
                  fill="#275838"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx="14" cy="14" r="6" fill="white" opacity="0.9" />
              </svg>
            </AdvancedMarker>
          )}
          <PanToPoint lat={lat} lng={lng} />
        </Map>
      </APIProvider>
    </div>
  );
}
