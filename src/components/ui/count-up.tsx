import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { sameValue, useReplayKey } from '@/lib/motion';

export type Amount = string | { value: number; format: (value: number) => string; memory?: string };

const remembered = new Map<string, number>();

const DURATION = 1000;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const decimalsOf = (value: number) => {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot < 0 || text.includes('e') ? 0 : Math.min(text.length - dot - 1, 8);
};

export const amountText = (amount: Amount) => (typeof amount === 'string' ? amount : amount.format(amount.value));

export function AmountText({ amount }: { amount: Amount }) {
  return typeof amount === 'string' ? (
    amount
  ) : (
    <CountUp value={amount.value} format={amount.format} memory={amount.memory} />
  );
}

type CountUpProps = { value: number; format: (value: number) => string; memory?: string };

function CountUp({ value, format, memory }: CountUpProps) {
  const reduced = useReducedMotion();
  const [start] = useState(() => (memory ? (remembered.get(memory) ?? 0) : 0));
  const [shown, setShown] = useState(start);
  const current = useRef(start);
  const replay = useReplayKey('counts');
  const lastReplay = useRef(replay);

  useEffect(() => {
    if (memory) remembered.set(memory, value);
    if (reduced) return;
    if (lastReplay.current !== replay) {
      current.current = 0;
      lastReplay.current = replay;
    }
    const from = current.current;
    if (from === value) return;
    if (sameValue(from, value)) {
      current.current = value;
      const frame = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(frame);
    }
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
  }, [value, reduced, replay, memory]);

  return format(reduced ? value : shown);
}
