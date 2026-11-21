import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { GripHorizontal, X } from 'lucide-react';
import { springs, rubberBand } from '../lib/motion';
import { useApp } from '../state/AppState';
import { IconButton } from './ui';

interface Drag { id: number; y: number; height: number; lastY: number; lastTime: number; velocity: number; moved: boolean }

export function ElasticSheet({ title, children, onClose }: { title: string; children: ReactNode | ((dismiss: () => void) => ReactNode); onClose: () => void }) {
  const { data } = useApp();
  const systemReduced = useReducedMotion();
  const reduce = !!systemReduced || data.profile.reducedMotion;
  const height = useMotionValue(0);
  const drag = useRef<Drag | null>(null);
  const closing = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const getLimits = () => {
    const max = Math.max(220, window.innerHeight - 96);
    return { min: Math.min(max, Math.max(310, Math.min(530, window.innerHeight * 0.68))), max };
  };
  const to = (target: number, velocity = 0, finish?: () => void) => {
    height.stop();
    if (reduce) { height.set(target); finish?.(); return; }
    animate(height, target, { ...springs.rubber, velocity: Math.max(-1400, Math.min(1400, velocity)), onComplete: finish });
  };
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    to(0, 0, onClose);
  };
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fields = panel.current?.querySelectorAll<HTMLElement>('.sheet-scroll input:not([type="file"]), .sheet-scroll textarea');
    const target = Array.from(fields ?? []).find((field) => field.getClientRects().length > 0);
    (target || panel.current)?.focus({ preventScroll: true });
    to(getLimits().min);
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('.ds-select-content')) return;
      if (event.key === 'Escape' && !event.defaultPrevented) close();
      if (event.key !== 'Tab') return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled):not([type="file"]), select:not(:disabled), textarea:not(:disabled), a[href], summary',
      ) || []).filter((item) => item.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if ((event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) ||
        (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      height.stop();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      trigger.current?.focus({ preventScroll: true });
    };
  }, []);
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    closing.current = false;
    height.stop();
    drag.current = { id: event.pointerId, y: event.clientY, height: height.get(),
      lastY: event.clientY, lastTime: performance.now(), velocity: 0, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const delta = state.y - event.clientY;
    if (Math.abs(delta) >= 8) state.moved = true;
    const { min, max } = getLimits();
    const raw = state.height + delta;
    height.set(raw > max ? max + rubberBand(raw - max) : raw < min ? min + rubberBand(raw - min) : raw);
    const now = performance.now();
    const elapsed = Math.max(1, now - state.lastTime);
    state.velocity = ((state.lastY - event.clientY) / elapsed) * 1000;
    state.lastTime = now;
    state.lastY = event.clientY;
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    const { min, max } = getLimits();
    if (height.get() < min - 36 || (state.moved && state.velocity < -650 && height.get() < min + 30)) return close();
    const expanded = height.get() > min + (max - min) * 0.35 || (state.moved && state.velocity > 650);
    to(expanded ? max : min, state.velocity);
  };

  return createPortal(<div className="sheet-root">
    <motion.div className="sheet-backdrop" initial={{opacity:0}} animate={{opacity:1}} onClick={close}
      transition={{duration:reduce ? 0 : 0.18}} aria-hidden="true"/>
    <motion.section className="elastic-sheet" role="dialog" aria-modal="true" aria-label={title}
      ref={panel} tabIndex={-1} style={{height}}>
      <div className="sheet-grab" onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={pointerUp} onPointerCancel={pointerUp} aria-label="Arraste para expandir ou reduzir o painel">
        <GripHorizontal size={26} strokeWidth={1.6} />
      </div>
      <div className="sheet-head"><h2>{title}</h2><IconButton label="Fechar painel" onClick={close}><X size={19} /></IconButton></div>
      <div className="sheet-scroll">{typeof children === 'function' ? children(close) : children}</div>
    </motion.section>
  </div>, document.body);
}
