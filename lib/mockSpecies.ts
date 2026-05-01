export type SpeciesCategory =
  | "mammal"
  | "bird"
  | "reptile"
  | "amphibian"
  | "insect"
  | "fish"
  | "other";

export type MockSpecies = {
  id: string;
  commonName: string;
  scientificName: string;
  category: SpeciesCategory;
  imageEmoji: string;
  shortDescription: string;
  curiosities: string[];
  habitat: string;
  discovered: boolean;
  discoveredAt?: string;
  locationName?: string;
};

export const mockSpecies: MockSpecies[] = [
  {
    id: "lince-iberico",
    commonName: "Lince iberico",
    scientificName: "Lynx pardinus",
    category: "mammal",
    imageEmoji: "🐆",
    shortDescription:
      "Felino endemico de la peninsula iberica y uno de los mas amenazados de Europa.",
    curiosities: [
      "Tiene pinceles negros en las orejas.",
      "Su dieta se basa principalmente en conejos.",
      "Es un simbolo de la conservacion en Iberia.",
    ],
    habitat: "Matorral mediterraneo y zonas de dehesa.",
    discovered: false,
  },
  {
    id: "petirrojo-europeo",
    commonName: "Petirrojo europeo",
    scientificName: "Erithacus rubecula",
    category: "bird",
    imageEmoji: "🐦",
    shortDescription:
      "Ave pequena y confiada, facil de reconocer por su pecho anaranjado.",
    curiosities: [
      "Canta incluso en dias frios de invierno.",
      "Defiende su territorio con gran energia.",
      "Suele acercarse a jardines y senderos boscosos.",
    ],
    habitat: "Bosques, parques y jardines con arbolado.",
    discovered: true,
    discoveredAt: "2026-04-12",
    locationName: "Sierra de Grazalema",
  },
  {
    id: "jabali",
    commonName: "Jabali",
    scientificName: "Sus scrofa",
    category: "mammal",
    imageEmoji: "🐗",
    shortDescription:
      "Mamifero robusto muy adaptable, presente en gran parte del territorio iberico.",
    curiosities: [
      "Posee un olfato excelente para encontrar alimento.",
      "Se desplaza en grupos familiares llamados piaras.",
      "Puede ser activo tanto al amanecer como al anochecer.",
    ],
    habitat: "Bosques mediterraneos, dehesas y zonas de monte.",
    discovered: false,
  },
  {
    id: "zorro-rojo",
    commonName: "Zorro rojo",
    scientificName: "Vulpes vulpes",
    category: "mammal",
    imageEmoji: "🦊",
    shortDescription:
      "Carnivoro oportunista, inteligente y muy comun en habitats variados.",
    curiosities: [
      "Se comunica con vocalizaciones agudas.",
      "Puede vivir cerca de entornos rurales y periurbanos.",
      "Su cola ayuda al equilibrio y abrigo.",
    ],
    habitat: "Campos abiertos, bosques y mosaicos agrarios.",
    discovered: true,
    discoveredAt: "2026-03-28",
    locationName: "Montseny",
  },
  {
    id: "erizo-europeo",
    commonName: "Erizo europeo",
    scientificName: "Erinaceus europaeus",
    category: "mammal",
    imageEmoji: "🦔",
    shortDescription:
      "Pequeno insectivoro nocturno con espinas protectoras.",
    curiosities: [
      "Se enrolla formando una bola cuando se siente en peligro.",
      "Puede recorrer largas distancias por la noche.",
      "Agradece jardines con refugios naturales.",
    ],
    habitat: "Linderos, jardines y areas de matorral humedo.",
    discovered: false,
  },
  {
    id: "lagarto-ocelado",
    commonName: "Lagarto ocelado",
    scientificName: "Timon lepidus",
    category: "reptile",
    imageEmoji: "🦎",
    shortDescription:
      "Uno de los lagartos mas grandes de Europa occidental, de coloracion vistosa.",
    curiosities: [
      "Presenta manchas azules en los flancos.",
      "Toma el sol para regular su temperatura corporal.",
      "Es frecuente en zonas pedregosas y soleadas.",
    ],
    habitat: "Matorrales, claros de bosque y canchales.",
    discovered: false,
  },
  {
    id: "rana-comun",
    commonName: "Rana comun",
    scientificName: "Pelophylax perezi",
    category: "amphibian",
    imageEmoji: "🐸",
    shortDescription:
      "Anfibio ligado al agua dulce, muy extendido en la peninsula.",
    curiosities: [
      "Sus coros sonoros son tipicos en primavera.",
      "Puede permanecer cerca de charcas y arroyos todo el ano.",
      "Actua como bioindicador de calidad ambiental.",
    ],
    habitat: "Charcas, lagunas, acequias y riberas lentas.",
    discovered: false,
  },
  {
    id: "mariposa-macaon",
    commonName: "Mariposa macaon",
    scientificName: "Papilio machaon",
    category: "insect",
    imageEmoji: "🦋",
    shortDescription:
      "Mariposa diurna elegante y facil de reconocer por sus colas alares.",
    curiosities: [
      "Sus orugas pueden alimentarse de umbeliferas silvestres.",
      "Vuela con trayectoria ondulada y pausada.",
      "Es una de las mariposas mas emblematicas de Iberia.",
    ],
    habitat: "Praderas floridas, lindes y claros soleados.",
    discovered: true,
    discoveredAt: "2026-04-20",
    locationName: "Sierra de Aracena",
  },
];
