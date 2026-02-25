"use strict";
/**
 * Shared configuration and type definitions for the RoadEye backend.
 *
 * You can keep environment-specific values (like Twilio API keys) in
 * Firebase Functions config (via `firebase functions:config:set`) instead of
 * hardcoding them here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.collections = void 0;
/**
 * A tiny helper to get the root Firestore collection names in one place.
 * If you ever rename these, change them here instead of touching all files.
 */
exports.collections = {
    users: "users",
    rides: "rides",
    crashEvents: "crash_events",
    emergencyContacts: "emergency_contacts"
};
