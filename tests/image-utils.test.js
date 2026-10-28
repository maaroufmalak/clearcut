import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFile, fitDimensions, outputName, MAX_BYTES } from '../src/image-utils.js';
test('reject unsupported, empty, and oversized files', () => {
  assert.ok(validateFile({ type: 'image/svg+xml', size: 50 }));
  assert.ok(validateFile({ type: 'image/png', size: 0 }));
  assert.ok(validateFile({ type: 'image/png', size: MAX_BYTES + 1 }));
  assert.equal(validateFile({ type: 'image/png', size: MAX_BYTES }), null);
});
test('preserve small dimensions and constrain large photos', () => {
  assert.deepEqual(fitDimensions(640, 480), { width: 640, height: 480, resized: false });
  for (const [w, h] of [[8000, 6000], [20000, 1000], [4000, 4000], [100, 12000]]) {
    const size = fitDimensions(w, h);
    assert.ok(size.width <= 4096 && size.height <= 4096);
    assert.ok(size.width * size.height < 12_010_000);
    assert.ok(Math.abs(size.width / size.height - w / h) < .02);
  }
});
test('safe predictable output filenames', () => {
  assert.equal(outputName('my photo.jpg'), 'my-photo-clearcut.png');
  assert.equal(outputName(''), 'photo-clearcut.png');
});
