import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

// localStorage は jsdom のウィンドウ単位で共有されるため、テスト間で状態が漏れないようにする
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});
