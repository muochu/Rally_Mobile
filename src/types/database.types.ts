type PreferredHoursJson = {
  weekday_morning: boolean;
  weekday_evening: boolean;
  weekend: boolean;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  calendar_permission?: 'granted' | 'denied' | 'skipped';
};

type AvailabilityBlockRow = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  source: 'apple' | 'google';
  synced_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  utr_rating: number | null;
  preferred_sport: string;
  preferred_hours: PreferredHoursJson | null;
  home_court_id: string | null;
  created_at: string;
  updated_at: string;
};

type CourtsRow = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  hours: Record<string, unknown> | null;
  court_count: number;
  fee_per_hour_cents: number | null;
  surface: string | null;
  indoor: boolean;
};

type ScheduleRequestRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  message: string | null;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
};

type MatchRow = {
  id: string;
  player_a: string;
  player_b: string;
  start_time: string;
  end_time: string;
  court_id: string | null;
  court_fee_cents: number | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  apple_event_id_a: string | null;
  apple_event_id_b: string | null;
  google_event_id_a: string | null;
  google_event_id_b: string | null;
  schedule_request_id: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
};

type MatchReviewRow = {
  id: string;
  match_id: string;
  reviewer_id: string;
  rating: number | null;
  no_show: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      availability_blocks: {
        Row: AvailabilityBlockRow;
        Insert: Omit<AvailabilityBlockRow, 'id' | 'synced_at'> & {
          id?: string;
          synced_at?: string;
        };
        Update: Partial<AvailabilityBlockRow>;
        Relationships: [];
      };
      courts: {
        Row: CourtsRow;
        Insert: Omit<CourtsRow, 'id'> & { id?: string };
        Update: Partial<CourtsRow>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: {
          player_a: string;
          player_b: string;
          start_time: string;
          end_time: string;
          court_id?: string | null;
          court_fee_cents?: number | null;
          status?: 'upcoming' | 'completed' | 'cancelled';
          apple_event_id_a?: string | null;
          apple_event_id_b?: string | null;
          google_event_id_a?: string | null;
          google_event_id_b?: string | null;
          schedule_request_id?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<MatchRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      match_reviews: {
        Row: MatchReviewRow;
        Insert: Omit<MatchReviewRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<MatchReviewRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      schedule_requests: {
        Row: ScheduleRequestRow;
        Insert: {
          requester_id: string;
          recipient_id: string;
          status?:
            | 'pending'
            | 'accepted'
            | 'declined'
            | 'expired'
            | 'cancelled';
          message?: string | null;
          id?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<ScheduleRequestRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_nearby_players: {
        Args: { radius_km?: number; lookahead_days?: number };
        Returns: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          utr_rating: number | null;
          home_court_id: string | null;
          home_court_name: string | null;
          city: string | null;
          busy_intervals: { start_time: string; end_time: string }[];
          distance_km: number | null;
        }[];
      };
      get_player_availability: {
        Args: { player_id: string; from_time: string; to_time: string };
        Returns: { start_time: string; end_time: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
