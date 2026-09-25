
// Native dragover events are intermittent. A frame loop keeps edge scrolling
// running while the pointer is held still, without rebuilding the dragged DOM.
const moveAnimations = new Set();
let pointerHeld = false;
export function installDragScroll({ root = document, containers, onScroll = () => {} }) {
  let active = false,
    point = null,
    frame = 0,
    last = 0,
    marked = null;
  const clearMark = () => {
    if (marked) delete marked.dataset.dragScroll;
    marked = null;
  };
  function tick(now) {
    frame = 0;
    if (!active || !point) return;
    const dt = Math.min(32, last ? now - last : 16);
    last = now;
    const target = containers().find((node) => {
      if (!node || node.scrollHeight <= node.clientHeight + 1) return false;
      const r =
        node === document.scrollingElement
          ? { left: 0, right: innerWidth, top: 0, bottom: innerHeight }
          : node.getBoundingClientRect();
      return (
        point.x >= r.left &&
        point.x <= r.right &&
        point.y >= Math.max(0, r.top) &&
        point.y <= Math.min(innerHeight, r.bottom)
      );
    });
    clearMark();
    if (target) {
      const r =
        target === document.scrollingElement
          ? { top: 0, bottom: innerHeight }
          : target.getBoundingClientRect();
      const top = Math.max(0, r.top),
        bottom = Math.min(innerHeight, r.bottom),
        edge = Math.min(76, (bottom - top) / 4);
      const distance =
        point.y < top + edge
          ? -(1 - (point.y - top) / edge)
          : point.y > bottom - edge
            ? 1 - (bottom - point.y) / edge
            : 0;
      if (distance) {
        const old = target.scrollTop;
        target.scrollTop +=
          (Math.sign(distance) * (100 + 800 * Math.abs(distance) ** 2) * dt) / 1000;
        if (target.scrollTop !== old) {
          target.dataset.dragScroll = distance > 0 ? 'down' : 'up';
          marked = target;
          onScroll(point);
        }
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function start(e) {
    if (e.target.closest?.('[draggable="true"]')) active = true;
  }
  function over(e) {
    if (!active || !e.dataTransfer?.types.includes('application/x-neo')) return;
    point = { x: e.clientX, y: e.clientY };
    if (!frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  const hold = () => {
    pointerHeld = true;
    for (const animation of moveAnimations) animation.pause();
  };
  const release = () => {
    pointerHeld = false;
    for (const animation of moveAnimations) animation.play();
  };
  const cancelPointer = () => {
    if (!active) release();
  };
  function stop() {
    active = false;
    point = null;
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    clearMark();
    release();
  }
  function leave(e) {
    if (!e.relatedTarget) {
      point = null;
      clearMark();
    }
  }
  root.addEventListener('dragstart', start, true);
  root.addEventListener('dragover', over, true);
  root.addEventListener('dragend', stop, true);
  root.addEventListener('drop', stop, true);
  root.addEventListener('dragleave', leave, true);
  root.addEventListener('pointerdown', hold, true);
  root.addEventListener('pointerup', release, true);
  root.addEventListener('pointercancel', cancelPointer, true);
  const escape = (e) => {
    if (e.key === 'Escape') stop();
  };
  root.addEventListener('keydown', escape, true);
  window.addEventListener('blur', stop);
  return () => {
    stop();
    root.removeEventListener('pointercancel', cancelPointer, true);
    root.removeEventListener('pointerdown', hold, true);
    root.removeEventListener('pointerup', release, true);
    root.removeEventListener('dragstart', start, true);
    root.removeEventListener('dragover', over, true);
    root.removeEventListener('dragend', stop, true);
    root.removeEventListener('drop', stop, true);
    root.removeEventListener('dragleave', leave, true);
    root.removeEventListener('keydown', escape, true);
    window.removeEventListener('blur', stop);
  };
}

export function captureMoveAnimation(root, selector, key) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const before = new Map(
    [...root.querySelectorAll(selector)].map((n) => [n.dataset[key], n.getBoundingClientRect()]),
  );
  return () => {
    for (const node of root.querySelectorAll(selector)) {
      const old = before.get(node.dataset[key]);
      if (!old) continue;
      const now = node.getBoundingClientRect(),
        x = old.left - now.left,
        y = old.top - now.top;
      if ((x || y) && Math.abs(y) < innerHeight && Math.abs(x) < innerWidth) {
        const animation = node.animate(
          [{ transform: `translate(${x}px,${y}px)` }, { transform: 'none' }],
          { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' },
        );
        moveAnimations.add(animation);
        animation.finished.then(
          () => moveAnimations.delete(animation),
          () => moveAnimations.delete(animation),
        );
        if (pointerHeld) animation.pause();
      }
    }
  };
}
