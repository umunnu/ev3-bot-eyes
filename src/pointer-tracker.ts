type PointerPosition = { x: number; y: number };
const subscribers = new Set<(position: PointerPosition) => void>();

function track(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  const position = { x: event.clientX, y: event.clientY };
  subscribers.forEach(subscriber => subscriber(position));
}

/** One passive listener per loaded module; bounds are read by each renderer in RAF. */
export function subscribePointer(subscriber: (position: PointerPosition) => void) {
  if (!subscribers.size) window.addEventListener('pointermove', track, { passive: true });
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
    if (!subscribers.size) window.removeEventListener('pointermove', track);
  };
}
