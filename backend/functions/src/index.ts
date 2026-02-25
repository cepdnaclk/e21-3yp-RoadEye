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

// Use the v1 API surface of firebase-functions to get the classic typings
// for HTTPS callable functions and Firestore triggers.
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { collections, CrashEvent, EmergencyContact, RideSummary } from "./config";

// Initialize the Admin SDK only once.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Helper to require that the request is authenticated.
 * Throws an HTTPS error if no user is logged in.
 */
function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to call this function."
    );
  }
  return context.auth.uid;
}

/**
 * Save or update a ride summary document for the logged-in user.
 *
 * Called from the React Native app at the end of a ride with values
 * already computed on the device (distance, speed, etc.).
 */
export const saveRideSummary = functions.https.onCall(
  async (data: any, context) => {
    const uid = requireAuth(context);
    const rideData = data as Partial<RideSummary>;

    // Basic validation – you can extend this further if needed.
    if (!rideData.startedAt || !rideData.endedAt || typeof rideData.distanceKm !== "number") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required ride fields (startedAt, endedAt, distanceKm)."
      );
    }

    const rideRef = db.collection(collections.rides).doc();

    const ride: RideSummary = {
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
  }
);

/**
 * Create a crash event for the logged-in user.
 *
 * The mobile app should call this after it detects a potential crash and the
 * rider does not cancel within a timeout.
 *
 * A separate Firestore trigger (below) will react to these events and send
 * notifications to emergency contacts.
 */
export const reportCrashEvent = functions.https.onCall(
  async (data: any, context) => {
    const uid = requireAuth(context);
    const crashData = data as Partial<CrashEvent>;

    if (
      typeof crashData.latitude !== "number" ||
      typeof crashData.longitude !== "number" ||
      typeof crashData.severityScore !== "number"
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing or invalid crash location/severity fields."
      );
    }

    const crashRef = db.collection(collections.crashEvents).doc();

    const crash: CrashEvent = {
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
  }
);

/**
 * Save or update an emergency contact for the logged-in user.
 *
 * The app sends a contact object. If `id` is present, we update that contact;
 * otherwise we create a new one.
 */
export const saveEmergencyContact = functions.https.onCall(
  async (data: any, context) => {
    const uid = requireAuth(context);
    const contactData = data as Partial<EmergencyContact>;

    if (!contactData.name || !contactData.phone || !contactData.channel) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields (name, phone, channel)."
      );
    }

    const contactsCollection = db
      .collection(collections.users)
      .doc(uid)
      .collection(collections.emergencyContacts);

    let contactRef: FirebaseFirestore.DocumentReference;

    if (contactData.id) {
      contactRef = contactsCollection.doc(contactData.id);
    } else {
      contactRef = contactsCollection.doc();
    }

    const contact: EmergencyContact = {
      id: contactRef.id,
      name: contactData.name,
      phone: contactData.phone,
      relationship: contactData.relationship,
      channel: contactData.channel,
      enabled: contactData.enabled ?? true
    };

    await contactRef.set(contact, { merge: true });
    return { contactId: contactRef.id };
  }
);

/**
 * When a new crash event is created, automatically look up the user's
 * emergency contacts and send notifications (SMS/email).
 *
 * NOTE: This example logs instead of actually sending messages.
 * To enable real SMS/email, integrate a provider like Twilio or SendGrid and
 * keep API keys in Functions config.
 */
export const onCrashEventCreated = functions.firestore
  .document(`${collections.crashEvents}/{crashId}`)
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const crash = snap.data() as CrashEvent;

    const contactsSnapshot = await db
      .collection(collections.users)
      .doc(crash.userId)
      .collection(collections.emergencyContacts)
      .where("enabled", "==", true)
      .get();

    const contacts: EmergencyContact[] = contactsSnapshot.docs.map(
      (doc) => doc.data() as EmergencyContact
    );

    // Placeholder: in a real system, integrate Twilio/SendGrid here.
    functions.logger.info("Crash event detected. Would notify contacts:", {
      crashId: crash.id,
      userId: crash.userId,
      contactCount: contacts.length,
      contacts
    });

    await snap.ref.update({ alertsSent: true });
  });
