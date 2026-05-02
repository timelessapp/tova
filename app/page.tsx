import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  const flowCards = [
    {
      title: "Captura",
      description:
        "Fotografía ese instante en el que descubres algo vivo y especial.",
    },
    {
      title: "Identifica",
      description:
        "Reconoce qué especie has visto con una experiencia clara y directa.",
    },
    {
      title: "Colecciona",
      description:
        "Guarda cada hallazgo y construye tu colección personal en crecimiento.",
    },
  ];

  const collectionMock = [
    "Lince ibérico",
    "Petirrojo europeo",
    "Zorro rojo",
    "Mariposa macaón",
  ];

  return (
    <main className="min-h-screen bg-sand text-forest-dark">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        <header className="flex items-center justify-between rounded-2xl border border-sand-dark bg-sand px-4 py-3 shadow-[0_1px_0_rgba(38,50,44,0.04)] sm:px-6">
          <p className="text-lg font-semibold tracking-[0.18em] text-[#2d4a3a]">
            TOVA
          </p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#e6eedf] px-3 py-1 text-xs font-medium text-forest">
              Colección viva
            </span>
            <AuthButton />
          </div>
        </header>

        <section className="rounded-3xl border border-[#dbe4d3] bg-gradient-to-br from-[#fdfcf7] via-[#f7f5ed] to-[#eef4e8] p-6 shadow-[0_10px_30px_-24px_rgba(49,79,63,0.5)] sm:p-9">
          <p className="mb-4 inline-flex rounded-full bg-sand-dark px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#47604f]">
            Explora la naturaleza
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#223027] sm:text-4xl lg:max-w-3xl lg:text-5xl">
            Colecciona los seres vivos que descubres en el mundo real.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-forest-soft sm:text-lg">
            Haz una foto, identifica lo que has visto y guárdalo en tu
            colección personal.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/collection"
              className="inline-flex items-center justify-center rounded-full bg-forest px-6 py-3 text-sm font-semibold text-sand transition-colors hover:bg-[#355742] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              Ir a mi colección
            </Link>
            <Link
              href="/capture"
              className="inline-flex items-center justify-center rounded-full border border-sand-dark bg-sand-dark px-6 py-3 text-sm font-semibold text-forest transition-colors hover:bg-sand-dark"
            >
              Empezar captura
            </Link>
          </div>
        </section>

        <section aria-label="Flujo principal" className="grid gap-4 sm:grid-cols-3">
          {flowCards.map((card, index) => (
            <article
              key={card.title}
              className="rounded-2xl border border-sand-dark bg-sand p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-forest-soft">
                Paso {index + 1}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-forest-dark">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-forest-soft">
                {card.description}
              </p>
            </article>
          ))}
        </section>

        <section
          aria-label="Colección de ejemplo"
          className="rounded-3xl border border-sand-dark bg-sand p-6 sm:p-8"
        >
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
                Tu colección
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[#24362d]">
                Primeros hallazgos
              </h2>
            </div>
            <span className="rounded-full bg-sand-dark px-3 py-1 text-xs font-medium text-forest-soft">
              4 especies
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {collectionMock.map((item) => (
              <article
                key={item}
                className="rounded-2xl border border-sand-dark bg-white p-4"
              >
                <div className="mb-3 h-20 rounded-xl bg-gradient-to-br from-[#e4edd8] via-[#f5f6ee] to-[#dcead3]" />
                <h3 className="text-sm font-semibold text-forest-dark">{item}</h3>
                <p className="mt-1 text-xs text-forest-soft">Observado recientemente</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
