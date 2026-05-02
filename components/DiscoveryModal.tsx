"use client";

import { useEffect, useState } from "react";

interface DiscoveryModalProps {
  mode: "new" | "repeat";
  commonName: string;
  emoji: string;
  achievement?: string;
  onClose: () => void;
}

export default function DiscoveryModal({
  mode,
  commonName,
  emoji,
  achievement,
  onClose,
}: DiscoveryModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        transition: "background-color 0.35s ease",
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-sand px-6 py-10 text-center shadow-2xl"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.9)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        <div className="mb-5 text-7xl leading-none">{emoji}</div>

        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-forest-soft">
          {mode === "new" ? "Nuevo descubrimiento" : "Lo has vuelto a encontrar"}
        </p>

        <h2 className="mb-4 text-2xl font-bold tracking-tight text-forest-dark">
          {mode === "new" ? `Has encontrado un ${commonName}` : `Otro avistamiento de ${commonName}`}
        </h2>

        {mode === "new" && achievement ? (
          <div className="mx-auto mb-3 w-fit rounded-xl border border-[#b8d1b9] bg-sand-dark px-4 py-2 text-sm font-medium text-[#2f4f3e]">
            🏆 {achievement}
          </div>
        ) : null}

        {mode === "repeat" ? (
          <p className="mb-3 text-sm text-forest-soft">
            Cada encuentro suma a tu historia natural.
          </p>
        ) : null}

        <div className="mb-3" />

        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-forest-dark px-6 py-4 text-base font-semibold text-sand transition-opacity active:opacity-80"
        >
          Seguir explorando
        </button>
      </div>
    </div>
  );
}
