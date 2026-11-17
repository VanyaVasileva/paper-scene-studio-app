// Frame-by-frame exports preserve the source artwork and its alpha channel.
export function paintReelFrame(context, preset, scene, render, time, background = 'scene') {
  context.clearRect(0, 0, preset.width, preset.height);
  render(context, scene.width, scene.x, scene.y, false, false,
    background === 'scene', scene.height, time);
  if (background !== 'transparent') {
    context.save();
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = background === 'green' ? '#00ff00' : background === 'blue' ? '#0000ff' : '#ffffff';
    context.fillRect(0, 0, preset.width, preset.height);
    context.restore();
  }
}

export async function exportTransparentReel({ preset, scene, render, duration = 4, signal, onProgress = () => {} }) {
  if (!Number.isFinite(duration) || duration < 1 || duration > 8) throw new Error('Choose an animation length between 1 and 8 seconds.');
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
  const worker = new Worker(new URL('./transparent-reel-worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  let sequence = 0;
  const abortError = () => new DOMException('Export cancelled', 'AbortError');
  function stop(error) {
    worker.terminate();
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear();
  }
  const abort = () => stop(abortError());
  signal?.addEventListener('abort', abort, { once: true });
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') { onProgress(data.message); return; }
    const request = pending.get(data.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(data.id);
    data.error ? request.reject(new Error(data.error)) : request.resolve(data.result);
  };
  worker.onerror = () => stop(new Error('The transparent exporter could not load. Check your connection, or try 1080p.'));
  function request(type, data = {}, transfer = []) {
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        stop(new Error('The export took too long. Try 1080p or a shorter animation.'));
      }, type === 'encode' ? 240000 : 120000);
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, type, ...data }, transfer);
    });
  }
  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;
  const context = canvas.getContext('2d', { alpha: true, colorSpace: 'srgb' });
  try {
    if (!context) throw new Error('Could not prepare the animation. Try 1080p.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    onProgress('Loading transparent exporter…');
    await request('load');
    const frames = Math.round(duration * preset.fps);
    let totalBytes = 0;
    for (let index = 0; index < frames; index++) {
      if (signal?.aborted) throw abortError();
      paintReelFrame(context, preset, scene, render, index / preset.fps, 'transparent');
      const png = await new Promise((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(new Error('Not enough memory. Try 1080p.')), 'image/png'));
      totalBytes += png.size;
      if (totalBytes > 192 * 1024 * 1024) throw new Error('This animation is too large for the browser. Choose 1080p or a shorter length.');
      const buffer = await png.arrayBuffer();
      await request('frame', { index, buffer }, [buffer]);
      onProgress(`Preparing transparent animation · ${Math.round((index + 1) / frames * 100)}%`);
    }
    onProgress('Encoding transparent MOV…');
    const buffer = await request('encode', { fps: preset.fps, duration, frames });
    return new Blob([buffer], { type: 'video/quicktime' });
  } finally {
    signal?.removeEventListener('abort', abort);
    stop(abortError());
    canvas.width = canvas.height = 0;
  }
}
