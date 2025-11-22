import "@testing-library/jest-dom";

// JSDOM pulls in the optional `canvas` native module, which isn't available in CI.
jest.mock("canvas", () => {
  const noop = () => {};
  const getContext = () => ({
    fillRect: noop,
    clearRect: noop,
    getImageData: () => ({ data: [] }),
    putImageData: noop,
    createImageData: () => [],
    setTransform: noop,
    drawImage: noop,
    save: noop,
    fillText: noop,
    measureText: () => ({ width: 0 }),
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    arc: noop,
    fill: noop,
    rect: noop,
    clip: noop,
  });

  const createCanvas = () => ({
    getContext,
    toBuffer: () => Buffer.from(""),
    toDataURL: () => "",
    width: 0,
    height: 0,
  });

  return {
    createCanvas,
    loadImage: async () => ({ width: 0, height: 0 }),
  };
});
