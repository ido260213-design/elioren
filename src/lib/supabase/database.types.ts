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
export type NotificationType = "application_status_changed" | "new_message";
export type VerificationRequestStatus = "pending" | "approved" | "rejected";
export type TransactionType = "hold" | "release" | "refund" | "payout";
export type TransactionStatus = "pending" | "succeeded" | "failed" | "canceled";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "incomplete";

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
          verification_status: VerificationStatus;
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
          // Only ever written by the admin verification-decision trigger — see
          // prevent_verification_status_tamper() / apply_verification_decision().
          verification_status: VerificationStatus;
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
      conversations: {
        Row: {
          id: string;
          application_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
        };
        Update: never;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string | null;
          image_url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body?: string | null;
          image_url?: string | null;
        };
        Update: Partial<{
          read_at: string | null;
        }>;
        Relationships: [];
      };
      saved_jobs: {
        Row: {
          teen_id: string;
          job_id: string;
          created_at: string;
        };
        Insert: {
          teen_id: string;
          job_id: string;
        };
        Update: never;
        Relationships: [];
      };
      job_matches: {
        Row: {
          teen_id: string;
          job_id: string;
          score: number;
          explanation: string;
          computed_at: string;
        };
        Insert: {
          teen_id: string;
          job_id: string;
          score: number;
          explanation: string;
          computed_at?: string;
        };
        Update: Partial<{
          score: number;
          explanation: string;
          computed_at: string;
        }>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          payload: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          payload?: Record<string, unknown>;
        };
        Update: Partial<{
          read_at: string | null;
        }>;
        Relationships: [];
      };
      verification_requests: {
        Row: {
          id: string;
          user_id: string;
          note: string | null;
          status: VerificationRequestStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          note?: string | null;
        };
        Update: Partial<{
          status: VerificationRequestStatus;
        }>;
        Relationships: [];
      };
      blocked_users: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          reason?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          job_id: string | null;
          employer_id: string;
          teen_id: string;
          amount: number;
          type: TransactionType;
          status: TransactionStatus;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          employer_id: string;
          teen_id: string;
          amount: number;
          type: TransactionType;
          status?: TransactionStatus;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
        };
        Update: Partial<{
          status: TransactionStatus;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
        }>;
        Relationships: [];
      };
      earnings_balance: {
        Row: {
          teen_id: string;
          available_balance: number;
          pending_balance: number;
          updated_at: string;
        };
        Insert: {
          teen_id: string;
          available_balance?: number;
          pending_balance?: number;
        };
        Update: Partial<{
          available_balance: number;
          pending_balance: number;
        }>;
        Relationships: [];
      };
      guardian_payout_accounts: {
        Row: {
          teen_id: string;
          guardian_email: string;
          stripe_connect_account_id: string;
          payouts_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          teen_id: string;
          guardian_email: string;
          stripe_connect_account_id: string;
        };
        Update: Partial<{
          payouts_enabled: boolean;
        }>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: SubscriptionStatus;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
        };
        Update: Partial<{
          status: SubscriptionStatus;
          current_period_end: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
