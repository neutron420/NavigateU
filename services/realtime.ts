import { rtdb } from "@/config/firebase";
import {
    get,
    onValue,
    ref,
    remove,
    set,
    type Unsubscribe
} from "firebase/database";

// ══════════════════════════════════════════════════════════════════════════════
// LIVE LOCATION TRACKING (Realtime Database — low latency)
// ══════════════════════════════════════════════════════════════════════════════
// Structure:
//   locations/users/{uid}     → { lat, lng, heading, speed, timestamp }
//   locations/shuttles/{id}   → { lat, lng, heading, speed, route, timestamp }

export interface LiveLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  displayName?: string;
}

export interface ShuttleLocation extends LiveLocation {
  routeId: string;
  routeName: string;
  status: "running" | "stopped" | "out-of-service";
}

// ── User Location ────────────────────────────────────────────────────────────

// Update my live location
export async function updateMyLocation(
  uid: string,
  location: Omit<LiveLocation, "timestamp">,
): Promise<void> {
  await set(ref(rtdb, `locations/users/${uid}`), {
    ...location,
    timestamp: Date.now(),
  });
}

// Stop sharing my location
export async function removeMyLocation(uid: string): Promise<void> {
  await remove(ref(rtdb, `locations/users/${uid}`));
}

// Listen to a friend's live location
export function watchFriendLocation(
  friendUid: string,
  callback: (location: LiveLocation | null) => void,
): Unsubscribe {
  const locRef = ref(rtdb, `locations/users/${friendUid}`);
  return onValue(locRef, (snap) => {
    callback(snap.exists() ? (snap.val() as LiveLocation) : null);
  });
}

// Listen to multiple friends
export function watchFriendsLocations(
  friendUids: string[],
  callback: (locations: Record<string, LiveLocation>) => void,
): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];
  const locations: Record<string, LiveLocation> = {};

  friendUids.forEach((uid) => {
    const unsub = watchFriendLocation(uid, (loc) => {
      if (loc) {
        locations[uid] = loc;
      } else {
        delete locations[uid];
      }
      callback({ ...locations });
    });
    unsubs.push(unsub);
  });

  return unsubs;
}

// ── Shuttle Tracking ─────────────────────────────────────────────────────────

// Update shuttle location (for drivers/admin)
export async function updateShuttleLocation(
  shuttleId: string,
  location: Omit<ShuttleLocation, "timestamp">,
): Promise<void> {
  await set(ref(rtdb, `locations/shuttles/${shuttleId}`), {
    ...location,
    timestamp: Date.now(),
  });
}

// Listen to all shuttles
export function watchAllShuttles(
  callback: (shuttles: Record<string, ShuttleLocation>) => void,
): Unsubscribe {
  const shuttlesRef = ref(rtdb, "locations/shuttles");
  return onValue(shuttlesRef, (snap) => {
    callback(
      snap.exists() ? (snap.val() as Record<string, ShuttleLocation>) : {},
    );
  });
}

// Listen to a specific shuttle
export function watchShuttle(
  shuttleId: string,
  callback: (location: ShuttleLocation | null) => void,
): Unsubscribe {
  const shuttleRef = ref(rtdb, `locations/shuttles/${shuttleId}`);
  return onValue(shuttleRef, (snap) => {
    callback(snap.exists() ? (snap.val() as ShuttleLocation) : null);
  });
}

// Get all shuttles once
export async function getAllShuttles(): Promise<
  Record<string, ShuttleLocation>
> {
  const snap = await get(ref(rtdb, "locations/shuttles"));
  return snap.exists() ? (snap.val() as Record<string, ShuttleLocation>) : {};
}
