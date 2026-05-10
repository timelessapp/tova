export type Language = "ca" | "es";

export const translations = {
  ca: {
    filters: "Filtres",
    categories: {
      all: "Tots",
      mammal: "Mamífers",
      bird: "Ocells",
      reptile: "Rèptils",
      amphibian: "Amfibis",
      insect: "Insectes",
      fish: "Peixos",
      other: "Altres",
    },
    categoryLabels: {
      mammal: "Mamífer",
      bird: "Ocell",
      reptile: "Rèptil",
      amphibian: "Amfibi",
      insect: "Insecte",
      fish: "Peix",
      other: "Altre",
    },
    sections: {
      recentDiscoveries: "Descobriments recents",
      myCollection: "La teva col·lecció",
      toDiscover: "Per descobrir",
    },
    header: {
      title: "La meva col·lecció",
      subtitle: "El teu àlbum de descobriments",
      discovered: "Has descobert {count} de {total} animals",
      logIn: "Entra per començar la teva col·lecció.",
    },
    loading: "Carregant col·lecció...",
    errors: {
      catalogUnavailable: "Catàleg no disponible",
      catalogLoadFailed: "Ara mateix no hem pogut carregar el catàleg.",
      noCatalog: "Encara no hi ha espècies carregades al catàleg.",
      supabaseConfig:
        "No hem trobat la configuració de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      sightingsLoadFailed: "Ara mateix no hem pogut carregar els teus albiraments.",
      noCategorySpecies: "No hi ha espècies en aquesta categoria.",
    },
    species: {
      noScientificName: "Sense nom científic",
      savedLocation: "📍 Ubicació desada",
    },
    buttons: {
      goToProfile: "Anar al perfil",
      viewProfile: "Veure perfil",
      goToTrophies: "Anar als trofeus",
      viewTrophies: "Veure trofeus",
      viewMapRecords: "Veure records al mapa",
      loadMore: "Carregar 20 més",
      discover: "Descobrir un animal",
      tryCapture: "Anar a la captura de prova",
    },
    locked: "Encara no has descobert aquest animal",
    unlockedCard: "Per descobrir",
  },
  es: {
    filters: "Filtros",
    categories: {
      all: "Todos",
      mammal: "Mamíferos",
      bird: "Aves",
      reptile: "Reptiles",
      amphibian: "Anfibios",
      insect: "Insectos",
      fish: "Peces",
      other: "Otros",
    },
    categoryLabels: {
      mammal: "Mamífero",
      bird: "Ave",
      reptile: "Reptil",
      amphibian: "Anfibio",
      insect: "Insecto",
      fish: "Pez",
      other: "Otro",
    },
    sections: {
      recentDiscoveries: "Descubrimientos recientes",
      myCollection: "Mi colección",
      toDiscover: "Por descubrir",
    },
    header: {
      title: "Mi colección",
      subtitle: "Tu álbum de descubrimientos",
      discovered: "Has descubierto {count} de {total} animales",
      logIn: "Inicia sesión para comenzar tu colección.",
    },
    loading: "Cargando colección...",
    errors: {
      catalogUnavailable: "Catálogo no disponible",
      catalogLoadFailed: "No pudimos cargar el catálogo en este momento.",
      noCatalog: "Aún no hay especies cargadas en el catálogo.",
      supabaseConfig:
        "No encontramos la configuración de Supabase. Verifica NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      sightingsLoadFailed: "No pudimos cargar tus avistamientos en este momento.",
      noCategorySpecies: "No hay especies en esta categoría.",
    },
    species: {
      noScientificName: "Sin nombre científico",
      savedLocation: "📍 Ubicación guardada",
    },
    buttons: {
      goToProfile: "Ir al perfil",
      viewProfile: "Ver perfil",
      goToTrophies: "Ir a los trofeos",
      viewTrophies: "Ver trofeos",
      viewMapRecords: "Ver registros en el mapa",
      loadMore: "Cargar 20 más",
      discover: "Descubrir un animal",
      tryCapture: "Ir a la captura de prueba",
    },
    locked: "Aún no has descubierto este animal",
    unlockedCard: "Por descubrir",
  },
};

export function t(language: Language) {
  return translations[language];
}
