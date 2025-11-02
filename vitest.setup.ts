import '@testing-library/jest-dom';

// matchMedia polyfill (alguns componentes do Radix/UI podem consultar)
if (typeof window !== 'undefined' && !window.matchMedia) {
  // @ts-ignore
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
}

// ResizeObserver polyfill simples para jsdom
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as any).ResizeObserver = RO as any;
}
