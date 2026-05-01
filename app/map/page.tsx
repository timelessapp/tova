import Link from "next/link";
import { mockSpecies } from "@/lib/mockSpecies";

const mapPoints = mockSpecies
  .filter((species) => species.discovered && species.locationName)
  .map((species, index) => {
    const positions = [
      { top: "24%", left: "22%" },
      { top: "44%", left: "55%" },
      { top: "66%", left: "35%" },
      { top: "54%", left: "74%" },
    ];

    return {
      ...species,
      ...positions[index % positions.length],
    };
  });

export default function MapPage() {
  return (
    <main className="min-h-screen bg-[#f7f6ef] px-5 py-6 text-[#243128] sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5c7565]">
              Territorio personal
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#223127]">
              Mis recuerdos en el territorio
            </h1>
          </div>
          <Link
            href="/collection"
            className="rounded-full border border-[#ced8c5] bg-[#f5f7ef] px-3 py-1.5 text-xs font-medium text-[#3c5646]"
          >
            Mi colección
          </Link>
        </header>

        <section className="rounded-3xl border border-[#d5decb] bg-[#f1f5ea] p-4 sm:p-6">
          <div className="relative h-[460px] overflow-hidden rounded-2xl border border-[#cad7be] bg-gradient-to-b from-[#dbe8cd] via-[#ebf2df] to-[#f8f9f3]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(160,186,143,0.35),transparent_35%),radial-gradient(circle_at_70%_55%,rgba(174,199,156,0.35),transparent_32%),radial-gradient(circle_at_55%_78%,rgba(190,209,172,0.3),transparent_28%)]" />

            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#5f745f_1px,transparent_1px),linear-gradient(to_bottom,#5f745f_1px,transparent_1px)] [background-size:36px_36px]" />

            {mapPoints.map((point) => (
              <div
                key={point.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ top: point.top, left: point.left }}
              >
                <div className="relative">
                  <span className="absolute -inset-2 animate-ping rounded-full bg-[#52775e]/30" />
                  <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#436a50] text-sm text-white shadow-sm">
                    {point.imageEmoji}
                  </span>
                </div>
                <div className="mt-2 min-w-36 rounded-xl border border-[#d4dfc9] bg-white/95 px-3 py-2 text-xs text-[#314338] shadow-sm">
                  <p className="font-semibold">{point.commonName}</p>
                  <p className="mt-0.5 text-[#607166]">{point.locationName}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
