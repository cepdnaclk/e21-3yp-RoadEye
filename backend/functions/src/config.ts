/**
 * Shared configuration and type definitions for the RoadEye backend.
 *
 * You can keep environment-specific values (like Twilio API keys) in
 * Firebase Functions config (via `firebase functions:config:set`) instead of
 * hardcoding them here.
 */

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  channel: "sms" | "email";
  enabled: boolean;
}

export interface RideSummary {
  id: string;
  userId: string;
  startedAt: FirebaseFirestore.Timestamp;
  endedAt: FirebaseFirestore.Timestamp;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  harshBrakes: number;
  harshAccels: number;
  aggressiveTilts: number;
  roadQualityScore: number;
}

export interface CrashEvent {
  id: string;
  userId: string;
  rideId?: string;
  occurredAt: FirebaseFirestore.Timestamp;
  latitude: number;
  longitude: number;
  severityScore: number;
  alertsSent: boolean;
}

/**
 * A tiny helper to get the root Firestore collection names in one place.
 * If you ever rename these, change them here instead of touching all files.
 */
export const collections = {
  users: "users",
  rides: "rides",
  crashEvents: "crash_events",
  emergencyContacts: "emergency_contacts"
} as const;
