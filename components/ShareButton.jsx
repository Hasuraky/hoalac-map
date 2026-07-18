'use client';

import { useState } from 'react';

// Nút chia sẻ: mobile mở share hệ thống (Zalo, Messenger...), desktop copy link
export default function ShareButton({ title, url }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // người dùng bấm hủy -> thôi
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard bị chặn -> hiện prompt để copy tay
      window.prompt('Copy link này:', shareUrl);
    }
  }

  return (
    <button type="button" className="btn-share" onClick={handleShare}>
      {copied ? '✓ Đã copy link' : '⤴ Chia sẻ'}
    </button>
  );
}
