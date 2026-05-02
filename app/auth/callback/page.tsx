"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const finishSession = async () => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setErrorMessage("No se pudo inicializar la sesion por configuracion invalida.");

        return;
      }

      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get("next") || "/collection";
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setErrorMessage("No pudimos validar el enlace magico. Vuelve a intentarlo.");

          return;
        }

        router.replace(nextPath);

        return;
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace(nextPath);

        return;
      }

      setErrorMessage("El enlace no es valido o ha expirado.");
    };

    finishSession();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-5 py-6 text-forest-dark sm:px-8">
      <section className="w-full max-w-md rounded-3xl border border-sand-dark bg-sand p-6 text-center">
        {errorMessage ? (
          <>
            <h1 className="text-xl font-semibold">No se pudo iniciar sesion</h1>
            <p className="mt-2 text-sm text-forest-soft">{errorMessage}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Validando enlace...</h1>
            <p className="mt-2 text-sm text-forest-soft">Estamos iniciando tu sesion.</p>
          </>
        )}
      </section>
    </main>
  );
}
