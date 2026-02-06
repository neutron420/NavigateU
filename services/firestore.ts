import type { UserRole } from "@/components/role-selection-screen";
import { db } from "@/config/firebase";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UserProfile {
  uid: string;
  role: UserRole;
  email: string;
  displayName: string;
  phone?: string;
  createdAt: any;
  updatedAt: any;

  // Student fields
  regNumber?: string;
  academicYear?: string;
  stream?: string;

  // Faculty fields
  department?: string;
  designation?: string;
  employeeId?: string;
  cabin?: string;
  subjects?: string[];

  // Staff fields
  staffId?: string;
  section?: string;
  shift?: string;

  // Visitor fields
  purpose?: string;
  visitDate?: string;

  // Preferences
  shareLocation?: boolean;
  friendIds?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// USER PROFILES (Firestore: users/{uid})
// ══════════════════════════════════════════════════════════════════════════════

const USERS = "users";

// Create / update user profile
export async function saveUserProfile(
  uid: string,
  data: Partial<UserProfile>,
): Promise<void> {
  const ref = doc(db, USERS, uid);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      ...data,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      shareLocation: false,
      friendIds: [],
    });
  }
}

// Get user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// Delete user profile
export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS, uid));
}

// Search users by email (for friend adding)
export async function searchUsersByEmail(
  emailQuery: string,
): Promise<UserProfile[]> {
  const q = query(
    collection(db, USERS),
    where("email", ">=", emailQuery),
    where("email", "<=", emailQuery + "\uf8ff"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

// Get friends list
export async function getFriendProfiles(
  friendIds: string[],
): Promise<UserProfile[]> {
  if (!friendIds.length) return [];
  const profiles: UserProfile[] = [];
  // Firestore 'in' query supports max 30 items
  const chunks = [];
  for (let i = 0; i < friendIds.length; i += 30) {
    chunks.push(friendIds.slice(i, i + 30));
  }
  for (const chunk of chunks) {
    const q = query(collection(db, USERS), where("uid", "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => profiles.push(d.data() as UserProfile));
  }
  return profiles;
}

// Add friend
export async function addFriend(
  myUid: string,
  friendUid: string,
): Promise<void> {
  const profile = await getUserProfile(myUid);
  if (!profile) return;
  const friends = profile.friendIds || [];
  if (!friends.includes(friendUid)) {
    await updateDoc(doc(db, USERS, myUid), {
      friendIds: [...friends, friendUid],
      updatedAt: serverTimestamp(),
    });
  }
}

// Remove friend
export async function removeFriend(
  myUid: string,
  friendUid: string,
): Promise<void> {
  const profile = await getUserProfile(myUid);
  if (!profile) return;
  const friends = (profile.friendIds || []).filter((id) => id !== friendUid);
  await updateDoc(doc(db, USERS, myUid), {
    friendIds: friends,
    updatedAt: serverTimestamp(),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SAVED PLACES (Firestore: users/{uid}/savedPlaces/{placeId})
// ══════════════════════════════════════════════════════════════════════════════

export interface SavedPlace {
  id: string;
  name: string;
  coord: [number, number];
  note?: string;
  createdAt: any;
}

export async function savePlaceForUser(
  uid: string,
  place: Omit<SavedPlace, "createdAt">,
): Promise<void> {
  await setDoc(doc(db, USERS, uid, "savedPlaces", place.id), {
    ...place,
    createdAt: serverTimestamp(),
  });
}

export async function getUserSavedPlaces(uid: string): Promise<SavedPlace[]> {
  const snap = await getDocs(collection(db, USERS, uid, "savedPlaces"));
  return snap.docs.map((d) => d.data() as SavedPlace);
}

export async function deleteSavedPlace(
  uid: string,
  placeId: string,
): Promise<void> {
  await deleteDoc(doc(db, USERS, uid, "savedPlaces", placeId));
}
