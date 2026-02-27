import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { type Auth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
  databaseURL: extra.firebaseDatabaseUrl,
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth
const { getAuth, initializeAuth } = FirebaseAuth;
const getReactNativePersistence = (
  FirebaseAuth as unknown as {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => any;
  }
).getReactNativePersistence;

let authInstance: Auth;
if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(
      app,
      getReactNativePersistence
        ? { persistence: getReactNativePersistence(AsyncStorage) }
        : undefined,
    );
  } catch {
    // During fast refresh, Auth may already be initialized.
    authInstance = getAuth(app);
  }
}
export const auth = authInstance;

// Firestore (user profiles, building data, settings)
export const db = getFirestore(app);

// Realtime Database (live locations — shuttles, friends)
export const rtdb = getDatabase(app);

export default app;
