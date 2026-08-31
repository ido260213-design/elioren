// Hand-written to match supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`
// once a real Supabase project is linked, and keep this file as the fallback shape
// until then.

export type UserRole = "teen" | "employer" | "business" | "admin";
export type EmployerAccountType = "employer" | "business";
export type VerificationStatus = "unverified" | "pending" | "verified";
export type PayType = "hourly" | "fixed";
export type JobStatus = "open" | "filled" | "closed";
export type ApplicationStatus = "applied" | "viewed" | "interview" | "accepted" | "rejected";
export type ReportTargetType = "job" | "profile" | "message";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Availability {
  [day: string]: { start: string; end: string }[] | undefined;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          email: string;
          created_at?: string;
        };
        Update: Partial<{
          role: UserRole;
          email: string;
        }>;
        Relationships: [];
      };
      teen_profiles: {
        Row: {
          user_id: string;
          full_name: string;
          date_of_birth: string;
          skills: string[];
          hobbies: string[];
          bio: string | null;
          availability: Availability;
          avatar_url: string | null;
          guardian_email: string;
          guardian_confirmation_token: string;
          guardian_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          date_of_birth: string;
          skills?: string[];
          hobbies?: string[];
          bio?: string | null;
          availability?: Availability;
          avatar_url?: string | null;
          guardian_email: string;
        };
        Update: Partial<{
          full_name: string;
          date_of_birth: string;
          skills: string[];
          hobbies: string[];
          bio: string | null;
          availability: Availability;
          avatar_url: string | null;
          guardian_email: string;
          // Only ever written by the server (service-role client) — see
          // src/app/api/guardian/confirm/route.ts and prevent_guardian_confirmation_tamper().
          guardian_confirmed_at: string | null;
        }>;
        Relationships: [];
      };
      employer_profiles: {
        Row: {
          user_id: string;
          display_name: string;
          account_type: EmployerAccountType;
          verification_status: VerificationStatus;
          bio: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          account_type: EmployerAccountType;
          bio?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<{
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
        }>;
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          employer_id: string;
          title: string;
          category: string;
          location_text: string;
          lat: number | null;
          lng: number | null;
          pay_type: PayType;
          pay_amount: number;
          age_min: number;
          age_max: number;
          workers_needed: number;
          description: string;
          status: JobStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          title: string;
          category: string;
          location_text: string;
          lat?: number | null;
          lng?: number | null;
          pay_type: PayType;
          pay_amount: number;
          age_min?: number;
          age_max?: number;
          workers_needed?: number;
          description: string;
          status?: JobStatus;
        };
        Update: Partial<{
          title: string;
          category: string;
          location_text: string;
          lat: number | null;
          lng: number | null;
          pay_type: PayType;
          pay_amount: number;
          age_min: number;
          age_max: number;
          workers_needed: number;
          description: string;
          status: JobStatus;
        }>;
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          teen_id: string;
          status: ApplicationStatus;
          applied_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          teen_id: string;
          status?: ApplicationStatus;
        };
        Update: Partial<{
          status: ApplicationStatus;
        }>;
        Relationships: [];
      };
      ratings: {
        Row: {
          id: string;
          job_id: string;
          rater_id: string;
          ratee_id: string;
          stars: number;
          review: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          rater_id: string;
          ratee_id: string;
          stars: number;
          review?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
          status?: ReportStatus;
        };
        Update: Partial<{
          status: ReportStatus;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
