import '@testing-library/jest-dom/vitest';

// @xyflow/react (React Flow) uses ResizeObserver, which jsdom does not implement.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserverMock;
