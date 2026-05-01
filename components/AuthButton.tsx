"use client";

import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function AuthButton() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <span className="rounded-full border border-[#cfdbc4] bg-[#f6f8f1] px-3 py-1 text-xs font-medium text-[#607468]">
        Cargando...
      </span>
    );
  }

  if (user) {
    return (
      <span className="rounded-full border border-[#bcd2ba] bg-[#e7f0df] px-3 py-1 text-xs font-medium text-[#355442]">
        Sesion activa
      </span>
    );
  }

  return (
    <Link
      href="/auth"
      className="rounded-full border border-[#bfd0bf] bg-[#edf3e7] px-3 py-1 text-xs font-semibold text-[#345241] transition-colors hover:bg-[#e4ecdc]"
    >
      Entrar
    </Link>
  );
}
