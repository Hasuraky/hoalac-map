// Đọc file SVG sơ đồ phân lô -> danh sách lô (id + hình) đã chuyển sang tọa độ địa lý.
//
// Quy ước Illustrator: mỗi lô là 1 GROUP/LAYER có id = số lô, bên trong chứa
// path ranh lô (+ có thể kèm text mã căn, chi tiết khác). Code lấy id ở group,
// và dùng path có chu vi lớn nhất trong group làm ranh giới lô.
// (Vẫn tương thích: nếu id đặt thẳng trên 1 path thì cũng đọc được.)
//
// overlayCoords: 4 góc [TL, TR, BR, BL] = [[lng,lat]x4], không xoay (khớp ảnh overlay).

const GEOM = ['path', 'rect', 'polygon', 'polyline', 'circle', 'ellipse', 'line'];

function isGeom(el) {
  return GEOM.includes(el.tagName.toLowerCase());
}
function geomInside(el) {
  return isGeom(el) ? [el] : [...el.querySelectorAll(GEOM.join(','))];
}
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
  if (!text.includes('<svg')) return [];

  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return [];

  let vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4) {
    const w = parseFloat(svg.getAttribute('width')) || 1000;
    const h = parseFloat(svg.getAttribute('height')) || 1000;
    vb = [0, 0, w, h];
  }

  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden';
  const imported = document.importNode(svg, true);
  imported.setAttribute('width', vb[2]);
  imported.setAttribute('height', vb[3]);
  holder.appendChild(imported);
  document.body.appendChild(holder);

  const [TL, TR, BR, BL] = overlayCoords;
  const toGeo = (x, y) => {
    const fx = (x - vb[0]) / vb[2];
    const fy = (y - vb[1]) / vb[3];
    return [TL[0] + fx * (TR[0] - TL[0]), TL[1] + fy * (BL[1] - TL[1])];
  };

  // Ứng viên "lô": phần tử có id + chứa hình. Chỉ giữ lớp trong cùng
  // (loại layer bao ngoài vì nó chứa các lô con cũng có id + hình).
  const withId = [...imported.querySelectorAll('[id]')];
  const lotEls = withId.filter((el) => {
    if (geomInside(el).length === 0) return false; // không có hình -> bỏ (vd group chỉ có text)
    const innerLots = [...el.querySelectorAll('[id]')].some(
      (d) => d !== el && geomInside(d).length > 0
    );
    return !innerLots; // là lớp trong cùng
  });

  const lots = [];
  for (const el of lotEls) {
    // chọn hình có chu vi lớn nhất trong lô làm ranh giới
    let best = null;
    let bestLen = 0;
    for (const g of geomInside(el)) {
      if (typeof g.getTotalLength !== 'function') continue;
      let len = 0;
      try {
        len = g.getTotalLength();
      } catch {
        continue;
      }
      if (len > bestLen) {
        bestLen = len;
        best = g;
      }
    }
    if (!best || !bestLen) continue;

    const n = Math.min(160, Math.max(16, Math.round(bestLen / 4)));
    const ctm = best.getCTM();
    const ring = [];
    for (let i = 0; i <= n; i++) {
      let p = best.getPointAtLength((bestLen * i) / n);
      if (ctm) p = applyMatrix(ctm, p);
      ring.push(toGeo(p.x, p.y));
    }
    lots.push({ lot_number: el.id, ring });
  }

  document.body.removeChild(holder);
  return lots;
}
