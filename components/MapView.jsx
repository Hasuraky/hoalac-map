'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import ShareButton from '@/components/ShareButton';
import { fetchProjects, overlayUrl, toDisplayImage } from '@/lib/projects';
import { parseSvgLots } from '@/lib/svgLots';
import { fetchLandmarks, landmarkUrl } from '@/lib/landmarks';
import { fetchRegionLinks } from '@/lib/regionLinks';

// Tâm bản đồ: khu Hòa Lạc
const HOA_LAC_CENTER = [105.526, 21.008]; // Goong dùng [lng, lat]
const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;

// Style vệ tinh thuần từ kho ảnh Goong
function goongSatelliteStyle(key) {
  return {
    version: 8,
    sources: {
      'goong-sat': {
        type: 'raster',
        tiles: [`https://satellite.goong.io/{z}/{x}/{y}.png?api_key=${key}`],
        tileSize: 256,
        maxzoom: 20,
        attribution: '© Goong Maps',
      },
    },
    layers: [{ id: 'goong-satellite', type: 'raster', source: 'goong-sat' }],
  };
}

const STYLES = {
  streets: 'https://tiles.goong.io/assets/goong_map_web.json',
};

// Ẩn/hiện các địa điểm (POI) của nền bản đồ — trường học, chùa, quán xá...
function applyPoiVisibility(map, show) {
  let style;
  try {
    style = map.getStyle();
  } catch {
    return;
  }
  if (!style?.layers) return;
  const want = show ? 'visible' : 'none';
  for (const layer of style.layers) {
    const sourceLayer = layer['source-layer'] ?? '';
    if (layer.type === 'symbol' && (/poi/i.test(layer.id) || /poi/i.test(sourceLayer))) {
      // chỉ set khi khác — tránh vòng lặp styledata
      const cur = layer.layout?.visibility ?? 'visible';
      if (cur !== want) map.setLayoutProperty(layer.id, 'visibility', want);
    }
  }
}

// Ghim SVG theo màu trạng thái
function pinElement(color) {
  const el = document.createElement('div');
  el.className = 'goong-pin';
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`;
  return el;
}

function PopupCard({ p, onRoute, routing, onRegionLinks }) {
  const color = STATUS_COLORS[p.status] ?? '#8b877c';
  return (
    <div className="popup-card">
      <div className="popup-thumb">
        {p.thumbnail ? (
          <img src={p.thumbnail} alt={p.title} />
        ) : (
          <div className="popup-thumb-fallback">{p.type ?? 'BĐS'}</div>
        )}
        <span className="popup-status" style={{ color, borderColor: color, background: `${color}22` }}>
          {STATUS_LABELS[p.status] ?? p.status}
        </span>
      </div>
      <div className="popup-body">
        <p className="popup-code">{p.code}</p>
        <h3>{p.title}</h3>
        <div className="popup-metrics">
          {p.price === undefined ? (
            <a href="/login" className="price-locked">🔒 Đăng nhập để xem giá</a>
          ) : (
            <span className="price">{formatPrice(p.price)}</span>
          )}
          <span className="area">{p.area} m²</span>
        </div>
        {p.address && <div className="meta">{p.address}</div>}
        <ShareButton
          title={`${p.code} — ${p.title}`}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/?bds=${p.id}`}
        />
        <div className="popup-actions">
          {/* dùng <a> điều hướng thường: popup nằm trong portal của Goong,
              Next <Link> soft-nav từ đây bị lỗi (phải reload / khách bị đá về trang chủ) */}
          <a href={`/bds/${p.id}`} className="popup-btn">
            Xem chi tiết →
          </a>
          <button
            type="button"
            className="popup-btn popup-btn-outline"
            onClick={() => onRoute(p)}
            disabled={routing}
          >
            {routing ? 'Đang tìm…' : '🧭 Đường đi'}
          </button>
        </div>
        {p._linkCount > 0 && (
          <button
            type="button"
            className="popup-btn popup-btn-outline popup-btn-full"
            onClick={() => onRegionLinks(p)}
          >
            🔗 Liên kết vùng ({p._linkCount})
          </button>
        )}
      </div>
    </div>
  );
}

