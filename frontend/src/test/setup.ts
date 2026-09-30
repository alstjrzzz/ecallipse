import '@testing-library/jest-dom/vitest';
import {afterEach, vi} from 'vitest';

afterEach(() => {
  // Tests that stub `fetch` (see mockPresetApi.ts) should not leak into the next test file.
  vi.unstubAllGlobals();
});
