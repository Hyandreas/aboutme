'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type EffectType = 'rift' | 'breath' | 'shard';

interface Effect {
  id: number;
  type: EffectType;
  x: number;
  y: number;
}

// How long each effect stays in the DOM — must cover its CSS animation duration
const EFFECT_DURATION: Record<EffectType, number> = {
  rift: 5000,
  breath: 7500,
  shard: 4000,
};

export default function VoidEffects() {
  const [effects, setEffects] = useState<Effect[]>([]);
  const idRef = useRef(0);
  const mountedRef = useRef(true);
  const activeTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      activeTimeouts.current.delete(t);
      fn();
    }, ms);
    activeTimeouts.current.add(t);
  }, []);

  const spawnEffect = useCallback(
    (type: EffectType) => {
      if (!mountedRef.current) return;
      const id = ++idRef.current;
      setEffects((prev) => [
        ...prev,
        { id, type, x: Math.random() * 100, y: Math.random() * 100 },
      ]);
      addTimeout(() => {
        if (mountedRef.current)
          setEffects((prev) => prev.filter((e) => e.id !== id));
      }, EFFECT_DURATION[type]);
    },
    [addTimeout]
  );

  useEffect(() => {
    mountedRef.current = true;

    const schedule = (
      type: EffectType,
      minMs: number,
      maxMs: number,
      initialDelay: number
    ) => {
      const run = () => {
        if (!mountedRef.current) return;
        spawnEffect(type);
        addTimeout(run, minMs + Math.random() * (maxMs - minMs));
      };
      addTimeout(run, initialDelay);
    };

    // Stagger first appearances so the page doesn't open to instant effects
    schedule('shard',  8_000, 18_000,  5_000);
    schedule('rift',  15_000, 28_000, 12_000);
    schedule('breath',22_000, 40_000, 20_000);

    const timeouts = activeTimeouts.current;
    return () => {
      mountedRef.current = false;
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, [addTimeout, spawnEffect]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 2 }}
    >
      {effects.map((effect) => (
        <div
          key={effect.id}
          className={`void-effect-${effect.type}`}
          style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
        />
      ))}
    </div>
  );
}