// Ngôi sao vàng + nhãn 2 quần đảo — hiện khi zoom ra (biển Đông)
const SEA_MARKS = [
  { lngLat: [114.3, 16.5], label: 'Quần đảo Hoàng Sa\n(Việt Nam)' },
  { lngLat: [113.8, 9.5], label: 'Quần đảo Trường Sa\n(Việt Nam)' },
];

function starElement(withLabel) {
  const el = document.createElement('div');
  el.className = 'sea-star';
  el.innerHTML = `
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <polygon points="12,2 14.9,8.6 22,9.2 16.5,13.9 18.2,21 12,17.3 5.8,21 7.5,13.9 2,9.2 9.1,8.6"
        fill="#ffcc00" stroke="#c00" stroke-width="1"/>
    </svg>
    ${withLabel ? `<span class="sea-star-label">${withLabel.replace(/\n/g, '<br>')}</span>` : ''}`;
  return el;
}

export default function MapView({ properties, flyTarget, focusId }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const seaMarkersRef = useRef([]);

  const [ready, setReady] = useState(false);
  const [baseStyle, setBaseStyle] = useState('streets'); // mặc định: bản đồ
  const [showPoi, setShowPoi] = useState(false); // mặc định: ẩn địa điểm
  const showPoiRef = useRef(true);
  showPoiRef.current = showPoi;

  const lotsRef = useRef({}); // projectId -> [{lot_number, ring, project_id}]
  const [lotsVersion, setLotsVersion] = useState(0);
  const regionLinksRef = useRef([]); // liên kết vùng
  const shownLinkForRef = useRef(null); // id sản phẩm đang hiện mũi tên
  const suppressClearRef = useRef(false); // chặn xóa mũi tên khi chủ động ẩn popup
  const shownArrowRef = useRef(null); // { from, links } đang hiện, dựng lại nhãn khi zoom
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  const [selected, setSelected] = useState(null);
  const [popupNode, setPopupNode] = useState(null);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [userPos, setUserPos] = useState(null); // [lng, lat]
  const overlaysRef = useRef([]); // dự án có sơ đồ

  // Vẽ sơ đồ dự án — CHỈ thêm khi chưa có (tránh xóa/thêm liên tục làm hủy ảnh đang tải)
  function drawOverlays(map) {
    for (const pr of overlaysRef.current) {
      const url = pr.displayUrl; // ảnh đã rasterize (SVG->PNG) nếu cần
      if (!url || !pr.overlay_coords) continue;
      const srcId = `ov-${pr.id}`;
      const lyrId = `ovl-${pr.id}`;
      if (map.getSource(srcId)) continue; // đã có -> bỏ qua
      try {
        map.addSource(srcId, { type: 'image', url, coordinates: pr.overlay_coords });
        map.addLayer({
          id: lyrId,
          type: 'raster',
          source: srcId,
          paint: { 'raster-opacity': pr.overlay_opacity ?? 0.85 },
        });
      } catch {
        // style chưa sẵn sàng -> lần idle sau sẽ thêm
      }
    }
  }

  // Khởi tạo bản đồ
  useEffect(() => {
    if (!MAPTILES_KEY || mapRef.current || !containerRef.current) return;
    goongjs.accessToken = MAPTILES_KEY;
    const map = new goongjs.Map({
      container: containerRef.current,
      style: STYLES.streets,
      center: HOA_LAC_CENTER,
      zoom: 13,
      minZoom: 5,
      maxZoom: 19,
    });
    map.addControl(new goongjs.NavigationControl(), 'top-left');
    // La bàn nhỏ góc trên bên phải — gắn thẳng vào khung bản đồ để chắc chắn hiển thị
    const compassEl = document.createElement('div');
    compassEl.className = 'mini-compass';
    compassEl.title = 'Về hướng Bắc';
    compassEl.innerHTML = `<svg viewBox="0 0 40 40" width="34" height="34">
      <circle cx="20" cy="20" r="18" fill="#fff" stroke="#d8d3c8" stroke-width="1.5"/>
      <polygon points="20,6 24,21 20,18 16,21" fill="#9F0201"/>
      <polygon points="20,34 24,19 20,22 16,19" fill="#8b877c"/>
      <text x="20" y="12.5" text-anchor="middle" font-size="7" font-weight="700" fill="#9F0201">N</text>
    </svg>`;
    const compassSvg = compassEl.querySelector('svg');
    compassSvg.style.transition = 'transform 0.1s linear';
    compassSvg.style.transformOrigin = '50% 50%';
    const updateCompass = () => { compassSvg.style.transform = `rotate(${-map.getBearing()}deg)`; };
    compassEl.addEventListener('click', () => map.easeTo({ bearing: 0, pitch: 0, duration: 300 }));
    map.on('rotate', updateCompass);
    map.getContainer().appendChild(compassEl);
    updateCompass();
    map.on('load', () => setReady(true));
    // Ẩn địa điểm + vẽ sơ đồ ngay khi style vừa nạp (giữ qua mỗi lần đổi nền)
    map.on('styledata', () => {
      applyPoiVisibility(map, showPoiRef.current);
      drawOverlays(map);
    });

    // Tải danh sách dự án có sơ đồ + đọc lô từ SVG
    fetchProjects()
      .then(async (list) => {
        const withOverlay = list.filter((p) => p.overlay_path && p.overlay_coords);
        // Chuẩn bị ảnh hiển thị (SVG -> PNG) rồi mới vẽ
        for (const pr of withOverlay) {
          pr.displayUrl = await toDisplayImage(overlayUrl(pr.overlay_path));
        }
        overlaysRef.current = withOverlay;
        if (map.isStyleLoaded()) drawOverlays(map);
        for (const pr of list) {
          if (
            pr.overlay_path &&
            pr.overlay_path.toLowerCase().endsWith('.svg') &&
            pr.overlay_coords
          ) {
            const rings = await parseSvgLots(overlayUrl(pr.overlay_path), pr.overlay_coords);
            if (rings.length) {
              lotsRef.current[pr.id] = rings.map((r) => ({ ...r, project_id: pr.id }));
            }
          }
        }
        setLotsVersion((v) => v + 1);
      })
      .catch(() => {});
    mapRef.current = map;

    // Liên kết vùng (dùng khi bấm nút trong popup)
    fetchRegionLinks().then((list) => { regionLinksRef.current = list; }).catch(() => {});

    // Điểm nổi bật — ghim ảnh PNG, co giãn theo zoom (mốc zoom 16)
    const LM_REF_ZOOM = 16;
    const lmImgs = []; // { img, base }
    fetchLandmarks()
      .then((list) => {
        for (const lm of list) {
          const el = document.createElement('div');
          el.className = 'landmark-marker';
          const img = document.createElement('img');
          img.src = landmarkUrl(lm.image_path);
          if (lm.name) img.title = lm.name;
          el.appendChild(img);
          new goongjs.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lm.lng, lm.lat])
            .addTo(map);
          lmImgs.push({ img, base: lm.width_px || 90 });
        }
        scaleLandmarks();
      })
      .catch(() => {});

    function scaleLandmarks() {
      const z = map.getZoom();
      const factor = 7.5 * Math.pow(2, z - LM_REF_ZOOM); // 5 x 1.5
      for (const { img, base } of lmImgs) {
        const w = Math.max(6, Math.min(6000, base * factor));
        img.style.width = `${w}px`;
      }
    }
    map.on('zoom', scaleLandmarks);
    map.on('zoom', () => refreshRegionLabels());

    // Click vào vùng trống -> ẩn mũi tên liên kết vùng (như đóng popup)
    map.on('click', (e) => {
      if (!shownArrowRef.current) return;
      const hits = map.getLayer('lots-fill') ? map.queryRenderedFeatures(e.point, { layers: ['lots-fill'] }) : [];
      if (!hits.length) clearRegionLinks(); // không trúng lô nào -> vùng trống
    });

    // Sao vàng + nhãn 2 quần đảo, chỉ hiện khi zoom ra
    SEA_MARKS.forEach((m) => {
      const marker = new goongjs.Marker({ element: starElement(m.label), anchor: 'center' })
        .setLngLat(m.lngLat)
        .addTo(map);
      seaMarkersRef.current.push(marker);
    });
    const updateSea = () => {
      const show = map.getZoom() <= 7.5;
      seaMarkersRef.current.forEach((mk) => {
        mk.getElement().style.display = show ? 'flex' : 'none';
      });
    };
    map.on('zoom', updateSea);
    updateSea();

    return () => {
      seaMarkersRef.current.forEach((mk) => mk.remove());
      seaMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Đổi lớp nền (đổi xong áp lại trạng thái ẩn/hiện địa điểm)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setStyle(baseStyle === 'satellite' ? goongSatelliteStyle(MAPTILES_KEY) : STYLES.streets);
  }, [baseStyle, ready]);

  // Bật/tắt địa điểm nền (styledata handler lo phần còn lại)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    applyPoiVisibility(map, showPoi);
  }, [showPoi, ready]);

  // Lấy vị trí người dùng
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.longitude, pos.coords.latitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Liên kết vùng của 1 sản phẩm = link riêng của nó + link của dự án nó thuộc
  function linksForProduct(p) {
    return regionLinksRef.current.filter(
      (l) => l.property_id === p.id || (p.project_id && l.project_id === p.project_id)
    );
  }
  // Gắn số lượng liên kết vùng vào object để popup biết có hiện nút không
  function withLinkCount(p) {
    if (!p || p.__lotOnly) return p;
    return { ...p, _linkCount: linksForProduct(p).length };
  }

  // Điểm điều khiển + đỉnh cong cho đường Bézier từ from->to theo độ cong (-1..1)
  // curve > 0 = cong lên (về phía Bắc), < 0 = cong xuống
  function curveGeometry(from, to, curve) {
    const latR = (((from[1] + to[1]) / 2) * Math.PI) / 180;
    const cos = Math.cos(latR);
    const dx = (to[0] - from[0]) * cos;
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1e-9;
    let px = -dy / len; // vuông góc (đơn vị, không gian đã co theo vĩ độ)
    let py = dx / len;
    if (py < 0) { px = -px; py = -py; } // luôn hướng Bắc -> dương = cong lên
    const offset = (curve || 0) * len * 0.4;
    const mx = (from[0] + to[0]) / 2;
    const my = (from[1] + to[1]) / 2;
    return {
      control: [mx + (px * 2 * offset) / cos, my + py * 2 * offset],
      apex: [mx + (px * offset) / cos, my + py * offset],
      len,
    };
  }

  // Chuỗi điểm trên đường Bézier bậc 2 (thẳng nếu control ~ điểm giữa)
  function bezierLine(from, to, control, n = 40) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const mt = 1 - t;
      pts.push([
        mt * mt * from[0] + 2 * mt * t * control[0] + t * t * to[0],
        mt * mt * from[1] + 2 * mt * t * control[1] + t * t * to[1],
      ]);
    }
    return pts;
  }

  // Đầu mũi tên đặc tại đích, hướng theo tiếp tuyến base->tip
  function arrowHeadPolygon(base, tip, maxLen) {
    const latR = (tip[1] * Math.PI) / 180;
    const cos = Math.cos(latR);
    const dx = (tip[0] - base[0]) * cos;
    const dy = tip[1] - base[1];
    const len = Math.hypot(dx, dy);
    if (!len) return null;
    const ux = dx / len;
    const uy = dy / len;
    const headLen = Math.min(0.004, (maxLen ?? len) * 0.4); // cố định cho mọi mũi tên
    const ang = (32 * Math.PI) / 180;
    const wing = (s) => {
      const ca = Math.cos(s * ang);
      const sa = Math.sin(s * ang);
      const rx = -ux * ca - -uy * sa;
      const ry = -ux * sa + -uy * ca;
      return [tip[0] + (rx * headLen) / cos, tip[1] + ry * headLen];
    };
    return [[wing(1), tip, wing(-1), wing(1)]];
  }

  // Cỡ chữ theo zoom (khớp các mốc trong layer)
  function fontSizeForZoom(z) {
    if (z <= 10) return 10;
    if (z >= 18) return 26;
    if (z <= 14) return 10 + ((16 - 10) * (z - 10)) / 4;
    return 16 + ((26 - 16) * (z - 14)) / 4;
  }

  // Dựng nhãn: chỉ hiện khi mũi tên trên màn hình đủ dài để chứa hết chữ
  function buildLabelData(from, links) {
    const map = mapRef.current;
    if (!map) return { type: 'FeatureCollection', features: [] };
    const fs = fontSizeForZoom(map.getZoom());
    const pa = map.project(from);
    const feats = [];
    for (const l of links) {
      if (!l.label) continue;
      const to = [l.to_lng, l.to_lat];
      const pb = map.project(to);
      const screenLen = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const textW = l.label.length * fs * 0.55; // ước lượng bề rộng chữ (px)
      if (screenLen < textW + 16) continue; // không đủ chỗ -> ẩn nhãn này
      const g = curveGeometry(from, to, l.curve || 0); // đặt nhãn tại đỉnh cong
      const latR = (g.apex[1] * Math.PI) / 180;
      let rotate = Math.atan2(-(to[1] - from[1]), (to[0] - from[0]) * Math.cos(latR)) * (180 / Math.PI);
      if (rotate > 90) rotate -= 180; else if (rotate < -90) rotate += 180;
      feats.push({ type: 'Feature', properties: { label: l.label, rotate }, geometry: { type: 'Point', coordinates: g.apex } });
    }
    return { type: 'FeatureCollection', features: feats };
  }

  // Dựng lại nhãn khi zoom (chiều dài màn hình & cỡ chữ thay đổi)
  function refreshRegionLabels() {
    const map = mapRef.current;
    const cur = shownArrowRef.current;
    if (!map || !cur || !map.getSource('rlinks-label')) return;
    map.getSource('rlinks-label').setData(buildLabelData(cur.from, cur.links));
  }

  // Hiển thị mũi tên liên kết vùng cho sản phẩm p (đồng thời ẩn popup marker)
  function toggleRegionLinks(p) {
    const map = mapRef.current;
    if (!map) return;
    const links = linksForProduct(p);
    if (!links.length) return;
    const from = [p.lng, p.lat];
    const shafts = [];
    const heads = [];
    for (const l of links) {
      const to = [l.to_lng, l.to_lat];
      const g = curveGeometry(from, to, l.curve || 0);
      const line = bezierLine(from, to, g.control);
      shafts.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } });
      // đầu mũi tên hướng theo tiếp tuyến cuối (điểm áp chót -> đích)
      const base = line[line.length - 2];
      const ring = arrowHeadPolygon(base, to, g.len);
      if (ring) heads.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: ring } });
    }
    shownArrowRef.current = { from, links }; // để dựng lại nhãn khi zoom
    const shaftData = { type: 'FeatureCollection', features: shafts };
    const headData = { type: 'FeatureCollection', features: heads };
    const labelData = buildLabelData(from, links);

    if (map.getSource('rlinks')) {
      map.getSource('rlinks').setData(shaftData);
      map.getSource('rlinks-head').setData(headData);
      map.getSource('rlinks-label').setData(labelData);
    } else {
      map.addSource('rlinks', { type: 'geojson', data: shaftData });
      map.addSource('rlinks-head', { type: 'geojson', data: headData });
      map.addSource('rlinks-label', { type: 'geojson', data: labelData });
      // thân: viền trắng dày dưới + lõi đỏ trên
      map.addLayer({ id: 'rlinks-casing', type: 'line', source: 'rlinks', paint: { 'line-color': '#fff', 'line-width': 9 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'rlinks-line', type: 'line', source: 'rlinks', paint: { 'line-color': '#9F0201', 'line-width': 5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      // đầu mũi tên: fill đỏ + viền trắng dày
      map.addLayer({ id: 'rlinks-head-fill', type: 'fill', source: 'rlinks-head', paint: { 'fill-color': '#9F0201' } });
      map.addLayer({ id: 'rlinks-head-outline', type: 'line', source: 'rlinks-head', paint: { 'line-color': '#fff', 'line-width': 3 }, layout: { 'line-join': 'round' } });
      // nhãn: 1 nhãn/mũi tên tại điểm giữa, luôn hiện, chữ đậm trắng viền xám
      map.addLayer({ id: 'rlinks-label', type: 'symbol', source: 'rlinks-label',
        layout: {
          'text-field': ['get', 'label'],
          // tự thu nhỏ/phóng lớn theo mức zoom
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 16, 18, 26],
          'text-font': ['Roboto Bold'],
          // bỏ overlap -> tự ẩn khi không đủ chỗ hiển thị
          'text-rotate': ['get', 'rotate'],
          'text-rotation-alignment': 'map',
          'text-offset': [0, -0.9],
          'text-max-width': 999,
        },
        paint: { 'text-color': '#fff', 'text-halo-color': '#262626', 'text-halo-width': 3 } });
    }
    shownLinkForRef.current = p.id;
    // ẩn popup marker mà không xóa mũi tên vừa vẽ
    suppressClearRef.current = true;
    popupRef.current?.remove();
    suppressClearRef.current = false;
    // zoom để hiển thị toàn bộ liên kết vùng của sản phẩm
    const bounds = new goongjs.LngLatBounds(from, from);
    for (const l of links) bounds.extend([l.to_lng, l.to_lat]);
    // chừa thêm lề trái cho thanh bộ lọc để không che mũi tên
    const sidebar = typeof window !== 'undefined' && window.innerWidth > 720 ? 380 : 20;
    map.fitBounds(bounds, { padding: { top: 90, bottom: 90, right: 90, left: sidebar }, maxZoom: 16, duration: 600 });
  }

  function clearRegionLinks() {
    const map = mapRef.current;
    if (map?.getSource) {
      if (map.getSource('rlinks')) map.getSource('rlinks').setData({ type: 'FeatureCollection', features: [] });
      if (map.getSource('rlinks-head')) map.getSource('rlinks-head').setData({ type: 'FeatureCollection', features: [] });
      if (map.getSource('rlinks-label')) map.getSource('rlinks-label').setData({ type: 'FeatureCollection', features: [] });
    }
    shownLinkForRef.current = null;
    shownArrowRef.current = null;
  }

  // Mở popup marker cho 1 sản phẩm (dùng chung: click marker + link chia sẻ)
  function openPropertyPopup(p) {
    const map = mapRef.current;
    if (!map || !popupRef.current || p.lat == null || p.lng == null) return;
    clearRegionLinks();
    const node = document.createElement('div');
    popupRef.current.setLngLat([p.lng, p.lat]).setDOMContent(node).addTo(map);
    setPopupNode(node);
    setSelected(withLinkCount(p));
  }

  // Bấm vào lô -> popup nhanh (property nếu đã gắn, hoặc "chưa có thông tin")
  function handleLotClick(e) {
    const map = mapRef.current;
    const f = e.features && e.features[0];
    if (!f) return;
    const pid = f.properties.pid;
    const prop = pid ? propertiesRef.current.find((p) => p.id === pid) : null;
    clearRegionLinks();
    const node = document.createElement('div');
    popupRef.current.setLngLat(e.lngLat).setDOMContent(node).addTo(map);
    setPopupNode(node);
    setSelected(prop ? withLinkCount(prop) : { __lotOnly: true, lot_number: f.properties.lot_number });
  }

  // Dựng/cập nhật vùng lô từ SVG, tô màu theo trạng thái BĐS
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const build = () => {
      // tra BĐS theo (dự án | số lô)
      const byKey = {};
      for (const p of propertiesRef.current) {
        if (p.project_id && p.lot_number) byKey[`${p.project_id}|${p.lot_number}`] = p;
      }
      const feats = [];
      for (const pid in lotsRef.current) {
        for (const lot of lotsRef.current[pid]) {
          const prop = byKey[`${pid}|${lot.lot_number}`];
          feats.push({
            type: 'Feature',
            properties: {
              lot_number: lot.lot_number,
              status: prop ? prop.status : 'none',
              pid: prop ? prop.id : '',
            },
            geometry: { type: 'Polygon', coordinates: [[...lot.ring, lot.ring[0]]] },
          });
        }
      }
      const data = { type: 'FeatureCollection', features: feats };

      if (map.getSource('lots')) {
        map.getSource('lots').setData(data);
        return;
      }
      map.addSource('lots', { type: 'geojson', data });
      map.addLayer({
        id: 'lots-fill',
        type: 'fill',
        source: 'lots',
        paint: {
          'fill-color': [
            'match',
            ['get', 'status'],
            'available', STATUS_COLORS.available,
            'deposited', STATUS_COLORS.deposited,
            'sold', STATUS_COLORS.sold,
            'inactive', STATUS_COLORS.inactive,
            '#8b877c', // chưa gắn -> xám
          ],
          'fill-opacity': 0.5,
        },
      });
      map.addLayer({
        id: 'lots-line',
        type: 'line',
        source: 'lots',
        paint: { 'line-color': '#ffffff', 'line-width': 1 },
      });
      map.on('click', 'lots-fill', handleLotClick);
      map.on('mouseenter', 'lots-fill', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'lots-fill', () => (map.getCanvas().style.cursor = ''));
    };

    if (map.isStyleLoaded()) build();
    else map.once('idle', build);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, lotsVersion, ready, baseStyle]);

  // Bay tới dự án khi bấm chip nổi bật
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !flyTarget) return;
    if (flyTarget.bounds) {
      const lngs = flyTarget.bounds.map((c) => c[0]);
      const lats = flyTarget.bounds.map((c) => c[1]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 80, duration: 1200 }
      );
    } else {
      map.flyTo({ center: [flyTarget.lng, flyTarget.lat], zoom: flyTarget.zoom ?? 16, duration: 1200 });
    }
  }, [flyTarget, ready]);

  // Chấm vị trí người dùng
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userPos) return;
    userMarkerRef.current?.remove();
    const el = document.createElement('div');
    el.className = 'origin-dot';
    userMarkerRef.current = new goongjs.Marker({ element: el }).setLngLat(userPos).addTo(map);
    return () => userMarkerRef.current?.remove();
  }, [userPos, ready]);

  // Vẽ marker BĐS
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Popup dùng chung, nội dung render bằng React portal
    if (!popupRef.current) {
      popupRef.current = new goongjs.Popup({
        offset: 38,
        closeButton: true,
        maxWidth: '280px',
        className: 'goong-popup',
      });
      popupRef.current.on('close', () => { setSelected(null); if (!suppressClearRef.current) clearRegionLinks(); });
    }

    // BĐS đã có vùng lô trên sơ đồ -> ẩn marker (vùng lô đại diện rồi)
    const covered = new Set();
    {
      const byKey = {};
      for (const p of properties) {
        if (p.project_id && p.lot_number) byKey[`${p.project_id}|${p.lot_number}`] = p.id;
      }
      for (const pid in lotsRef.current) {
        for (const lot of lotsRef.current[pid]) {
          const id = byKey[`${pid}|${lot.lot_number}`];
          if (id) covered.add(id);
        }
      }
    }

    properties
      .filter((p) => p.lat != null && p.lng != null && !covered.has(p.id))
      .forEach((p) => {
        const el = pinElement(STATUS_COLORS[p.status] ?? '#8b877c');
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openPropertyPopup(p);
        });
        const marker = new goongjs.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [properties, ready, baseStyle, lotsVersion]);

  // Link chia sẻ sản phẩm (?bds=id) -> bay tới marker + mở popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusId) return;
    const p = propertiesRef.current.find((x) => x.id === focusId);
    if (!p || p.lat == null || p.lng == null) return;
    map.flyTo({ center: [p.lng, p.lat], zoom: 17, duration: 1200 });
    openPropertyPopup(p);
  }, [focusId, ready, properties]);

  // Vẽ tuyến đường
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const draw = () => {
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');
      if (!route) return;
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: route.coords },
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#275838', 'line-width': 5, 'line-opacity': 0.85 },
      });
      const lngs = route.coords.map((c) => c[0]);
      const lats = route.coords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, duration: 800 }
      );
    };

    if (map.isStyleLoaded()) draw();
    else map.once('styledata', draw);
  }, [route, ready, baseStyle]);

  // Tìm đường bằng OSRM (miễn phí, không tốn quota Goong)
  function handleRoute(p) {
    setRouteError(null);
    if (!navigator.geolocation) {
      setRouteError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setRouting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat0, longitude: lng0 } = pos.coords;
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lng0},${lat0};${p.lng},${p.lat}?overview=full&geometries=geojson`
          );
          const json = await res.json();
          const r = json?.routes?.[0];
          if (!r) throw new Error('no route');
          popupRef.current?.remove();
          setSelected(null);
          setRoute({
            coords: r.geometry.coordinates, // [lng, lat] — đúng chuẩn Goong
            distanceKm: (r.distance / 1000).toFixed(1),
            durationMin: Math.round(r.duration / 60),
            dest: p,
          });
        } catch {
          setRouteError('Không tìm được đường đi — thử lại sau.');
        }
        setRouting(false);
      },
      () => {
        setRouteError('Không lấy được vị trí của bạn — kiểm tra quyền truy cập vị trí của trình duyệt.');
        setRouting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (!MAPTILES_KEY) {
    return (
      <div className="map-loading">
        Chưa cấu hình Goong — thêm biến NEXT_PUBLIC_GOONG_MAPTILES_KEY vào Vercel / .env.local
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="gmap-container" />

      {/* Nội dung popup render bằng React */}
      {selected && popupNode && selected.__lotOnly &&
        createPortal(
          <div className="popup-card popup-lot-empty">
            <p className="popup-code">Lô {selected.lot_number}</p>
            <p className="meta">Chưa có thông tin — chưa gắn BĐS cho lô này.</p>
          </div>,
          popupNode
        )}
      {selected && popupNode && !selected.__lotOnly &&
        createPortal(<PopupCard p={selected} onRoute={handleRoute} routing={routing} onRegionLinks={toggleRegionLinks} />, popupNode)}

      {(route || routeError) && (
        <div className="route-banner">
          {route ? (
            <>
              <strong>{route.distanceKm} km</strong> · ~{route.durationMin} phút lái xe
              <span className="route-dest"> → {route.dest.code}</span>
            </>
          ) : (
            <span className="route-err">{routeError}</span>
          )}
          <button
            type="button"
            onClick={() => {
              setRoute(null);
              setRouteError(null);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Nút địa điểm — riêng, phía trên (chỉ ở chế độ Bản đồ) */}
      {baseStyle === 'streets' && (
        <button
          type="button"
          className={`poi-toggle${showPoi ? ' active' : ''}`}
          onClick={() => setShowPoi((v) => !v)}
          title="Ẩn/hiện trường học, chùa, quán xá... của nền bản đồ"
        >
          📍 Địa điểm
        </button>
      )}

      {/* Cụm dưới phải: định vị (trái) + chuyển lớp nền */}
      <div className="map-controls-bottom">
        {userPos && (
          <button
            type="button"
            className="btn-locate"
            title="Vị trí của tôi"
            onClick={() => mapRef.current?.flyTo({ center: userPos, zoom: 16 })}
          >
            ◎
          </button>
        )}
        <div className="layer-switch">
          <button
            type="button"
            className={baseStyle === 'streets' ? 'active' : ''}
            onClick={() => setBaseStyle('streets')}
          >
            Bản đồ
          </button>
          <button
            type="button"
            className={baseStyle === 'satellite' ? 'active' : ''}
            onClick={() => setBaseStyle('satellite')}
          >
            Vệ tinh
          </button>
        </div>
      </div>
    </>
  );
}
