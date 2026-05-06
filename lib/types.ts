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
  common_name_ca: string | null;
  scientific_name: string | null;
  category: SpeciesCategory | string;
  description: string | null;
  description_ca: string | null;
  description_es: string | null;
  habitat: string | null;
  habitat_ca: string | null;
  habitat_es: string | null;
  curiosities: string[] | null;
  curiosities_ca: string[] | null;
  curiosities_es: string[] | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  size_range: string | null;
  size_range_ca: string | null;
  weight_range: string | null;
  weight_range_ca: string | null;
  lifespan: string | null;
  lifespan_ca: string | null;
  diet: string | null;
  diet_ca: string | null;
  activity: string | null;
  activity_ca: string | null;
  conservation_status: string | null;
  conservation_status_ca: string | null;
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AiIdentificationLog = {
  id: string;
  user_id: string | null;
  image_url: string | null;
  status: string;
  best_common_name: string | null;
  best_scientific_name: string | null;
  best_confidence: number | null;
  species_count: number | null;
  candidate_species_snapshot: Json | null;
  uncertain_reason: string | null;
  model_raw_response: Json | null;
  internal_suggestions: Json | null;
  needs_species_review: boolean;
  error_message: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          language: "ca" | "es";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          language?: "ca" | "es";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          language?: "ca" | "es";
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
      ai_identification_logs: {
        Row: AiIdentificationLog;
        Insert: {
          id?: string;
          user_id?: string | null;
          image_url?: string | null;
          status: string;
          best_common_name?: string | null;
          best_scientific_name?: string | null;
          best_confidence?: number | null;
          species_count?: number | null;
          candidate_species_snapshot?: Json | null;
          uncertain_reason?: string | null;
          model_raw_response?: Json | null;
          internal_suggestions?: Json | null;
          needs_species_review?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<AiIdentificationLog>;
        Relationships: [
          {
            foreignKeyName: "ai_identification_logs_user_id_fkey";
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
