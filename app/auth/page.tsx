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
        "Falta configurar Supabase correctamente para enviar el magic link.",
      );

      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=/capture`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatusMessage("No se pudo enviar el enlace. Revisa el email e intentalo.");
      setSubmitting(false);

      return;
    }

    setStatusMessage("Te enviamos un enlace magico a tu correo.");
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#f7f6ef] px-5 py-6 text-[#243128] sm:px-8">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-6 sm:p-8">
        <Link
          href="/"
          className="text-xs font-medium text-[#5e7367] underline-offset-4 hover:underline"
        >
          Volver
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm text-[#55695d]">
          Usa tu email para recibir un magic link. No necesitas contrasena.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-[#566c60]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-xl border border-[#cfd9c5] bg-white px-3 py-2 text-sm outline-none ring-[#6f9279] focus:ring-2"
            placeholder="tu@email.com"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-[#3f684f] px-5 py-3 text-sm font-semibold text-[#f7f6ef] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Enviando..." : "Enviar magic link"}
          </button>
        </form>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-[#d8e0ce] bg-white px-3 py-2 text-sm text-[#44584d]">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
