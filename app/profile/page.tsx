"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { convertImageFileForApp } from "@/lib/imageConversion";

type ProfileLanguage = "ca" | "es";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  language: ProfileLanguage | null;
};

function fileToJpegBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("No context"));
          return;
        }

        context.drawImage(image, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("No blob"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.9,
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    image.src = objectUrl;
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useCurrentUser();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState<ProfileLanguage>("ca");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setLoadingProfile(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setMessage("No hem pogut connectar amb Supabase.");
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, language")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (error) {
        setMessage("No hem pogut carregar el teu perfil.");
        setLoadingProfile(false);
        return;
      }

      let profileData = data;

      if (!profileData) {
        const fullNameFromAuth =
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : "";

        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: fullNameFromAuth || null,
            language: "ca",
          })
          .select("full_name, avatar_url, language")
          .single<ProfileRow>();

        if (insertError) {
          setMessage("No hem pogut crear el teu perfil.");
          setLoadingProfile(false);
          return;
        }

        profileData = inserted;
      }

      setFullName(profileData.full_name ?? "");
      setAvatarUrl(profileData.avatar_url ?? null);
      setLanguage(profileData.language === "es" ? "es" : "ca");
      setLoadingProfile(false);
    };

    loadProfile();
  }, [authLoading, user]);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !user) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("No hem pogut connectar amb Supabase.");
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const preparedFile = await convertImageFileForApp(file);
      const jpegBlob = await fileToJpegBlob(preparedFile);
      const path = `avatars/${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, jpegBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        setMessage("No hem pogut pujar la foto de perfil.");
        setUploadingAvatar(false);
        return;
      }

      const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);

      if (!data.publicUrl) {
        setMessage("No hem pogut obtenir la URL de la foto.");
        setUploadingAvatar(false);
        return;
      }

      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      setMessage("Foto de perfil preparada. Recorda desar els canvis.");
    } catch {
      setMessage("No hem pogut preparar aquesta imatge.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("No hem pogut connectar amb Supabase.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName.trim() || null,
        language,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" },
    );

    if (error) {
      setMessage("No hem pogut desar els canvis del perfil.");
      setSaving(false);
      return;
    }

    setMessage("Canvis desats.");
    setSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("No hem pogut tancar la sessió.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-sand px-5 py-6 text-forest-dark sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="overflow-hidden rounded-2xl border border-[#d8cdb5] bg-[#f1eadb] p-6 shadow-[0_10px_22px_-16px_rgba(47,93,80,0.55)] sm:p-7">
          <div className="-mx-6 -mt-6 mb-4 h-1.5 bg-[#2F5D50] sm:-mx-7 sm:-mt-7" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href="/collection"
                className="inline-flex text-xs font-semibold uppercase tracking-wider text-forest-soft underline-offset-4 hover:underline"
              >
                TOVA
              </Link>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-forest-dark">Perfil</h1>
              <p className="mt-1 text-sm text-forest">Gestiona el teu compte i preferències.</p>
            </div>
          </div>
        </header>

        {authLoading || loadingProfile ? (
          <section className="rounded-2xl border border-sand-dark bg-white p-6 text-center">
            <p className="text-sm text-forest-soft">Carregant perfil...</p>
          </section>
        ) : null}

        {!authLoading && !user ? (
          <section className="rounded-2xl border border-sand-dark bg-white p-6 text-center">
            <p className="text-sm text-forest-soft">Has d'entrar per veure el teu perfil.</p>
            <Link
              href="/auth"
              className="mt-4 inline-flex rounded-full bg-[#2F5D50] px-5 py-2.5 text-sm font-semibold text-[#F4F1E8]"
            >
              Entrar
            </Link>
          </section>
        ) : null}

        {!authLoading && !loadingProfile && user ? (
          <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-sand-dark bg-white p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-soft">Email</p>
              <p className="mt-1 text-sm text-forest-dark">{user.email ?? "-"}</p>
            </div>

            <div>
              <label htmlFor="full-name" className="text-xs font-semibold uppercase tracking-wide text-forest-soft">
                Nom visible
              </label>
              <input
                id="full-name"
                name="full-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-sand-dark bg-white px-3 py-2 text-sm text-forest-dark"
                placeholder="El teu nom"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-soft">Foto de perfil</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-sand-dark bg-sand-dark">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">👤</div>
                  )}
                </div>
                <label className="inline-flex cursor-pointer rounded-full border border-sand-dark bg-white px-4 py-2 text-sm font-medium text-forest hover:bg-sand">
                  {uploadingAvatar ? "Pujant..." : "Canviar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="language" className="text-xs font-semibold uppercase tracking-wide text-forest-soft">
                Idioma
              </label>
              <select
                id="language"
                name="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as ProfileLanguage)}
                className="mt-2 block w-full rounded-xl border border-sand-dark bg-white px-3 py-2 text-sm text-forest-dark"
              >
                <option value="ca">Català</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="rounded-full bg-[#2F5D50] px-5 py-3 text-sm font-semibold text-[#F4F1E8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Desant..." : "Guardar canvis"}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-sand-dark bg-white px-5 py-3 text-sm font-semibold text-forest"
              >
                Tancar sessió
              </button>
            </div>

            {message ? (
              <p className="rounded-xl border border-sand-dark bg-sand px-3 py-2 text-sm text-forest-soft">
                {message}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </main>
  );
}
