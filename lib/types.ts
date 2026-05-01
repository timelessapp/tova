export type SpeciesCategory =
  | "mammal"
  | "bird"
  | "reptile"
  | "amphibian"
  | "insect"
  | "fish"
  | "other";

export type Species = {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: SpeciesCategory | string;
  description: string | null;
  habitat: string | null;
  curiosities: string[] | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  size_range: string | null;
  weight_range: string | null;
  lifespan: string | null;
  diet: string | null;
  activity: string | null;
  conservation_status: string | null;
};

export type Sighting = {
  id: string;
  user_id: string;
  species_id: string | null;
  custom_name: string | null;
  photo_url: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  seen_at: string;
  notes: string | null;
  created_at: string;
};

export type UserAchievement = {
  user_id: string;
  achievement_key: string;
  achievement_label: string;
  unlocked_at: string;
  source: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      species: {
        Row: Species;
        Insert: Omit<Species, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Species>;
        Relationships: [];
      };
      sightings: {
        Row: Sighting;
        Insert: {
          user_id: string;
          species_id?: string | null;
          custom_name?: string | null;
          photo_url?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          id?: string;
          created_at?: string;
          seen_at?: string;
        };
        Update: Partial<Sighting>;
        Relationships: [
          {
            foreignKeyName: "sightings_species_id_fkey";
            columns: ["species_id"];
            isOneToOne: false;
            referencedRelation: "species";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sightings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: {
          user_id: string;
          achievement_key: string;
          achievement_label: string;
          unlocked_at?: string;
          source?: string;
        };
        Update: Partial<UserAchievement>;
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
