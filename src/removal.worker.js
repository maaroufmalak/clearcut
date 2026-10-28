import { removeBackground } from '@imgly/background-removal';
self.onmessage = async ({ data }) => {
  const { file, publicPath } = data;
  try {
    const blob = await removeBackground(file, {
      publicPath,
      device: 'cpu',
      model: 'isnet_quint8',
      proxyToWorker: false,
      output: { format: 'image/png', type: 'foreground', quality: 1 },
      progress: (key, current, total) => self.postMessage({ type: 'progress', key, current, total })
    });
    self.postMessage({ type: 'done', blob });
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error?.message || error) });
  }
};
