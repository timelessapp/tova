"use client";

import { useEffect, useState } from "react";
import type { SpeciesCategory } from "@/lib/types";

type CardStyle = {
  cardBorder: string;
  categoryColor: string;
  badgeBg: string;
  badgeText: string;
  topTint: string;
  placeholderBg: string;
};

const categoryLabelMap: Record<SpeciesCategory, string> = {
  mammal: "Mamífero",
  bird: "Ave",
  reptile: "Reptil",
  amphibian: "Anfibio",
  insect: "Insecto",
  fish: "Pez",
  other: "Otro",
};

function getCategoryStyle(category: SpeciesCategory): CardStyle {
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
      return { cardBorder: "border-[#BBC3C8]", categoryColor: "#707A82", badgeBg: "bg-[#E6EAED]", badgeText: "text-[#49535C]", topTint: "bg-gradient-to-b from-[#EDF1F3] to-[#F9FAFB]", placeholderBg: "bg-[#D9E0E4]" };
  }
}

export interface DiscoveryModalProps {
  mode: "new" | "repeat";
  commonName: string;
  scientificName?: string | null;
  category?: SpeciesCategory | null;
  imageUrl?: string | null;
  achievement?: string;
  onClose: () => void;
}

export default function DiscoveryModal({
  mode,
  commonName,
  scientificName,
  category,
  imageUrl,
  achievement,
  onClose,
}: DiscoveryModalProps) {
  const [visible, setVisible] = useState(false);
  const cat: SpeciesCategory = category ?? "other";
  const style = getCategoryStyle(cat);
  const categoryLabel = categoryLabelMap[cat];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-5 pb-8 sm:items-center"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
        transition: "background-color 0.35s ease",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.95)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Label above card */}
        <div className="mb-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
            {mode === "new" ? "✨ Nuevo descubrimiento" : "📍 Lo has vuelto a encontrar"}
          </p>
        </div>

        {/* Cromo card */}
        <div className={`overflow-hidden rounded-xl border-2 bg-[#fbf8f2] shadow-2xl ${style.cardBorder}`}>
          <div className="h-2 w-full" style={{ backgroundColor: style.categoryColor }} />

          <div className="p-3 pb-0">
            <div className={`overflow-hidden rounded-md border border-black/5 ${style.topTint}`}>
              <div className="aspect-[4/3] w-full">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={commonName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`flex h-full items-center justify-center text-6xl ${style.placeholderBg}`}>
                    🐾
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-3">
            <h2 className="text-base font-bold tracking-tight text-forest-dark">{commonName}</h2>
            {scientificName ? (
              <p className="mt-0.5 text-xs italic text-[#5c6f64]">{scientificName}</p>
            ) : null}

            {achievement ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#b8d1b9] bg-[#edf5ee] px-3 py-2">
                <span className="text-base">🏆</span>
                <p className="text-xs font-medium text-[#2f4f3e]">{achievement}</p>
              </div>
            ) : null}

            {mode === "repeat" ? (
              <p className="mt-3 text-xs text-forest-soft">Cada encuentro suma a tu historia natural.</p>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${style.badgeBg} ${style.badgeText}`}>
                {categoryLabel}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full bg-[#2F5D50] px-6 py-4 text-sm font-semibold text-[#F4F1E8] shadow-[0_18px_34px_-18px_rgba(26,42,34,0.95)] transition-opacity active:opacity-80"
        >
          Seguir explorando
        </button>
      </div>
    </div>
  );
}
