import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CuriousEyes, curiousEyesAnimations, defaultCuriousEyesAppearance,
  type CuriousEyesAppearance, type CuriousEyeShape, type CuriousEyesAnimation,
  type CuriousEyesHandle,
} from '@umunnu/ev3-bot-eyes';
import './style.css';

const initial: CuriousEyesAppearance = {
  ...defaultCuriousEyesAppearance, width: 15, height: 22,
  color: '#28e9ed', edgeBlur: 0.6, blurColor: '#0fa9bf',
};
const shapes: CuriousEyeShape[] = ['rectangle', 'triangle', 'diamond', 'circle', 'hexagon', 'drop'];

function Playground() {
  const [appearance, setAppearance] = useState(initial);
  const [active, setActive] = useState<CuriousEyesAnimation | null>(null);
  const live = useRef<CuriousEyesHandle>(null);
  const small = useRef<CuriousEyesHandle>(null);
  const players = useRef(new Map<CuriousEyesAnimation, CuriousEyesHandle>());
  function update<K extends keyof CuriousEyesAppearance>(key: K, value: CuriousEyesAppearance[K]) {
    setAppearance(current => ({ ...current, [key]: value }));
  }
  function play(id: CuriousEyesAnimation) {
    players.current.forEach(player => player.stop());
    const playing = live.current?.play(id);
    const playingSmall = small.current?.play(id);
    const playingCard = players.current.get(id)?.play(id);
    setActive(playing || playingSmall || playingCard ? id : null);
  }
  function stop() { live.current?.stop(); small.current?.stop(); players.current.forEach(player => player.stop()); setActive(null); }
  return (
    <main>
      <header><div><p className="eyebrow">EV3 BOT EYES</p><h1>A little personality.</h1><p>Move your cursor. Try a shape. Give your agent a mood.</p></div><code>React 19 · SVG · no CSS framework</code></header>
      <section className="workbench" aria-label="Eye design playground">
        <div className="previews">
          <div className="stage dark"><CuriousEyes appearance={appearance} size={240} ref={live} onAnimationEnd={() => setActive(null)} /><p>Following your cursor</p></div>
          <div className="stage light"><CuriousEyes appearance={appearance} size={52} animated={false} ref={small} /><p>Logo size · 52px</p></div>
        </div>
        <div className="controls">
          <div className="section-heading"><h2>Make it yours</h2><button onClick={() => setAppearance(initial)}>Reset</button></div>
          <label>Shape<select value={appearance.shape} onChange={event => update('shape', event.target.value as CuriousEyeShape)}>{shapes.map(shape => <option key={shape} value={shape}>{shape}</option>)}</select></label>
          <Range label="Eye width" min={6} max={26} value={appearance.width} onChange={value => update('width', value)} />
          <Range label="Eye height" min={6} max={30} value={appearance.height} onChange={value => update('height', value)} />
          <Range label="Distance between eyes" min={0} max={24} value={appearance.gap} onChange={value => update('gap', value)} />
          <Range label="Rounding" min={0} max={100} value={appearance.rounding} disabled={appearance.shape === 'circle'} onChange={value => update('rounding', value)} />
          <Range label="Opposite rotation" min={-90} max={90} value={appearance.rotation} onChange={value => update('rotation', value)} />
          <Range label="Edge blur" min={0} max={1} step={0.01} value={appearance.edgeBlur} onChange={value => update('edgeBlur', value)} />
          <div className="colors"><label>Eye color<input type="color" value={appearance.color} onChange={event => update('color', event.target.value)} /></label><label>Blur color<input type="color" disabled={appearance.blurColor === null} value={appearance.blurColor ?? appearance.color} onChange={event => update('blurColor', event.target.value)} /></label></div>
          <label className="check"><input type="checkbox" checked={appearance.blurColor === null} onChange={event => update('blurColor', event.target.checked ? null : appearance.color)} />Match eye color</label>
          <p className="hint">Blur grows outside the solid eye size. These settings are local to this demo.</p>
        </div>
      </section>
      <section aria-labelledby="moods-title"><div className="section-heading"><h2 id="moods-title">Ten ways to say it.</h2><button onClick={stop}>Stop animation</button></div><div className="moods">{curiousEyesAnimations.map(animation => <button className="mood" aria-pressed={active === animation.id} key={animation.id} onClick={() => play(animation.id)}><CuriousEyes appearance={appearance} size={48} animated={false} ref={player => { if (player) players.current.set(animation.id, player); else players.current.delete(animation.id); }} onAnimationEnd={() => setActive(current => current === animation.id ? null : current)} /><strong>{animation.name}</strong><span>{animation.description}</span><small>{animation.scenario}</small></button>)}</div></section>
      <footer>Reduced motion is respected. The host app chooses when real actions trigger reactions.</footer>
    </main>
  );
}
function Range({label,min,max,step=1,value,disabled,onChange}:{label:string;min:number;max:number;step?:number;value:number;disabled?:boolean;onChange:(value:number)=>void}) {
  return <label><span className="range-label">{label}<output>{Number(value.toFixed(2))}</output></span><input type="range" aria-label={label} aria-valuetext={String(Number(value.toFixed(2)))} min={min} max={max} step={step} value={value} disabled={disabled} onChange={event=>onChange(event.target.valueAsNumber)} /></label>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Playground /></StrictMode>);
