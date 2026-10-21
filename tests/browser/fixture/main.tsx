import { StrictMode, useEffect, useRef } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { CuriousEyes, type CuriousEyesHandle } from '../../../dist/esm/index.js';

const host = document.getElementById('root')!;
let root: Root | null = null;
let handle: CuriousEyesHandle | null = null;
let settings = { animated: true, greeting: true };
const events: { id: string; reason: string; at: number }[] = [];
function Avatar() {
  const ref = useRef<CuriousEyesHandle>(null);
  useEffect(() => {
    handle = ref.current;
    if (settings.greeting) handle?.play('hello');
    return () => { handle = null; };
  }, []);
  return <CuriousEyes ref={ref} animated={settings.animated} size={120} onAnimationEnd={(id, reason) => events.push({ id, reason, at: performance.now() })} />;
}
Object.assign(window, { eyesFixture: {
  events,
  mount(options = {}) {
    root?.unmount(); root = null; host.replaceChildren();
    events.length = 0; settings = { animated: true, greeting: true, ...options };
    root = createRoot(host); root.render(<StrictMode><Avatar /></StrictMode>);
  },
  hydrate(markup: string) {
    root?.unmount(); root = null; host.innerHTML = markup;
    events.length = 0; settings = { animated: false, greeting: false };
    root = hydrateRoot(host, <Avatar />);
  },
  update(animated: boolean) { settings.animated = animated; root?.render(<StrictMode><Avatar /></StrictMode>); },
  play(id: Parameters<CuriousEyesHandle['play']>[0]) { return handle?.play(id) ?? false; },
  stop() { handle?.stop(); },
  unmount() { root?.unmount(); root = null; },
} });
