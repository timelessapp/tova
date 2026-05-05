"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setStatusMessage(
        "Cal configurar Supabase correctament per enviar el magic link.",
      );

      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatusMessage("No s'ha pogut enviar l'enllaç. Revisa el correu i torna-ho a provar.");
      setSubmitting(false);

      return;
    }

    setStatusMessage("T'hem enviat un enllaç màgic al teu correu.");
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-sand px-5 py-6 text-forest-dark sm:px-8">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-sand-dark bg-sand p-6 sm:p-8">
        <Link
          href="/"
          className="text-xs font-medium text-[#5e7367] underline-offset-4 hover:underline"
        >
          Tornar
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm text-forest-soft">
          Fes servir el teu correu per rebre un magic link. No necessites contrasenya.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-forest-soft">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-xl border border-sand-dark bg-white px-3 py-2 text-sm outline-none ring-forest-soft focus:ring-2"
            placeholder="tu@email.com"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-sand disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Enviant..." : "Enviar magic link"}
          </button>
        </form>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-sand-dark bg-white px-3 py-2 text-sm text-forest-soft">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
