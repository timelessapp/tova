"use client";

import type { AchievementKey } from "@/lib/achievements";
import { getAchievementVisual } from "@/lib/achievements";

export type TrophyItem = {
  achievementKey: AchievementKey;
  achievementLabel: string;
  unlockedAt: string;
};

type AchievementsPanelProps = {
  trophies: TrophyItem[];
  onOpenDetail: (item: TrophyItem) => void;
};

export default function AchievementsPanel({ trophies, onOpenDetail }: AchievementsPanelProps) {
  return (
    <section className="rounded-2xl border border-sand-dark bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">Trofeos</p>

      {trophies.length === 0 ? (
        <p className="mt-2 text-sm text-forest-soft">Aun no tienes logros desbloqueados.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {trophies.map((item) => {
            const visual = getAchievementVisual(item.achievementKey);

            return (
              <button
                key={item.achievementKey}
                type="button"
                onClick={() => onOpenDetail(item)}
                className="rounded-xl border border-sand-dark bg-sand px-3 py-2 text-left transition hover:bg-[#eff4e8]"
              >
                <p className="text-xl leading-none">{visual.icon}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-forest-dark">
                  {item.achievementLabel}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
