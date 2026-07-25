// Đọc file SVG sơ đồ phân lô -> danh sách lô (id + hình) đã chuyển sang tọa độ địa lý.
// Yêu cầu: mỗi lô là 1 hình (path/rect/polygon...) có thuộc tính id = số lô.
// overlayCoords: 4 góc [TL, TR, BR, BL] = [[lng,lat]x4], không xoay (khớp ảnh overlay).

function applyMatrix(m, p) {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export async function parseSvgLots(svgUrl, overlayCoords) {
  if (!svgUrl || !overlayCoords || overlayCoords.length !== 4) return [];
  let text;
  try {
    text = await fetch(svgUrl).then((r) => r.text());
  } catch {
    return [];
  }
  if (!text.includes('<svg')) return []; // không phải SVG

  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return [];

  // viewBox: [minX, minY, w, h]
  let vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4) {
    const w = parseFloat(svg.getAttribute('width')) || 1000;
    const h = parseFloat(svg.getAttribute('height')) || 1000;
    vb = [0, 0, w, h];
  }

  // Render ẩn để dùng API hình học (getPointAtLength...) — đặt width/height = viewBox (1:1)
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden';
  const imported = document.importNode(svg, true);
  imported.setAttribute('width', vb[2]);
  imported.setAttribute('height', vb[3]);
  holder.appendChild(imported);
  document.body.appendChild(holder);

  const [TL, TR, BR, BL] = overlayCoords;
  const toGeo = (x, y) => {
    const fx = (x - vb[0]) / vb[2]; // 0..1 trái->phải
    const fy = (y - vb[1]) / vb[3]; // 0..1 trên->dưới
    const lng = TL[0] + fx * (TR[0] - TL[0]);
    const lat = TL[1] + fy * (BL[1] - TL[1]);
    return [lng, lat];
  };

  const lots = [];
  const els = [...imported.querySelectorAll('[id]')].filter(
    (e) => typeof e.getPointAtLength === 'function' && typeof e.getTotalLength === 'function'
  );

  for (const el of els) {
    let len = 0;
    try {
      len = el.getTotalLength();
    } catch {
      continue;
    }
    if (!len) continue;
    const n = Math.min(160, Math.max(16, Math.round(len / 4)));
    const ctm = el.getCTM();
    const ring = [];
    for (let i = 0; i <= n; i++) {
      let p = el.getPointAtLength((len * i) / n);
      if (ctm) p = applyMatrix(ctm, p);
      ring.push(toGeo(p.x, p.y));
    }
    lots.push({ lot_number: el.id, ring });
  }

  document.body.removeChild(holder);
  return lots;
}
