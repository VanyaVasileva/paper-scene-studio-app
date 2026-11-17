// The encoder loads only for transparent export. Artwork stays on this device.
const CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
let core;
let lastError = '';
const frameName = index => `frame-${String(index).padStart(5, '0')}.png`;

self.onmessage = async ({ data }) => {
  try {
    let result = null;
    if (data.type === 'load') {
      const { default: createFFmpegCore } = await import(`${CORE}/ffmpeg-core.js`);
      core = await createFFmpegCore({
        mainScriptUrlOrBlob: `${CORE}/ffmpeg-core.js#${btoa(JSON.stringify({ wasmURL: `${CORE}/ffmpeg-core.wasm` }))}`
      });
      core.setLogger(({ type, message }) => { if (type === 'stderr') lastError = message; });
      core.setProgress(({ progress }) => {
        if (Number.isFinite(progress)) self.postMessage({ type: 'progress', message: `Encoding transparent MOV · ${Math.max(0, Math.min(99, Math.round(progress * 100)))}%` });
      });
    } else if (data.type === 'frame') {
      if (!core) throw new Error('The exporter is not ready. Please try again.');
      core.FS.writeFile(frameName(data.index), new Uint8Array(data.buffer));
    } else if (data.type === 'encode') {
      if (!core) throw new Error('The exporter is not ready. Please try again.');
      core.reset();
      core.setTimeout(210000);
      // ProRes 4444 stores full-resolution color and lossless alpha, without chroma subsampling.
      const code = core.exec('-hide_banner', '-loglevel', 'error', '-framerate', String(data.fps),
        '-i', 'frame-%05d.png', '-frames:v', String(data.frames), '-an',
        '-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le',
        '-alpha_bits', '16', '-threads', '1', '-movflags', '+faststart', 'animation.mov');
      if (code !== 0) throw new Error(lastError || 'Not enough memory to encode this animation. Try 1080p.');
      const output = core.FS.readFile('animation.mov');
      if (!output.length) throw new Error('The animation was empty. Please try again.');
      result = output.buffer;
      self.postMessage({ id: data.id, result }, [result]);
      return;
    } else throw new Error('Unknown export request.');
    self.postMessage({ id: data.id, result });
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? error.message : 'The transparent export failed. Try 1080p.' });
  }
};
