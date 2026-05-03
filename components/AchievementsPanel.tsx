"use client";

import type { AchievementKey } from "@/lib/achievements";
import { getAchievementVisual } from "@/lib/achievements";

export type TrophyItem = {
  achievementKey: AchievementKey;
  achievementLabel: string;
  unlockedAt: string;
};

type CardStyle = {
  cardBorder: string;
  categoryColor: string;
  badgeBg: string;
  badgeText: string;
  topTint: string;
  placeholderBg: string;
};

function getAchievementCardStyle(key: AchievementKey): CardStyle {
  if (key === "first_discovery") {
    return {
      cardBorder: "border-[#92B99B]",
      categoryColor: "#4D7D58",
      badgeBg: "bg-[#D9EADB]",
      badgeText: "text-[#2F5A3A]",
      topTint: "bg-gradient-to-b from-[#E3F0E5] to-[#F5FAF6]",
      placeholderBg: "bg-[#CFE2D2]",
    };
  }

  if (key === "five_species" || key === "ten_species") {
    return {
      cardBorder: "border-[#D9C46A]",
      categoryColor: "#A8891C",
      badgeBg: "bg-[#F5EBC0]",
      badgeText: "text-[#6B5510]",
      topTint: "bg-gradient-to-b from-[#F5EAC0] to-[#FDFAF0]",
      placeholderBg: "bg-[#EDD97A]",
    };
  }

  if (key.startsWith("first_category_")) {
    const category = key.replace("first_category_", "");
    switch (category) {
      case "mammal":
        return { cardBorder: "border-[#BE9A74]", categoryColor: "#9C6F43", badgeBg: "bg-[#EEDDC7]", badgeText: "text-[#65452D]", topTint: "bg-gradient-to-b from-[#F3E8D8] to-[#FBF6EE]", placeholderBg: "bg-[#E6D1B4]" };
      case "bird":
        return { cardBorder: "border-[#F0943A]", categoryColor: "#D4620A", badgeBg: "bg-[#FDE9CC]", badgeText: "text-[#7A3008]", topTint: "bg-gradient-to-b from-[#FDE5C0] to-[#FFF8F0]", placeholderBg: "bg-[#FAC97A]" };
      case "reptile":
        return { cardBorder: "border-[#B8B084]", categoryColor: "#7E7750", badgeBg: "bg-[#E6E0C0]", badgeText: "text-[#585333]", topTint: "bg-gradient-to-b from-[#ECE7CF] to-[#F8F5EA]", placeholderBg: "bg-[#DDD6AE]" };
      case "amphibian":
        return { cardBorder: "border-[#92B99B]", categoryColor: "#4D7D58", badgeBg: "bg-[#D9EADB]", badgeText: "text-[#2F5A3A]", topTint: "bg-gradient-to-b from-[#E3F0E5] to-[#F5FAF6]", placeholderBg: "bg-[#CFE2D2]" };
      case "insect":
        return { cardBorder: "border-[#C7CDD1]", categoryColor: "#8A939A", badgeBg: "bg-[#ECEFF1]", badgeText: "text-[#4F5962]", topTint: "bg-gradient-to-b from-[#F1F3F5] to-[#FAFBFC]", placeholderBg: "bg-[#E2E6E9]" };
      case "fish":
        return { cardBorder: "border-[#8FB9C9]", categoryColor: "#3E7C99", badgeBg: "bg-[#D7EAF1]", badgeText: "text-[#2B5668]", topTint: "bg-gradient-to-b from-[#E1EFF5] to-[#F6FBFD]", placeholderBg: "bg-[#C8E0EA]" };
      default:
        break;
    }
  }

  return {
    cardBorder: "border-[#BBC3C8]",
    categoryColor: "#707A82",
    badgeBg: "bg-[#E6EAED]",
    badgeText: "text-[#49535C]",
    topTint: "bg-gradient-to-b from-[#EDF1F3] to-[#F9FAFB]",
    placeholderBg: "bg-[#D9E0E4]",
  };
}

type AchievementsPanelProps = {
  trophies: TrophyItem[];
  onOpenDetail: (item: TrophyItem) => void;
};

export default function AchievementsPanel({ trophies, onOpenDetail }: AchievementsPanelProps) {
  if (trophies.length === 0) {
    return (
      <p className="text-sm text-forest-soft">Aun no tienes logros desbloqueados.</p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {trophies.map((item) => {
          const visual = getAchievementVisual(item.achievementKey);
          const style = getAchievementCardStyle(item.achievementKey);

          return (
            <button
              key={item.achievementKey}
              type="button"
              onClick={() => onOpenDetail(item)}
              className={`flex min-h-[14rem] flex-col overflow-hidden rounded-lg border-2 bg-[#fbf8f2] text-left transition hover:-translate-y-0.5 hover:shadow-sm ${style.cardBorder}`}
            >
              <div className="h-2 w-full" style={{ backgroundColor: style.categoryColor }} />
              <div className="p-3 pb-0">
                <div className={`overflow-hidden rounded-md border border-black/5 ${style.topTint}`}>
                  <div className={`aspect-square w-full flex items-center justify-center ${style.placeholderBg}`}>
                    <span className="text-5xl">{visual.icon}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-forest-dark">
                  {visual.label}
                </p>
                <div className="mt-auto pt-2">
                  <span className={`inline-flex w-fit rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${style.badgeBg} ${style.badgeText}`}>
                    Trofeo
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
