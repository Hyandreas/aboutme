'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getScrollEnergy } from './reliquary/useScrollVelocity';

type EffectType = 'rift' | 'breath' | 'shard';

interface Effect {
  id: number;
  type: EffectType;
  x: number;
  y: number;
}

const EFFECT_DURATION: Record<EffectType, number> = {
  rift: 5000,
  breath: 7500,
  shard: 4000,
};

/**
 * VoidEffects — ambient rifts/breaths/shards. Density now scales with scroll
 * velocity: still site = calm, scrolling = the void inhales.
 */
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
      baseMinMs: number,
      baseMaxMs: number,
      initialDelay: number
    ) => {
      const run = () => {
        if (!mountedRef.current) return;
        spawnEffect(type);
        // Scroll energy compresses the interval. 0 energy → base delay;
        // 1 energy → delay / 6 (void inhales). Clamp to a floor.
        const e = getScrollEnergy();
        const scale = 1 / (1 + e * 5);
        const minMs = Math.max(400, baseMinMs * scale);
        const maxMs = Math.max(minMs + 200, baseMaxMs * scale);
        addTimeout(run, minMs + Math.random() * (maxMs - minMs));
      };
      addTimeout(run, initialDelay);
    };

    schedule('shard', 8_000, 18_000, 5_000);
    schedule('rift', 15_000, 28_000, 12_000);
    schedule('breath', 22_000, 40_000, 20_000);

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
      style={{ zIndex: 3 }}
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
