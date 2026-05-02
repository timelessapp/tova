"use client";

import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function AuthButton() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <span className="rounded-full border border-sand-dark bg-sand px-3 py-1 text-xs font-medium text-[#607468]">
        Cargando...
      </span>
    );
  }

  if (user) {
    return (
      <span className="rounded-full border border-sand-dark bg-sand-dark px-3 py-1 text-xs font-medium text-forest">
        Sesion activa
      </span>
    );
  }

  return (
    <Link
      href="/auth"
      className="rounded-full border border-sand-dark bg-sand-dark px-3 py-1 text-xs font-semibold text-forest transition-colors hover:bg-sand-dark"
    >
      Entrar
    </Link>
  );
}
