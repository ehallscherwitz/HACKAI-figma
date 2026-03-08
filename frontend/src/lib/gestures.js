export function extFingers(lm) {
  return [
    lm[8].y < lm[6].y,
    lm[12].y < lm[10].y,
    lm[16].y < lm[14].y,
    lm[20].y < lm[18].y,
  ];
}

export function isThumbExt(lm) {
  return Math.abs(lm[4].x - lm[3].x) > 0.02 && lm[4].x < lm[3].x;
}

export function isPinch(lm) {
  return Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.065;
}

export function isFist(lm) {
  const [i, m, r, p] = extFingers(lm);
  return !i && !m && !r && !p && Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) > 0.07;
}

export function isOpenPalm(lm) {
  const [i, m, r, p] = extFingers(lm);
  return i && m && r && p;
}

export function isIndex(lm) {
  const [i, m, r, p] = extFingers(lm);
  return i && !m && !r && !p;
}

export function isPeace(lm) {
  const [i, m, r, p] = extFingers(lm);
  return i && m && !r && !p;
}

export function isRock(lm) {
  const [i, m, r, p] = extFingers(lm);
  return i && !m && !r && p;
}

export function isThumb(lm) {
  const [i, m, r, p] = extFingers(lm);
  return !i && !m && !r && !p && isThumbExt(lm);
}

export function isGunPoint(lm) {
  const [i, m, r, p] = extFingers(lm);
  return i && !m && !r && !p && isThumbExt(lm);
}

export function classifyGesture(lm) {
  if (isPinch(lm)) return 'pinch';
  if (isFist(lm)) return 'fist';
  if (isOpenPalm(lm)) return 'open';
  if (isGunPoint(lm)) return 'gun';
  if (isRock(lm)) return 'rock';
  if (isPeace(lm)) return 'peace';
  if (isIndex(lm)) return 'index';
  if (isThumb(lm)) return 'thumb';
  return 'neutral';
}
