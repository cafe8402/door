import React from 'react';

/** Shared, rounded inspection symbols. Adjacent text supplies the accessible label. */
export function InspectionIcon({ kind = 'mark', size = 32, className = '' }: {
  kind?: 'mark' | 'file' | 'web' | 'report'; size?: number; className?: string;
}) {
  return <svg className={`inspection-icon ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === 'file' ? <><path d="M17 26H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10l6 6v5M18 4v6h6M10 13h6M10 18h4"/><circle cx="22" cy="22" r="5"/><path d="m26 26 3 3"/></>
      : kind === 'web' ? <><rect x="3" y="5" width="26" height="22" rx="4"/><path d="M3 12h26M8 8.5h.01M12 8.5h.01M8 18h5M8 22h3"/><circle cx="21" cy="19" r="4"/><path d="m24 22 3 3"/></>
      : kind === 'report' ? <><rect x="6" y="5" width="21" height="24" rx="3"/><path d="M12 5V3h9v2M11 13h10M11 18h5m-5 6 3 2 7-6"/></>
      : <><path d="M16 5c-4-2-8-2-12-1v23c4-1 8-1 12 1 4-2 8-2 12-1V4c-4-1-8-1-12 1ZM16 5v9"/><path d="m11 20 4 4 7-9" strokeWidth="2.2"/></>}
  </svg>;
}
