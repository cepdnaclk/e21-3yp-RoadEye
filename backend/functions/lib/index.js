"use strict";
/**
 * Entry point for all Firebase Cloud Functions for RoadEye.
 *
 * This file wires together:
 * - HTTPS callable functions for the React Native app
 * - Firestore triggers (e.g. when a crash event is created)
 *
 * These functions assume that:
 * - Authentication is handled on the client via Firebase Auth
 * - The authenticated user's UID is available on `context.auth?.uid`
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCrashEventCreated = exports.saveEmergencyContact = exports.reportCrashEvent = exports.saveRideSummary = void 0;
// Use the v1 API surface of firebase-functions to get the classic typings
// for HTTPS callable functions and Firestore triggers.
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
// Initialize the Admin SDK only once.
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Helper to require that the request is authenticated.
 * Throws an HTTPS error if no user is logged in.
 */
function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to call this function.");
    }
    return context.auth.uid;
}
/**
 * Save or update a ride summary document for the logged-in user.
 *
 * Called from the React Native app at the end of a ride with values
 * already computed on the device (distance, speed, etc.).
 */
exports.saveRideSummary = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const rideData = data;
    // Basic validation – you can extend this further if needed.
    if (!rideData.startedAt || !rideData.endedAt || typeof rideData.distanceKm !== "number") {
        throw new functions.https.HttpsError("invalid-argument", "Missing required ride fields (startedAt, endedAt, distanceKm).");
    }
    const rideRef = db.collection(config_1.collections.rides).doc();
    const ride = {
        id: rideRef.id,
        userId: uid,
        startedAt: rideData.startedAt,
        endedAt: rideData.endedAt,
        distanceKm: rideData.distanceKm,
        avgSpeedKmh: rideData.avgSpeedKmh ?? 0,
        maxSpeedKmh: rideData.maxSpeedKmh ?? 0,
        harshBrakes: rideData.harshBrakes ?? 0,
        harshAccels: rideData.harshAccels ?? 0,
        aggressiveTilts: rideData.aggressiveTilts ?? 0,
        roadQualityScore: rideData.roadQualityScore ?? 0
    };
    await rideRef.set(ride);
    return { rideId: rideRef.id };
});
/**
 * Create a crash event for the logged-in user.
 *
 * The mobile app should call this after it detects a potential crash and the
 * rider does not cancel within a timeout.
 *
 * A separate Firestore trigger (below) will react to these events and send
 * notifications to emergency contacts.
 */
exports.reportCrashEvent = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const crashData = data;
    if (typeof crashData.latitude !== "number" ||
        typeof crashData.longitude !== "number" ||
        typeof crashData.severityScore !== "number") {
        throw new functions.https.HttpsError("invalid-argument", "Missing or invalid crash location/severity fields.");
    }
    const crashRef = db.collection(config_1.collections.crashEvents).doc();
    const crash = {
        id: crashRef.id,
        userId: uid,
        rideId: crashData.rideId,
        occurredAt: crashData.occurredAt ?? admin.firestore.Timestamp.now(),
        latitude: crashData.latitude,
        longitude: crashData.longitude,
        severityScore: crashData.severityScore,
        alertsSent: false
    };
    await crashRef.set(crash);
    return { crashId: crashRef.id };
});
/**
 * Save or update an emergency contact for the logged-in user.
 *
 * The app sends a contact object. If `id` is present, we update that contact;
 * otherwise we create a new one.
 */
exports.saveEmergencyContact = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const contactData = data;
    if (!contactData.name || !contactData.phone || !contactData.channel) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields (name, phone, channel).");
    }
    const contactsCollection = db
        .collection(config_1.collections.users)
        .doc(uid)
        .collection(config_1.collections.emergencyContacts);
    let contactRef;
    if (contactData.id) {
        contactRef = contactsCollection.doc(contactData.id);
    }
    else {
        contactRef = contactsCollection.doc();
    }
    const contact = {
        id: contactRef.id,
        name: contactData.name,
        phone: contactData.phone,
        relationship: contactData.relationship,
        channel: contactData.channel,
        enabled: contactData.enabled ?? true
    };
    await contactRef.set(contact, { merge: true });
    return { contactId: contactRef.id };
});
/**
 * When a new crash event is created, automatically look up the user's
 * emergency contacts and send notifications (SMS/email).
 *
 * NOTE: This example logs instead of actually sending messages.
 * To enable real SMS/email, integrate a provider like Twilio or SendGrid and
 * keep API keys in Functions config.
 */
exports.onCrashEventCreated = functions.firestore
    .document(`${config_1.collections.crashEvents}/{crashId}`)
    .onCreate(async (snap, context) => {
    const crash = snap.data();
    const contactsSnapshot = await db
        .collection(config_1.collections.users)
        .doc(crash.userId)
        .collection(config_1.collections.emergencyContacts)
        .where("enabled", "==", true)
        .get();
    const contacts = contactsSnapshot.docs.map((doc) => doc.data());
    // Placeholder: in a real system, integrate Twilio/SendGrid here.
    functions.logger.info("Crash event detected. Would notify contacts:", {
        crashId: crash.id,
        userId: crash.userId,
        contactCount: contacts.length,
        contacts
    });
    await snap.ref.update({ alertsSent: true });
});
