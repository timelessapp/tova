"use client";

import type { AchievementKey } from "@/lib/achievements";
import { getAchievementVisual } from "@/lib/achievements";

type AchievementDetailModalProps = {
  isOpen: boolean;
  achievementKey: AchievementKey | null;
  unlockedAt: string | null;
  onClose: () => void;
};

function formatUnlockedAt(value: string | null): string {
  if (!value) {
    return "Fecha no disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AchievementDetailModal({
  isOpen,
  achievementKey,
  unlockedAt,
  onClose,
}: AchievementDetailModalProps) {
  if (!isOpen || !achievementKey) {
    return null;
  }

  const visual = getAchievementVisual(achievementKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del trofeo"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-[#d5decc] bg-sand p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-5xl leading-none">{visual.icon}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-forest-soft">
          Trofeo desbloqueado
        </p>
        <h3 className="mt-1 text-xl font-semibold text-forest-dark">{visual.label}</h3>
        <p className="mt-2 text-sm text-forest-soft">{visual.description}</p>
        <p className="mt-4 text-xs text-forest-soft">Desbloqueado: {formatUnlockedAt(unlockedAt)}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-sand"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
