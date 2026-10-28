export const MAX_BYTES = 20 * 1024 * 1024;
export function validateFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPG, PNG, or WebP image.';
  if (!file.size) return 'This file is empty. Choose another photo.';
  if (file.size > MAX_BYTES) return 'This photo is too large. Choose an image under 20 MB.';
  return null;
}
export function fitDimensions(width, height) {
  const scale = Math.min(1, 4096 / Math.max(width, height), Math.sqrt(12_000_000 / (width * height)));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), resized: scale < 1 };
}
export function outputName(name) {
  return (name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'photo') + '-clearcut.png';
}
