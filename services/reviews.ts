import { db } from "@/config/firebase";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";

export interface BuildingReview {
  id?: string;
  buildingId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: any;
}

const REVIEWS = "reviews";

// Add a review
export async function addBuildingReview(
  review: Omit<BuildingReview, "id" | "createdAt">,
): Promise<string> {
  const docRef = await addDoc(collection(db, REVIEWS), {
    ...review,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Get reviews for a building
export async function getBuildingReviews(
  buildingId: string,
): Promise<BuildingReview[]> {
  const q = query(
    collection(db, REVIEWS),
    where("buildingId", "==", buildingId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as BuildingReview);
}

// Delete a review (only own)
export async function deleteReview(reviewId: string): Promise<void> {
  await deleteDoc(doc(db, REVIEWS, reviewId));
}

// Get average rating for a building
export async function getBuildingAverageRating(
  buildingId: string,
): Promise<{ average: number; count: number }> {
  const reviews = await getBuildingReviews(buildingId);
  if (reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / reviews.length, count: reviews.length };
}
