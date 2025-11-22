const noop = () => {};

const mockContext = {
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
};

export const createCanvas = () => ({
  getContext: () => mockContext,
  toBuffer: () => Buffer.from(""),
  toDataURL: () => "",
  width: 0,
  height: 0,
});

export const loadImage = async () => ({ width: 0, height: 0 });
