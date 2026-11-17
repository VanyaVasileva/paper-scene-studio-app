export function reelDownloadDialog(jsx, { open, busy, status, error, download, onClose, onCancel, onRetry, onShare, canShare }) {
  if (!open) return null;
  const { jsx: h, jsxs: hs } = jsx;
  const button = { minHeight: 46, padding: '12px 18px', borderRadius: 10, border: '1px solid #c96f55', background: '#c96f55', color: '#fff', font: 'inherit', fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' };
  return h('div', { style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(20,35,35,.42)', display: 'grid', placeItems: 'center', padding: 20 }, children:
    hs('section', { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'reel-dialog-title', style: { width: 'min(100%, 520px)', maxHeight: '90dvh', overflow: 'auto', padding: 24, borderRadius: 16, background: '#fffefa', color: '#243a3a', boxShadow: '0 15px 60px #0003' }, children: [
      h('h2', { id: 'reel-dialog-title', style: { margin: '0 0 12px', fontSize: 23 }, children: busy ? 'Preparing your video' : error ? 'Video could not be prepared' : 'Your video is ready' }),
      h('p', { role: 'status', 'aria-live': 'polite', style: { lineHeight: 1.5, overflowWrap: 'anywhere' }, children: error || (busy ? status : download ? `${download.duration.toFixed(1)} seconds · ${(download.blob.size / 1024 / 1024).toFixed(1)} MB · transparent MOV` : '') }),
      busy && h('p', { style: { lineHeight: 1.5 }, children: 'Keep this tab open. The video is being created at your selected quality. The save buttons will appear here when it is ready.' }),
      download && !busy && hs('div', { style: { display: 'grid', gap: 12, margin: '18px 0' }, children: [
        h('a', { href: download.url, download: download.filename, style: button, children: 'Download video (.mov)' }),
        canShare && h('button', { type: 'button', style: button, onClick: onShare, children: 'Share / Save to Files' }),
        h('p', { style: { margin: 0, lineHeight: 1.5, fontSize: 14 }, children: canShare ? 'On iPad, tap Share / Save to Files, then choose Save to Files. You can import the saved video into InShot as a PIP layer.' : 'Tap Download video to save the file. If a preview opens, use its share menu to save it to Files. You can then import it into your editor.' })
      ] }),
      hs('div', { style: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap' }, children: [
        error && h('button', { type: 'button', style: button, onClick: onRetry, children: 'Try again' }),
        h('button', { type: 'button', style: { ...button, background: 'transparent', color: '#243a3a', borderColor: '#d8d6cf' }, onClick: busy ? onCancel : onClose, children: busy ? 'Cancel preparation' : 'Close' })
      ] })
    ] })
  });
}

export function canShareVideo(download, nav = navigator) {
  if (!download || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  try { return nav.canShare({ files: [new File([download.blob], download.filename, { type: download.blob.type })] }); }
  catch { return false; }
}

export async function shareVideo(download, nav = navigator) {
  const file = new File([download.blob], download.filename, { type: download.blob.type });
  await nav.share({ files: [file], title: 'Paper Scene Studio video' });
}
