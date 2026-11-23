import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { useFocusCount } from '@/lib/motion';

export type Amount = string | { value: number; format: (value: number) => string };

const DURATION = 1000;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const decimalsOf = (value: number) => {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot < 0 || text.includes('e') ? 0 : Math.min(text.length - dot - 1, 8);
};

export const amountText = (amount: Amount) => (typeof amount === 'string' ? amount : amount.format(amount.value));

export function AmountText({ amount }: { amount: Amount }) {
  return typeof amount === 'string' ? amount : <CountUp value={amount.value} format={amount.format} />;
}

function CountUp({ value, format }: { value: number; format: (value: number) => string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  const focus = useFocusCount();
  const lastFocus = useRef(focus);

  useEffect(() => {
    if (reduced) return;
    if (lastFocus.current !== focus) {
      if (lastFocus.current > 0) current.current = 0;
      lastFocus.current = focus;
    }
    const from = current.current;
    if (from === value) return;
    const scale = 10 ** decimalsOf(value);
    let frame = 0;
    let start: number | null = null;
    const step = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / DURATION, 1);
      const next = progress === 1 ? value : Math.round((from + (value - from) * easeOut(progress)) * scale) / scale;
      current.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced, focus]);

  return format(reduced ? value : shown);
}
