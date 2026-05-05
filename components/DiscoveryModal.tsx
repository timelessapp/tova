"use client";

import { useEffect, useState } from "react";
import type { SpeciesCategory } from "@/lib/types";

const KEYFRAMES = `
  @keyframes sparkle-fly {
    0%   { opacity: 1; transform: translate(-50%, -50%) translate(0px, 0px) scale(1.2); }
    100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(0.4); }
  }
  @keyframes shimmer-sweep {
    0%   { transform: translateX(-180%); }
    100% { transform: translateX(280%); }
  }
  @keyframes stamp-pop {
    0%   { opacity: 0; transform: rotate(-10deg) scale(0.4); }
    65%  { opacity: 1; transform: rotate(-10deg) scale(1.12); }
    100% { opacity: 1; transform: rotate(-10deg) scale(1); }
  }
  @keyframes border-glow {
    0%, 100% { box-shadow: 0 0 0 0px rgba(255,200,80,0.0), 0 20px 40px -12px rgba(0,0,0,0.5); }
    50%       { box-shadow: 0 0 0 6px rgba(255,200,80,0.35), 0 20px 40px -12px rgba(0,0,0,0.5); }
  }
  @keyframes label-drop {
    0%   { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes cta-rise {
    0%   { opacity: 0; transform: translateY(14px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

const SPARKLES = [
  { emoji: "✨", angle: -80,  dist: 95,  delay: 0  },
  { emoji: "⭐", angle: -40,  dist: 115, delay: 55 },
  { emoji: "✨", angle:  0,   dist: 100, delay: 25 },
  { emoji: "🌟", angle:  45,  dist: 110, delay: 80 },
  { emoji: "✨", angle:  95,  dist: 90,  delay: 40 },
  { emoji: "⭐", angle:  145, dist: 105, delay: 70 },
  { emoji: "✨", angle: -130, dist: 100, delay: 15 },
  { emoji: "🌟", angle: -165, dist: 112, delay: 90 },
];

function playTriumphFanfare() {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    // Ascending arpeggio: C5 E5 G5, then full C-major chord held
    const seq = [
      { freq: 523.25, start: 0.0,  dur: 0.20 },   // C5
      { freq: 659.25, start: 0.15, dur: 0.20 },   // E5
      { freq: 783.99, start: 0.30, dur: 0.20 },   // G5
      { freq: 1046.5, start: 0.46, dur: 0.70 },   // C6 — held
      { freq:  783.99, start: 0.46, dur: 0.70 },  // G5 — chord
      { freq:  659.25, start: 0.46, dur: 0.70 },  // E5 — chord
      { freq:  523.25, start: 0.46, dur: 0.70 },  // C5 — chord
    ];

    seq.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(master);

      const t = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.018);
      gain.gain.setValueAtTime(0.3, t + dur * 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.start(t);
      osc.stop(t + dur + 0.05);
    });

    // Bright harmonic shimmer on top (triangle, one octave up, soft)
    [1046.5, 1318.5].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq * 2;
      osc.connect(gain);
      gain.connect(master);
      const t = ctx.currentTime + 0.46 + i * 0.03;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    // Audio blocked or unsupported — silent fallback
  }
}

type CardStyle = {
  cardBorder: string;
  categoryColor: string;
  badgeBg: string;
  badgeText: string;
  topTint: string;
  placeholderBg: string;
};

const categoryLabelMap: Record<SpeciesCategory, string> = {
  mammal: "Mamífer",
  bird: "Ocell",
  reptile: "Rèptil",
  amphibian: "Amfibi",
  insect: "Insecte",
  fish: "Peix",
  other: "Altre",
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
  description?: string | null;
  category?: SpeciesCategory | null;
  imageUrl?: string | null;
  achievement?: string;
  onClose: () => void;
}

export default function DiscoveryModal({
  mode,
  commonName,
  scientificName,
  description,
  category,
  imageUrl,
  achievement,
  onClose,
}: DiscoveryModalProps) {
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [cardVisible, setCardVisible]         = useState(false);
  const [shimmerActive, setShimmerActive]     = useState(false);
  const [stampVisible, setStampVisible]       = useState(false);
  const [ctaVisible, setCtaVisible]           = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const cat: SpeciesCategory = category ?? "other";
  const style = getCategoryStyle(cat);
  const categoryLabel = categoryLabelMap[cat];
  const isNew = mode === "new";

  useEffect(() => {
    const f = requestAnimationFrame(() => setBackdropVisible(true));
    const t1 = setTimeout(() => {
      setCardVisible(true);
      if (isNew) playTriumphFanfare();
    }, 140);
    const t2 = setTimeout(() => setShimmerActive(true), 420);
    const t3 = setTimeout(() => setStampVisible(true),  480);
    const t4 = setTimeout(() => setCtaVisible(true),    580);
    return () => {
      cancelAnimationFrame(f);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div
        className="fixed inset-0 z-50 flex items-end justify-center px-5 pb-8 sm:items-center"
        style={{
          backgroundColor: backdropVisible
            ? isNew ? "rgba(10,22,16,0.82)" : "rgba(0,0,0,0.6)"
            : "rgba(0,0,0,0)",
          transition: "background-color 0.4s ease",
        }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-xs"
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Sparkle particles (new only) ── */}
          {isNew && cardVisible && SPARKLES.map((p, i) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx  = Math.round(Math.cos(rad) * p.dist);
            const ty  = Math.round(Math.sin(rad) * p.dist);
            return (
              <span
                key={i}
                className="pointer-events-none absolute left-1/2 top-[38%] select-none text-lg"
                style={{
                  ["--tx" as string]: `${tx}px`,
                  ["--ty" as string]: `${ty}px`,
                  animation: `sparkle-fly 0.95s ease forwards`,
                  animationDelay: `${p.delay}ms`,
                } as React.CSSProperties}
              >
                {p.emoji}
              </span>
            );
          })}

          {/* ── Label above card ── */}
          <div
            className="mb-3 text-center"
            style={{
              animation: cardVisible ? "label-drop 0.35s ease forwards" : undefined,
              opacity: cardVisible ? undefined : 0,
            }}
          >
            {isNew ? (
              <button
                type="button"
                onClick={() => setDescriptionOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/95 transition hover:bg-white/20"
                aria-expanded={descriptionOpen}
                aria-label="Mostrar la descripció de l'espècie desbloquejada"
              >
                <span>✨ Nova espècie desbloquejada</span>
                <span className="text-[10px] normal-case tracking-normal text-white/85">
                  {descriptionOpen ? "Amagar" : "Veure descripció"}
                </span>
              </button>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
                📍 L'has tornat a trobar
              </p>
            )}
          </div>

          {isNew && descriptionOpen ? (
            <div className="mb-3 rounded-xl border border-white/35 bg-white/12 px-3 py-2 text-left text-xs text-white/95 backdrop-blur-sm">
              {description?.trim() || "Descripció no disponible per a aquesta espècie."}
            </div>
          ) : null}

          {/* ── Cromo card ── */}
          <div
            className={`overflow-hidden rounded-xl border-2 bg-[#fbf8f2] ${style.cardBorder}`}
            style={{
              opacity:   cardVisible ? 1 : 0,
              transform: cardVisible ? "translateY(0) scale(1)" : "translateY(36px) scale(0.82)",
              transition: "opacity 0.48s cubic-bezier(0.34,1.56,0.64,1), transform 0.48s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: isNew
                ? "0 0 0 0px rgba(255,200,80,0), 0 24px 48px -14px rgba(0,0,0,0.6)"
                : "0 20px 40px -12px rgba(0,0,0,0.5)",
              animation: isNew && cardVisible ? "border-glow 1.6s ease 0.5s 2" : undefined,
            }}
          >
            <div className="h-2 w-full" style={{ backgroundColor: style.categoryColor }} />

            <div className="p-3 pb-0">
              <div className={`relative overflow-hidden rounded-md border border-black/5 ${style.topTint}`}>
                <div className="aspect-[4/3] w-full">
                  {imageUrl ? (
                    <img src={imageUrl} alt={commonName} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full items-center justify-center text-6xl ${style.placeholderBg}`}>
                      🐾
                    </div>
                  )}
                </div>

                {/* Shimmer sweep */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
                    transform: "translateX(-180%)",
                    animation: shimmerActive ? "shimmer-sweep 0.75s ease forwards" : undefined,
                  }}
                />

                {/* NUEVO stamp */}
                {isNew && (
                  <div
                    className="absolute right-2 top-2 rounded-full bg-[#2F5D50] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
                    style={{
                      opacity: stampVisible ? undefined : 0,
                      animation: stampVisible ? "stamp-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards" : undefined,
                    }}
                  >
                    NUEVO
                  </div>
                )}
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
                <p className="mt-3 text-xs text-forest-soft">Cada trobada suma a la teva història natural.</p>
              ) : null}

              <div className="mt-3">
                <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${style.badgeBg} ${style.badgeText}`}>
                  {categoryLabel}
                </span>
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-full bg-[#2F5D50] px-6 py-4 text-sm font-semibold text-[#F4F1E8] shadow-[0_18px_34px_-18px_rgba(26,42,34,0.95)] active:opacity-80"
            style={{
              opacity:    ctaVisible ? 1 : 0,
              transform:  ctaVisible ? "translateY(0)" : "translateY(14px)",
              animation:  ctaVisible ? "cta-rise 0.4s ease forwards" : undefined,
            }}
          >
            Continuar explorant
          </button>

        </div>
      </div>
    </>
  );
}
