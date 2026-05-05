import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  const flowCards = [
    {
      step: "01",
      title: "Captura",
      description: "Fotografia aquell instant en què descobreixes alguna cosa viva i especial.",
      emoji: "📸",
    },
    {
      step: "02",
      title: "Identifica",
      description: "Reconeix quina espècie has vist amb una experiència clara i directa.",
      emoji: "🔍",
    },
    {
      step: "03",
      title: "Col·lecciona",
      description: "Guarda cada troballa i construeix la teva col·lecció personal en creixement.",
      emoji: "📖",
    },
  ];

  const collectionMock = [
    { name: "Linx ibèric", sci: "Lynx pardinus", cardBorder: "border-[#BE9A74]", categoryColor: "#9C6F43", badgeBg: "bg-[#EEDDC7]", badgeText: "text-[#65452D]", topTint: "bg-gradient-to-b from-[#F3E8D8] to-[#FBF6EE]", placeholderBg: "bg-[#E6D1B4]", label: "Mamífer", emoji: "🐾" },
    { name: "Pit-roig europeu", sci: "Erithacus rubecula", cardBorder: "border-[#F0943A]", categoryColor: "#D4620A", badgeBg: "bg-[#FDE9CC]", badgeText: "text-[#7A3008]", topTint: "bg-gradient-to-b from-[#FDE5C0] to-[#FFF8F0]", placeholderBg: "bg-[#FAC97A]", label: "Ocell", emoji: "🪶" },
    { name: "Salamandra comuna", sci: "Salamandra salamandra", cardBorder: "border-[#92B99B]", categoryColor: "#4D7D58", badgeBg: "bg-[#D9EADB]", badgeText: "text-[#2F5A3A]", topTint: "bg-gradient-to-b from-[#E3F0E5] to-[#F5FAF6]", placeholderBg: "bg-[#CFE2D2]", label: "Amfibi", emoji: "🐸" },
    { name: "Llangardaix ocel·lat", sci: "Timon lepidus", cardBorder: "border-[#B8B084]", categoryColor: "#7E7750", badgeBg: "bg-[#E6E0C0]", badgeText: "text-[#585333]", topTint: "bg-gradient-to-b from-[#ECE7CF] to-[#F8F5EA]", placeholderBg: "bg-[#DDD6AE]", label: "Rèptil", emoji: "🦎" },
  ];

  return (
    <main className="min-h-screen bg-sand text-forest-dark">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-16 pt-6 sm:px-8">

        {/* Nav */}
        <header className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-[0.18em] text-[#2d4a3a]">TOVA</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#e6eedf] px-3 py-1 text-xs font-medium text-forest">
              Fauna ibèrica
            </span>
            <AuthButton />
          </div>
        </header>

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-[#d8cdb5] bg-[#f1eadb] shadow-[0_10px_22px_-16px_rgba(47,93,80,0.55)]">
          <div className="h-1.5 w-full bg-[#2F5D50]" />
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">TOVA</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-forest-dark sm:text-4xl">
              Col·lecciona els éssers vius<br className="hidden sm:block" /> que descobreixes.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-forest sm:text-base">
              Fes una foto, identifica allò que has vist i guarda-ho a la teva col·lecció personal de fauna ibèrica.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/capture"
                className="inline-flex items-center justify-center rounded-full bg-[#2F5D50] px-6 py-3 text-sm font-semibold text-[#F4F1E8] shadow-[0_8px_20px_-12px_rgba(26,42,34,0.8)] transition hover:bg-[#264d42]"
              >
                Descobrir un animal
              </Link>
              <Link
                href="/collection"
                className="inline-flex items-center justify-center rounded-full border border-[#c5d4c7] bg-[#fcfaf5] px-6 py-3 text-sm font-semibold text-forest-dark transition hover:bg-sand-dark"
              >
                Veure la meva col·lecció
              </Link>
            </div>
          </div>
        </section>

        {/* Flow steps */}
        <section aria-label="Com funciona" className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-forest-soft">Com funciona</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {flowCards.map((card) => (
              <article
                key={card.step}
                className="overflow-hidden rounded-xl border border-[#d8cdb5] bg-[#f1eadb]"
              >
                <div className="h-1 w-full bg-[#2F5D50]" />
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{card.emoji}</span>
                    <span className="text-xs font-semibold text-forest-soft">{card.step}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-forest-dark">{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-forest-soft">{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Mock collection */}
        <section aria-label="Col·lecció d'exemple" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
              Exemple de col·lecció
            </h2>
            <Link
              href="/collection"
              className="text-xs font-medium text-forest-soft underline-offset-4 hover:underline"
            >
              Veure la meva →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {collectionMock.map((item) => (
              <article
                key={item.name}
                className={`flex min-h-[16rem] flex-col overflow-hidden rounded-lg border-2 bg-[#fbf8f2] ${item.cardBorder}`}
              >
                <div className="h-2 w-full" style={{ backgroundColor: item.categoryColor }} />
                <div className="p-3 pb-0">
                  <div className={`overflow-hidden rounded-md border border-black/5 ${item.topTint}`}>
                    <div className={`aspect-[4/5] w-full flex items-center justify-center ${item.placeholderBg}`}>
                      <span className="text-4xl opacity-70">{item.emoji}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                  <h3 className="text-xs font-semibold text-forest-dark">{item.name}</h3>
                  <p className="mt-0.5 text-[10px] italic text-[#5c6f64]">{item.sci}</p>
                  <div className="mt-auto pt-2">
                    <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${item.badgeBg} ${item.badgeText}`}>
                      {item.label}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
