import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';

type Phase = 'idle' | 'running' | 'done';

export type TruckButtonHandle = {
  /** Plays the truck animation while `action` runs, then holds the success state. */
  run: <T>(action: () => Promise<T>) => Promise<T>;
};

type TruckButtonProps = {
  label: ReactNode;
  successLabel?: ReactNode;
  disabled?: boolean;
  className?: string;
};

const HOLD_AFTER_DONE = 900;

export const TruckButton = forwardRef<TruckButtonHandle, TruckButtonProps>(function TruckButton(
  { label, successLabel = 'Order Placed', disabled = false, className = '' },
  ref,
) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const truckRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const runningRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('idle');

  const clearAnimation = useCallback(() => {
    timelineRef.current?.kill();
    timelineRef.current = null;

    const button = buttonRef.current;
    const truck = truckRef.current;
    const box = boxRef.current;
    if (!button || !truck || !box) return;

    button.classList.remove('animation', 'done');
    gsap.killTweensOf([button, truck, box]);
    gsap.set(truck, { x: 4 });
    gsap.set(box, { x: -24, y: -6 });
    gsap.set(button, {
      '--progress': 0,
      '--hx': 0,
      '--bx': 0,
      '--box-s': 0.5,
      '--box-o': 0,
      '--truck-y': 0,
      '--truck-y-n': -26,
    });
  }, []);

  useEffect(() => () => {
    timelineRef.current?.kill();
    gsap.killTweensOf([buttonRef.current, truckRef.current, boxRef.current]);
  }, []);

  const play = useCallback((button: HTMLButtonElement, truck: HTMLDivElement, box: HTMLDivElement) => {
    return new Promise<void>((resolve) => {
      const end = Math.max(48, button.offsetWidth - 76);
      const timeline = gsap.timeline({ onComplete: resolve });
      timelineRef.current = timeline;

      timeline
        .set(button, { '--progress': 0, '--hx': 0, '--bx': 0, '--box-s': 0.5, '--box-o': 0, '--truck-y': 0, '--truck-y-n': -26 })
        .set(truck, { x: 4 })
        .set(box, { x: -24, y: -6 })
        .to(button, { '--box-s': 1, '--box-o': 1, duration: 0.3 }, 0.5)
        .to(box, { x: 0, duration: 0.4 }, 0.7)
        .to(button, { '--hx': -5, '--bx': 50, duration: 0.18 }, 0.92)
        .to(box, { y: 0, duration: 0.1 }, 1.15)
        .to(button, { '--truck-y': 1, '--truck-y-n': -25, duration: 0.2 }, 1.25)
        .to(truck, { x: 0, duration: 0.4 }, 1.45)
        .to(truck, { x: end * 0.42, duration: 1 }, 1.85)
        .to(truck, { x: end * 0.21, duration: 0.6 }, 2.85)
        .to(truck, { x: end, duration: 0.4 }, 3.45)
        .to(button, { '--progress': 1, duration: 2.4, ease: 'power2.in' }, 1.45);
    });
  }, []);

  useImperativeHandle(ref, () => ({
    run: async <T,>(action: () => Promise<T>) => {
      if (runningRef.current) throw new Error('An order is already being placed.');
      runningRef.current = true;

      const button = buttonRef.current;
      const truck = truckRef.current;
      const box = boxRef.current;
      if (!button || !truck || !box) {
        try {
          return await action();
        } finally {
          runningRef.current = false;
        }
      }

      clearAnimation();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setPhase('running');
      button.classList.add('animation');
      const animation = reduceMotion ? Promise.resolve() : play(button, truck, box);

      try {
        const result = await action();
        await animation;
        button.classList.add('done');
        setPhase('done');
        await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 400 : HOLD_AFTER_DONE));
        return result;
      } catch (error) {
        clearAnimation();
        setPhase('idle');
        throw error;
      } finally {
        runningRef.current = false;
      }
    },
  }), [clearAnimation, play]);

  return <button
    ref={buttonRef}
    type="submit"
    className={`truck-button${phase !== 'idle' ? ' animation' : ''}${phase === 'done' ? ' done' : ''}${className ? ` ${className}` : ''}`}
    disabled={disabled || phase !== 'idle'}
    aria-live="polite"
  >
    <span className="default" aria-hidden={phase === 'done' || undefined}>{label}</span>
    <span className="success" aria-hidden={phase === 'done' ? undefined : true}>
      {successLabel}
      <svg viewBox="0 0 12 10" aria-hidden="true"><polyline points="1.5 6 4.5 9 10.5 1"/></svg>
    </span>
    <div className="truck" aria-hidden="true" ref={truckRef}>
      <div className="wheel"/>
      <div className="back"/>
      <div className="front"/>
      <div className="box" ref={boxRef}/>
    </div>
  </button>;
});
