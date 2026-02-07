import { Ionicons } from "@expo/vector-icons";
import MapLibreGL from "@maplibre/maplibre-react-native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getCurrentUser } from "@/services/auth";
import {
  addBuildingReview,
  type BuildingReview,
  getBuildingAverageRating,
  getBuildingReviews,
} from "@/services/reviews";

MapLibreGL.setAccessToken(null);

// ── APIs & Styles ────────────────────────────────────────────────────────────
const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? "";
const MAP_STYLE_LIGHT =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const MAP_STYLE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ── Campus ───────────────────────────────────────────────────────────────────
const CAMPUS_CENTER: [number, number] = [85.7349, 20.2194];

interface Building {
  id: string;
  name: string;
  short: string;
  category: string;
  coord: [number, number];
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const BUILDINGS: Building[] = [
  {
    id: "main",
    name: "CV Raman College of Engineering",
    short: "CGU Main",
    category: "academic",
    coord: [85.7349, 20.2194],
    desc: "Main Campus Building",
    icon: "school-outline",
  },
  {
    id: "mba",
    name: "Department of MBA",
    short: "MBA Dept",
    category: "academic",
    coord: [85.7295, 20.2275],
    desc: "MBA & Management Studies",
    icon: "school-outline",
  },
  {
    id: "playground",
    name: "CV Raman Play Ground",
    short: "Play Ground",
    category: "sports",
    coord: [85.734, 20.2305],
    desc: "Cricket & Football Ground",
    icon: "football-outline",
  },
  {
    id: "fountain",
    name: "CGU Fountain",
    short: "Fountain",
    category: "landmark",
    coord: [85.7358, 20.2248],
    desc: "Campus Fountain",
    icon: "water-outline",
  },
  {
    id: "bh2",
    name: "New Boys Hostel 2",
    short: "Boys Hostel 2",
    category: "hostels",
    coord: [85.742, 20.227],
    desc: "Boys Hostel Block 2",
    icon: "bed-outline",
  },
  {
    id: "bh1",
    name: "Boys Apartment Hostel",
    short: "Boys Hostel 1",
    category: "hostels",
    coord: [85.743, 20.221],
    desc: "Apartment Style Hostel",
    icon: "bed-outline",
  },
  {
    id: "nursery",
    name: "CGU Plant Nursery",
    short: "Nursery",
    category: "nature",
    coord: [85.744, 20.2175],
    desc: "Plant Nursery & Garden",
    icon: "leaf-outline",
  },
  {
    id: "admin",
    name: "Administrative Block",
    short: "Admin",
    category: "admin",
    coord: [85.735, 20.222],
    desc: "Registrar & Admin Office",
    icon: "business-outline",
  },
  {
    id: "lib",
    name: "Central Library",
    short: "Library",
    category: "library",
    coord: [85.736, 20.223],
    desc: "Main Library",
    icon: "library-outline",
  },
  {
    id: "canteen",
    name: "Main Canteen",
    short: "Canteen",
    category: "cafeteria",
    coord: [85.737, 20.22],
    desc: "Campus Food Court",
    icon: "cafe-outline",
  },
  {
    id: "gh",
    name: "Girls Hostel",
    short: "GH",
    category: "hostels",
    coord: [85.73, 20.219],
    desc: "Girls Accommodation",
    icon: "bed-outline",
  },
];

const CAT_COLORS: Record<string, string> = {
  academic: "#4285F4",
  admin: "#9C27B0",
  hostels: "#FF9800",
  cafeteria: "#4CAF50",
  library: "#00BCD4",
  sports: "#F44336",
  landmark: "#FFD700",
  nature: "#8BC34A",
};

// ── TomTom Search ────────────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  name: string;
  address: string;
  coord: [number, number];
}

async function tomtomSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  try {
    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}&limit=8&lat=20.2194&lon=85.7349&radius=50000&countrySet=IN`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results) return [];
    return data.results.map((r: any) => ({
      id: r.id,
      name: r.poi?.name || r.address?.freeformAddress || query,
      address: r.address?.freeformAddress || "",
      coord: [r.position.lon, r.position.lat] as [number, number],
    }));
  } catch {
    return [];
  }
}

// ── Route Types ──────────────────────────────────────────────────────────────
interface RouteStep {
  instruction: string;
  distance: number;
  time: number;
  maneuver: string;
  streetName: string;
  point: [number, number];
}

interface RouteResult {
  coords: [number, number][];
  distanceMeters: number;
  timeSeconds: number;
  steps: RouteStep[];
}

// ── TomTom Routing (with turn-by-turn) ───────────────────────────────────────
async function tomtomRoute(
  from: [number, number],
  to: [number, number],
  mode: "pedestrian" | "car" | "bicycle" = "pedestrian",
): Promise<RouteResult | null> {
  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${from[1]},${from[0]}:${to[1]},${to[0]}/json?key=${TOMTOM_KEY}&travelMode=${mode}&routeRepresentation=polyline&instructionsType=text&language=en-US`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return null;
    const route = data.routes[0];
    const points = route.legs[0].points.map(
      (p: any) => [p.longitude, p.latitude] as [number, number],
    );

    const steps: RouteStep[] = [];
    if (route.guidance?.instructions) {
      for (const inst of route.guidance.instructions) {
        steps.push({
          instruction: inst.message || inst.street || "Continue",
          distance: inst.routeOffsetInMeters || 0,
          time: inst.travelTimeInSeconds || 0,
          maneuver: inst.maneuver || "STRAIGHT",
          streetName: inst.street || "",
          point: [
            inst.point?.longitude || from[0],
            inst.point?.latitude || from[1],
          ],
        });
      }
    }

    return {
      coords: points,
      distanceMeters: route.summary.lengthInMeters,
      timeSeconds: route.summary.travelTimeInSeconds,
      steps,
    };
  } catch {
    return null;
  }
}

// Quick time-only route (no geometry/instructions)
async function tomtomRouteTime(
  from: [number, number],
  to: [number, number],
  mode: "pedestrian" | "car" | "bicycle",
): Promise<{ time: string; seconds: number } | null> {
  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${from[1]},${from[0]}:${to[1]},${to[0]}/json?key=${TOMTOM_KEY}&travelMode=${mode}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return null;
    const s = data.routes[0].summary.travelTimeInSeconds;
    return { time: formatTime(s), seconds: s };
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function formatTime(s: number): string {
  const mins = Math.ceil(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rm = mins % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d}d ${rh}h` : `${d} days`;
  }
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}
function getETA(seconds: number): string {
  const now = new Date();
  now.setSeconds(now.getSeconds() + seconds);
  const h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getManeuverIcon(maneuver: string): keyof typeof Ionicons.glyphMap {
  const m = maneuver.toUpperCase();
  if (m.includes("LEFT")) return "arrow-back";
  if (m.includes("RIGHT")) return "arrow-forward";
  if (m.includes("UTURN")) return "return-down-back";
  if (m.includes("ARRIVE") || m.includes("DESTINATION")) return "flag";
  if (m.includes("DEPART")) return "navigate";
  if (m.includes("ROUNDABOUT")) return "refresh";
  if (m.includes("MERGE") || m.includes("RAMP")) return "git-merge";
  return "arrow-up"; // STRAIGHT / default
}

function getManeuverColor(maneuver: string): string {
  const m = maneuver.toUpperCase();
  if (m.includes("LEFT") || m.includes("RIGHT")) return "#1DB954";
  if (m.includes("ARRIVE") || m.includes("DESTINATION")) return "#F44336";
  if (m.includes("UTURN")) return "#FF9800";
  return "#1DB954";
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function MapScreen() {
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  // Location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [isTracking, setIsTracking] = useState(false);
  const [watchSub, setWatchSub] =
    useState<Location.LocationSubscription | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);

  // Directions input
  const [showDirections, setShowDirections] = useState(false);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromCoord, setFromCoord] = useState<[number, number] | null>(null);
  const [toCoord, setToCoord] = useState<[number, number] | null>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [travelMode, setTravelMode] = useState<
    "pedestrian" | "car" | "bicycle"
  >("pedestrian");

  // Route
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(
    null,
  );
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    time: string;
    seconds: number;
  } | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Mode time estimates
  const [modeTimes, setModeTimes] = useState<{
    pedestrian?: string;
    car?: string;
    bicycle?: string;
  }>({});

  // Navigation mode (active turn-by-turn)
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [showStepsList, setShowStepsList] = useState(false);
  const [showNavOptions, setShowNavOptions] = useState(false);

  // Quick search (building search)
  const [quickSearch, setQuickSearch] = useState("");
  const [isQuickSearchFocused, setIsQuickSearchFocused] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );

  // Reviews
  const [buildingReviews, setBuildingReviews] = useState<BuildingReview[]>([]);
  const [buildingRating, setBuildingRating] = useState<{
    average: number;
    count: number;
  }>({ average: 0, count: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Zoom
  const [zoom, setZoom] = useState(15);

  // ── Init Location ──
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation([loc.coords.longitude, loc.coords.latitude]);
    })();
  }, []);

  // ── Deep link: navigate to building ──
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      // navigateu://building/{buildingId}
      if (parsed.path?.startsWith("building/")) {
        const buildingId = parsed.path.replace("building/", "");
        const b = BUILDINGS.find((x) => x.id === buildingId);
        if (b) {
          setSelectedBuilding(b);
          cameraRef.current?.setCamera({
            centerCoordinate: b.coord,
            zoomLevel: 17,
            animationDuration: 800,
            animationMode: "flyTo",
          });
        }
      }
    };
    // Handle link that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    // Handle links while app is open
    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
  }, []);

  // ── Tracking ──
  const toggleTracking = useCallback(async () => {
    if (isTracking && watchSub) {
      watchSub.remove();
      setWatchSub(null);
      setIsTracking(false);
      setTrail([]);
    } else {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (loc) => {
          const c: [number, number] = [
            loc.coords.longitude,
            loc.coords.latitude,
          ];
          setUserLocation(c);
          setTrail((prev) => [...prev.slice(-100), c]);
        },
      );
      setWatchSub(sub);
      setIsTracking(true);
    }
  }, [isTracking, watchSub]);

  // ── TomTom Search with debounce ──
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (text: string, field: "from" | "to") => {
    if (field === "from") setFromText(text);
    else setToText(text);
    setActiveField(field);

    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text === "My Location") return;

    searchTimer.current = setTimeout(async () => {
      if (text.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);

      const campusMatches: SearchResult[] = BUILDINGS.filter(
        (b) =>
          b.name.toLowerCase().includes(text.toLowerCase()) ||
          b.short.toLowerCase().includes(text.toLowerCase()),
      ).map((b) => ({
        id: b.id,
        name: b.name,
        address: "CV Raman Campus",
        coord: b.coord,
      }));

      const tomtomResults = await tomtomSearch(text);
      setSearchResults([...campusMatches, ...tomtomResults]);
      setIsSearching(false);
    }, 400);
  };

  const selectSearchResult = (result: SearchResult) => {
    if (activeField === "from") {
      setFromText(result.name);
      setFromCoord(result.coord);
    } else {
      setToText(result.name);
      setToCoord(result.coord);
    }
    setSearchResults([]);
    setActiveField(null);
    Keyboard.dismiss();
  };

  const setMyLocation = (field: "from" | "to") => {
    if (!userLocation) {
      Alert.alert("Location unavailable", "Please enable location first.");
      return;
    }
    if (field === "from") {
      setFromText("My Location");
      setFromCoord(userLocation);
    } else {
      setToText("My Location");
      setToCoord(userLocation);
    }
    setSearchResults([]);
    setActiveField(null);
  };

  // ── Fetch all travel mode times ──
  const fetchModeTimes = async (
    from: [number, number],
    to: [number, number],
  ) => {
    const modes: ("pedestrian" | "car" | "bicycle")[] = [
      "pedestrian",
      "car",
      "bicycle",
    ];
    const results: { pedestrian?: string; car?: string; bicycle?: string } = {};
    await Promise.all(
      modes.map(async (m) => {
        const r = await tomtomRouteTime(from, to, m);
        if (r) results[m] = r.time;
      }),
    );
    setModeTimes(results);
  };

  // ── Calculate Route ──
  const calculateRoute = async () => {
    if (!fromCoord || !toCoord) {
      Alert.alert("Select locations", "Choose both From and To locations.");
      return;
    }
    setIsLoadingRoute(true);
    Keyboard.dismiss();
    const result = await tomtomRoute(fromCoord, toCoord, travelMode);
    setIsLoadingRoute(false);

    if (!result) {
      Alert.alert(
        "Route Error",
        "Could not find a route. Try different locations.",
      );
      return;
    }
    setRouteCoords(result.coords);
    setRouteInfo({
      distance: formatDistance(result.distanceMeters),
      time: formatTime(result.timeSeconds),
      seconds: result.timeSeconds,
    });
    setRouteSteps(result.steps);

    // Fetch times for all modes in parallel
    fetchModeTimes(fromCoord, toCoord);

    // Fit camera to route
    if (result.coords.length > 1) {
      const lngs = result.coords.map((c) => c[0]);
      const lats = result.coords.map((c) => c[1]);
      const ne: [number, number] = [
        Math.max(...lngs) + 0.002,
        Math.max(...lats) + 0.002,
      ];
      const sw: [number, number] = [
        Math.min(...lngs) - 0.002,
        Math.min(...lats) - 0.002,
      ];
      cameraRef.current?.fitBounds(ne, sw, 60, 500);
    }
  };

  // ── Recalculate when travel mode changes ──
  const changeTravelMode = async (mode: "pedestrian" | "car" | "bicycle") => {
    setTravelMode(mode);
    if (fromCoord && toCoord && routeCoords) {
      setIsLoadingRoute(true);
      const result = await tomtomRoute(fromCoord, toCoord, mode);
      setIsLoadingRoute(false);
      if (result) {
        setRouteCoords(result.coords);
        setRouteInfo({
          distance: formatDistance(result.distanceMeters),
          time: formatTime(result.timeSeconds),
          seconds: result.timeSeconds,
        });
        setRouteSteps(result.steps);
      }
    }
  };

  // ── Start Navigation ──
  const startNavigation = async () => {
    if (!routeCoords || !routeInfo) return;
    setIsNavigating(true);
    setCurrentStepIdx(0);
    setShowStepsList(false);
    setShowNavOptions(false);

    // Start GPS tracking for navigation
    if (!isTracking) {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (loc) => {
          const c: [number, number] = [
            loc.coords.longitude,
            loc.coords.latitude,
          ];
          setUserLocation(c);
        },
      );
      setWatchSub(sub);
      setIsTracking(true);
    }

    // Zoom to first step
    if (userLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 18,
        animationDuration: 800,
        animationMode: "flyTo",
      });
    }
  };

  // ── Exit Navigation ──
  const exitNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIdx(0);
    setShowStepsList(false);
    setShowNavOptions(false);

    if (watchSub) {
      watchSub.remove();
      setWatchSub(null);
      setIsTracking(false);
    }

    // Zoom back out to route
    if (routeCoords && routeCoords.length > 1) {
      const lngs = routeCoords.map((c) => c[0]);
      const lats = routeCoords.map((c) => c[1]);
      cameraRef.current?.fitBounds(
        [Math.max(...lngs) + 0.002, Math.max(...lats) + 0.002],
        [Math.min(...lngs) - 0.002, Math.min(...lats) - 0.002],
        60,
        500,
      );
    }
  };

  const clearRoute = () => {
    setRouteCoords(null);
    setRouteInfo(null);
    setRouteSteps([]);
    setFromText("");
    setToText("");
    setFromCoord(null);
    setToCoord(null);
    setShowDirections(false);
    setSelectedBuilding(null);
    setIsNavigating(false);
    setModeTimes({});
    setShowStepsList(false);
    setShowNavOptions(false);
    if (watchSub) {
      watchSub.remove();
      setWatchSub(null);
      setIsTracking(false);
    }
  };

  // ── Building Selection ──
  const handleSelectBuilding = (b: Building) => {
    setSelectedBuilding(b);
    setQuickSearch("");
    setIsQuickSearchFocused(false);
    Keyboard.dismiss();
    cameraRef.current?.setCamera({
      centerCoordinate: b.coord,
      zoomLevel: 17,
      animationDuration: 800,
      animationMode: "flyTo",
    });
  };

  const handleDirectionsToBuilding = () => {
    if (!selectedBuilding) return;
    setShowDirections(true);
    setToText(selectedBuilding.name);
    setToCoord(selectedBuilding.coord);
    if (userLocation) {
      setFromText("My Location");
      setFromCoord(userLocation);
    }
    setSelectedBuilding(null);
  };

  // ── Fetch reviews when building selected ──
  useEffect(() => {
    if (!selectedBuilding) {
      setBuildingReviews([]);
      setBuildingRating({ average: 0, count: 0 });
      setShowReviewForm(false);
      setShowAllReviews(false);
      return;
    }
    (async () => {
      try {
        const [reviews, rating] = await Promise.all([
          getBuildingReviews(selectedBuilding.id),
          getBuildingAverageRating(selectedBuilding.id),
        ]);
        setBuildingReviews(reviews);
        setBuildingRating(rating);
      } catch (e) {
        console.warn("Failed to load reviews", e);
      }
    })();
  }, [selectedBuilding]);

  // ── Submit review ──
  const handleSubmitReview = async () => {
    if (!selectedBuilding) return;
    const user = getCurrentUser();
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to leave a review.");
      return;
    }
    if (!reviewComment.trim()) {
      Alert.alert("Review", "Please write a comment.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await addBuildingReview({
        buildingId: selectedBuilding.id,
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      // Refresh
      const [reviews, rating] = await Promise.all([
        getBuildingReviews(selectedBuilding.id),
        getBuildingAverageRating(selectedBuilding.id),
      ]);
      setBuildingReviews(reviews);
      setBuildingRating(rating);
      setReviewComment("");
      setReviewRating(5);
      setShowReviewForm(false);
      Alert.alert("Thanks!", "Your review has been posted.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ── Share building link ──
  const handleShareBuilding = async () => {
    if (!selectedBuilding) return;
    const deepLink = `navigateu://building/${selectedBuilding.id}`;
    const message = `Check out ${selectedBuilding.name} on NavigateU!\n${deepLink}`;
    try {
      await Share.share({
        message,
        title: selectedBuilding.name,
      });
    } catch {
      Alert.alert("Share", message);
    }
  };

  // ── Zoom ──
  const zoomIn = () => {
    const nz = Math.min(zoom + 1, 20);
    setZoom(nz);
    cameraRef.current?.setCamera({
      zoomLevel: nz,
      animationDuration: 300,
      animationMode: "easeTo",
    });
  };
  const zoomOut = () => {
    const nz = Math.max(zoom - 1, 10);
    setZoom(nz);
    cameraRef.current?.setCamera({
      zoomLevel: nz,
      animationDuration: 300,
      animationMode: "easeTo",
    });
  };
  const centerUser = () => {
    if (userLocation)
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 17,
        animationDuration: 800,
        animationMode: "flyTo",
      });
  };

  // Filtered campus buildings
  const filteredBuildings = BUILDINGS.filter(
    (b) =>
      b.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
      b.short.toLowerCase().includes(quickSearch.toLowerCase()),
  );

  // Current step for navigation
  const currentStep = routeSteps[currentStepIdx] || null;
  const nextStep = routeSteps[currentStepIdx + 1] || null;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isNavigating ? "light-content" : "dark-content"}
        backgroundColor={isNavigating ? "#1a1a2e" : "transparent"}
        translucent
      />

      {/* ═══ MAP ═══ */}
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={isNavigating ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          centerCoordinate={CAMPUS_CENTER}
          zoomLevel={15}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* User dot */}
        {userLocation && (
          <MapLibreGL.MarkerView coordinate={userLocation}>
            <View style={styles.userDot}>
              <View
                style={[
                  styles.userDotRing,
                  isNavigating && styles.userDotRingNav,
                ]}
              >
                <View
                  style={[
                    styles.userDotCenter,
                    isNavigating && styles.userDotCenterNav,
                  ]}
                />
              </View>
              {(isTracking || isNavigating) && (
                <View style={styles.userPulse} />
              )}
            </View>
          </MapLibreGL.MarkerView>
        )}

        {/* Trail */}
        {trail.length > 1 && !isNavigating && (
          <MapLibreGL.ShapeSource
            id="trail"
            shape={{
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: trail },
            }}
          >
            <MapLibreGL.LineLayer
              id="trail-line"
              style={{
                lineColor: "#4285F4",
                lineWidth: 3,
                lineOpacity: 0.5,
                lineCap: "round",
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Building markers (hidden during navigation) */}
        {!showDirections &&
          !isNavigating &&
          filteredBuildings.map((b) => (
            <MapLibreGL.MarkerView key={b.id} coordinate={b.coord}>
              <TouchableOpacity
                onPress={() => handleSelectBuilding(b)}
                style={[
                  styles.marker,
                  { backgroundColor: CAT_COLORS[b.category] || "#666" },
                  selectedBuilding?.id === b.id && styles.markerSelected,
                ]}
              >
                <Ionicons name={b.icon} size={14} color="#fff" />
              </TouchableOpacity>
            </MapLibreGL.MarkerView>
          ))}

        {/* Route line */}
        {routeCoords && routeCoords.length > 1 && (
          <>
            {/* Route shadow/outline */}
            <MapLibreGL.ShapeSource
              id="route-outline"
              shape={{
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: routeCoords },
              }}
            >
              <MapLibreGL.LineLayer
                id="route-outline-line"
                style={{
                  lineColor: isNavigating ? "#1a5276" : "#2a6fba",
                  lineWidth: isNavigating ? 10 : 8,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </MapLibreGL.ShapeSource>
            {/* Route main line */}
            <MapLibreGL.ShapeSource
              id="route"
              shape={{
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: routeCoords },
              }}
            >
              <MapLibreGL.LineLayer
                id="route-line"
                style={{
                  lineColor: isNavigating ? "#4FC3F7" : "#4285F4",
                  lineWidth: isNavigating ? 7 : 5,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </MapLibreGL.ShapeSource>
          </>
        )}

        {/* Route start/end markers */}
        {fromCoord && routeCoords && (
          <MapLibreGL.MarkerView coordinate={fromCoord}>
            <View style={[styles.routeMarker, { backgroundColor: "#4CAF50" }]}>
              <Ionicons name="radio-button-on" size={14} color="#fff" />
            </View>
          </MapLibreGL.MarkerView>
        )}
        {toCoord && routeCoords && (
          <MapLibreGL.MarkerView coordinate={toCoord}>
            <View style={[styles.routeMarker, { backgroundColor: "#F44336" }]}>
              <Ionicons name="location" size={14} color="#fff" />
            </View>
          </MapLibreGL.MarkerView>
        )}
      </MapLibreGL.MapView>

      {/* ═══════════════════════════════════════════════════════════════════════
           NAVIGATION MODE UI (active turn-by-turn)
         ═══════════════════════════════════════════════════════════════════════ */}
      {isNavigating && currentStep && (
        <>
          {/* ── Direction Banner (top) ── */}
          <View style={navStyles.topBanner}>
            <View
              style={[
                navStyles.maneuverBadge,
                { backgroundColor: getManeuverColor(currentStep.maneuver) },
              ]}
            >
              <Ionicons
                name={getManeuverIcon(currentStep.maneuver)}
                size={28}
                color="#fff"
              />
            </View>
            <View style={navStyles.bannerTextWrap}>
              <Text style={navStyles.bannerInstruction} numberOfLines={2}>
                {currentStep.instruction}
              </Text>
              {currentStep.streetName ? (
                <Text style={navStyles.bannerStreet} numberOfLines={1}>
                  {currentStep.streetName}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setShowNavOptions(!showNavOptions)}
              style={navStyles.optionsBtn}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Next step preview */}
          {nextStep && (
            <View style={navStyles.nextStepBar}>
              <Text style={navStyles.nextLabel}>Then</Text>
              <Ionicons
                name={getManeuverIcon(nextStep.maneuver)}
                size={14}
                color="#aaa"
              />
              <Text style={navStyles.nextText} numberOfLines={1}>
                {nextStep.instruction}
              </Text>
            </View>
          )}

          {/* ── Options Menu ── */}
          {showNavOptions && (
            <View style={navStyles.optionsMenu}>
              <TouchableOpacity
                style={navStyles.optionRow}
                onPress={() => {
                  setShowStepsList(true);
                  setShowNavOptions(false);
                }}
              >
                <Ionicons name="list" size={20} color="#fff" />
                <Text style={navStyles.optionText}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={navStyles.optionRow}
                onPress={() => {
                  setShowNavOptions(false);
                  centerUser();
                }}
              >
                <Ionicons name="locate" size={20} color="#fff" />
                <Text style={navStyles.optionText}>Re-center</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={navStyles.optionRow}
                onPress={() => {
                  setShowNavOptions(false);
                  Alert.alert(
                    "Share",
                    "Share your live location with friends (coming soon)",
                  );
                }}
              >
                <Ionicons name="share-social" size={20} color="#fff" />
                <Text style={navStyles.optionText}>Share ride progress</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={navStyles.optionRow}
                onPress={() => setShowNavOptions(false)}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={navStyles.optionText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step Navigator (prev/next) ── */}
          <View style={navStyles.stepNav}>
            <TouchableOpacity
              style={[
                navStyles.stepNavBtn,
                currentStepIdx === 0 && { opacity: 0.3 },
              ]}
              disabled={currentStepIdx === 0}
              onPress={() => {
                const ni = Math.max(0, currentStepIdx - 1);
                setCurrentStepIdx(ni);
                if (routeSteps[ni]) {
                  cameraRef.current?.setCamera({
                    centerCoordinate: routeSteps[ni].point,
                    zoomLevel: 18,
                    animationDuration: 500,
                    animationMode: "flyTo",
                  });
                }
              }}
            >
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={navStyles.stepCounter}>
              Step {currentStepIdx + 1} of {routeSteps.length}
            </Text>
            <TouchableOpacity
              style={[
                navStyles.stepNavBtn,
                currentStepIdx >= routeSteps.length - 1 && { opacity: 0.3 },
              ]}
              disabled={currentStepIdx >= routeSteps.length - 1}
              onPress={() => {
                const ni = Math.min(routeSteps.length - 1, currentStepIdx + 1);
                setCurrentStepIdx(ni);
                if (routeSteps[ni]) {
                  cameraRef.current?.setCamera({
                    centerCoordinate: routeSteps[ni].point,
                    zoomLevel: 18,
                    animationDuration: 500,
                    animationMode: "flyTo",
                  });
                }
              }}
            >
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Bottom Info Bar ── */}
          <View style={navStyles.bottomBar}>
            <View style={navStyles.bottomInfo}>
              <Text style={navStyles.bottomTime}>{routeInfo?.time || "—"}</Text>
              <View style={navStyles.bottomDivider} />
              <Text style={navStyles.bottomDist}>
                {routeInfo?.distance || "—"}
              </Text>
              <View style={navStyles.bottomDivider} />
              <Text style={navStyles.bottomEta}>
                ETA {routeInfo ? getETA(routeInfo.seconds) : "—"}
              </Text>
            </View>
            <TouchableOpacity
              style={navStyles.exitBtn}
              onPress={exitNavigation}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={navStyles.exitText}>Exit</Text>
            </TouchableOpacity>
          </View>

          {/* ── Full Steps List (overlay) ── */}
          {showStepsList && (
            <View style={navStyles.stepsOverlay}>
              <View style={navStyles.stepsHeader}>
                <Text style={navStyles.stepsTitle}>Directions</Text>
                <TouchableOpacity onPress={() => setShowStepsList(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={navStyles.stepsSubHeader}>
                <Ionicons
                  name={
                    travelMode === "car"
                      ? "car"
                      : travelMode === "bicycle"
                        ? "bicycle"
                        : "walk"
                  }
                  size={16}
                  color="#aaa"
                />
                <Text style={navStyles.stepsSubText}>
                  {routeInfo?.time} · {routeInfo?.distance}
                </Text>
              </View>
              <ScrollView style={navStyles.stepsList}>
                {routeSteps.map((step, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      navStyles.stepRow,
                      i === currentStepIdx && navStyles.stepRowActive,
                    ]}
                    onPress={() => {
                      setCurrentStepIdx(i);
                      setShowStepsList(false);
                      cameraRef.current?.setCamera({
                        centerCoordinate: step.point,
                        zoomLevel: 18,
                        animationDuration: 500,
                        animationMode: "flyTo",
                      });
                    }}
                  >
                    <View
                      style={[
                        navStyles.stepIcon,
                        {
                          backgroundColor: getManeuverColor(step.maneuver),
                        },
                      ]}
                    >
                      <Ionicons
                        name={getManeuverIcon(step.maneuver)}
                        size={16}
                        color="#fff"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={navStyles.stepInstruction} numberOfLines={2}>
                        {step.instruction}
                      </Text>
                      {step.streetName ? (
                        <Text style={navStyles.stepStreet} numberOfLines={1}>
                          {step.streetName}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={navStyles.stepDist}>
                      {formatDistance(step.distance)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           NORMAL MODE UI (search / directions / route overview)
         ═══════════════════════════════════════════════════════════════════════ */}
      {!isNavigating && (
        <>
          {!showDirections ? (
            /* ── Quick Search Bar ── */
            <View style={styles.topBar}>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search campus buildings..."
                  placeholderTextColor="#999"
                  value={quickSearch}
                  onChangeText={setQuickSearch}
                  onFocus={() => setIsQuickSearchFocused(true)}
                  onBlur={() =>
                    setTimeout(() => setIsQuickSearchFocused(false), 200)
                  }
                />
                {quickSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setQuickSearch("")}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.directionsIcon}
                  onPress={() => {
                    setShowDirections(true);
                    if (userLocation) {
                      setFromText("My Location");
                      setFromCoord(userLocation);
                    }
                  }}
                >
                  <Ionicons name="navigate" size={20} color="#4285F4" />
                </TouchableOpacity>
              </View>

              {/* Quick Results */}
              {isQuickSearchFocused && quickSearch.length > 0 && (
                <ScrollView
                  style={styles.quickResults}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredBuildings.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.resultRow}
                      onPress={() => handleSelectBuilding(b)}
                    >
                      <View
                        style={[
                          styles.resultDot,
                          { backgroundColor: CAT_COLORS[b.category] },
                        ]}
                      >
                        <Ionicons name={b.icon} size={12} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{b.name}</Text>
                        <Text style={styles.resultAddr}>{b.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            /* ── Directions Panel ── */
            <View style={styles.directionsPanel}>
              <View style={styles.dirHeader}>
                <TouchableOpacity onPress={clearRoute} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.dirFields}>
                  <View style={styles.dirFieldRow}>
                    <View
                      style={[styles.dirDot, { backgroundColor: "#4CAF50" }]}
                    />
                    <TextInput
                      style={styles.dirInput}
                      placeholder="From: Search a place..."
                      placeholderTextColor="#999"
                      value={fromText}
                      onChangeText={(t) => handleSearchInput(t, "from")}
                      onFocus={() => setActiveField("from")}
                    />
                    {fromText.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setFromText("");
                          setFromCoord(null);
                        }}
                      >
                        <Ionicons name="close" size={18} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.dirDivider} />
                  <View style={styles.dirFieldRow}>
                    <View
                      style={[styles.dirDot, { backgroundColor: "#F44336" }]}
                    />
                    <TextInput
                      style={styles.dirInput}
                      placeholder="To: Search a place..."
                      placeholderTextColor="#999"
                      value={toText}
                      onChangeText={(t) => handleSearchInput(t, "to")}
                      onFocus={() => setActiveField("to")}
                    />
                    {toText.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setToText("");
                          setToCoord(null);
                        }}
                      >
                        <Ionicons name="close" size={18} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Swap button */}
                <TouchableOpacity
                  style={styles.swapBtn}
                  onPress={() => {
                    const tf = fromText;
                    const tc = fromCoord;
                    setFromText(toText);
                    setFromCoord(toCoord);
                    setToText(tf);
                    setToCoord(tc);
                  }}
                >
                  <Ionicons name="swap-vertical" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Travel Mode Tabs (Google Maps style with time) */}
              <View style={styles.travelModes}>
                {[
                  {
                    mode: "car" as const,
                    icon: "car-outline" as const,
                    label: "Drive",
                  },
                  {
                    mode: "bicycle" as const,
                    icon: "bicycle-outline" as const,
                    label: "Cycle",
                  },
                  {
                    mode: "pedestrian" as const,
                    icon: "walk-outline" as const,
                    label: "Walk",
                  },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.mode}
                    style={[
                      styles.modeTab,
                      travelMode === m.mode && styles.modeTabActive,
                    ]}
                    onPress={() => changeTravelMode(m.mode)}
                  >
                    <Ionicons
                      name={m.icon}
                      size={18}
                      color={travelMode === m.mode ? "#4285F4" : "#666"}
                    />
                    <Text
                      style={[
                        styles.modeLabel,
                        travelMode === m.mode && styles.modeLabelActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                    {modeTimes[m.mode] && (
                      <Text
                        style={[
                          styles.modeTime,
                          travelMode === m.mode && styles.modeTimeActive,
                        ]}
                      >
                        {modeTimes[m.mode]}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Go Button (before route) or Route controls */}
              {!routeCoords && (
                <View style={styles.goRow}>
                  <TouchableOpacity
                    style={styles.goBtn}
                    onPress={calculateRoute}
                    disabled={isLoadingRoute}
                  >
                    {isLoadingRoute ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="search" size={16} color="#fff" />
                        <Text style={styles.goBtnText}>Find Route</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Search Results */}
              {activeField && (searchResults.length > 0 || isSearching) && (
                <ScrollView
                  style={styles.dirResults}
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={styles.resultRow}
                    onPress={() => setMyLocation(activeField)}
                  >
                    <View
                      style={[styles.resultDot, { backgroundColor: "#4285F4" }]}
                    >
                      <Ionicons name="locate" size={12} color="#fff" />
                    </View>
                    <Text style={styles.resultName}>My Location</Text>
                  </TouchableOpacity>

                  {isSearching && (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#4285F4" />
                      <Text style={styles.loadingText}>Searching...</Text>
                    </View>
                  )}

                  {searchResults.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.resultRow}
                      onPress={() => selectSearchResult(r)}
                    >
                      <View
                        style={[
                          styles.resultDot,
                          {
                            backgroundColor:
                              r.address === "CV Raman Campus"
                                ? "#4285F4"
                                : "#999",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            r.address === "CV Raman Campus"
                              ? "school"
                              : "location"
                          }
                          size={12}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {r.name}
                        </Text>
                        <Text style={styles.resultAddr} numberOfLines={1}>
                          {r.address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ═══ ROUTE OVERVIEW BOTTOM SHEET ═══ */}
          {routeInfo && routeCoords && !isNavigating && (
            <View style={styles.routeSheet}>
              {/* Drag handle */}
              <View style={styles.sheetHandle} />

              {/* Route Summary */}
              <View style={styles.routeSummary}>
                <View style={styles.routeTimeWrap}>
                  <Text style={styles.routeTimeText}>{routeInfo.time}</Text>
                  <Text style={styles.routeDistText}>{routeInfo.distance}</Text>
                </View>
                <View style={styles.routeEtaWrap}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.routeEtaText}>
                    Arrive by {getETA(routeInfo.seconds)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.routeActions}>
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={startNavigation}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.startBtnText}>Start</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    Alert.alert(
                      "Share",
                      "Share directions with friends (coming soon)",
                    );
                  }}
                >
                  <Ionicons name="share-outline" size={18} color="#4285F4" />
                  <Text style={styles.actionBtnText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setShowStepsList(!showStepsList)}
                >
                  <Ionicons name="list-outline" size={18} color="#4285F4" />
                  <Text style={styles.actionBtnText}>Steps</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={clearRoute}>
                  <Ionicons name="close-outline" size={18} color="#F44336" />
                  <Text style={[styles.actionBtnText, { color: "#F44336" }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Route steps preview */}
              {showStepsList && routeSteps.length > 0 && (
                <ScrollView style={styles.stepsPreview}>
                  <View style={styles.stepsPreviewHeader}>
                    <Ionicons name="list" size={16} color="#333" />
                    <Text style={styles.stepsPreviewTitle}>
                      Step-by-step directions
                    </Text>
                  </View>
                  {routeSteps.map((step, i) => (
                    <View key={i} style={styles.previewStepRow}>
                      <View
                        style={[
                          styles.previewStepIcon,
                          {
                            backgroundColor: getManeuverColor(step.maneuver),
                          },
                        ]}
                      >
                        <Ionicons
                          name={getManeuverIcon(step.maneuver)}
                          size={14}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewStepText} numberOfLines={2}>
                          {step.instruction}
                        </Text>
                        {step.streetName ? (
                          <Text
                            style={styles.previewStepStreet}
                            numberOfLines={1}
                          >
                            {step.streetName}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.previewStepDist}>
                        {formatDistance(step.distance)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ═══ BUILDING CARD ═══ */}
          {selectedBuilding && !showDirections && (
            <View style={styles.card}>
              {/* Header row */}
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.cardIcon,
                    {
                      backgroundColor: CAT_COLORS[selectedBuilding.category],
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedBuilding.icon}
                    size={22}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{selectedBuilding.name}</Text>
                  <Text style={styles.cardDesc}>{selectedBuilding.desc}</Text>
                  {/* Star rating summary */}
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={
                          s <= Math.round(buildingRating.average)
                            ? "star"
                            : "star-outline"
                        }
                        size={14}
                        color="#F59E0B"
                      />
                    ))}
                    <Text style={styles.ratingText}>
                      {buildingRating.count > 0
                        ? `${buildingRating.average.toFixed(1)} (${buildingRating.count})`
                        : "No reviews"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedBuilding(null)}>
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Action buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.cardBtn, { backgroundColor: "#4285F4" }]}
                  onPress={handleDirectionsToBuilding}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.cardBtnText}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardBtn}
                  onPress={handleShareBuilding}
                >
                  <Ionicons name="share-social" size={16} color="#4285F4" />
                  <Text style={[styles.cardBtnText, { color: "#4285F4" }]}>
                    Share
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardBtn}
                  onPress={() => setShowReviewForm((v) => !v)}
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={16}
                    color="#4285F4"
                  />
                  <Text style={[styles.cardBtnText, { color: "#4285F4" }]}>
                    Review
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Review form */}
              {showReviewForm && (
                <View style={styles.reviewForm}>
                  <Text style={styles.reviewFormTitle}>Write a Review</Text>
                  <View style={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setReviewRating(s)}
                      >
                        <Ionicons
                          name={s <= reviewRating ? "star" : "star-outline"}
                          size={28}
                          color="#F59E0B"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Share your experience..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                  />
                  <TouchableOpacity
                    style={styles.reviewSubmitBtn}
                    onPress={handleSubmitReview}
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.reviewSubmitText}>Post Review</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Reviews list */}
              {buildingReviews.length > 0 && (
                <View style={styles.reviewsList}>
                  <TouchableOpacity
                    style={styles.reviewsToggle}
                    onPress={() => setShowAllReviews((v) => !v)}
                  >
                    <Text style={styles.reviewsToggleText}>
                      {showAllReviews
                        ? "Hide Reviews"
                        : `See ${buildingReviews.length} Reviews`}
                    </Text>
                    <Ionicons
                      name={showAllReviews ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#4285F4"
                    />
                  </TouchableOpacity>
                  {showAllReviews && (
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                      {buildingReviews.map((r) => (
                        <View key={r.id} style={styles.reviewItem}>
                          <View style={styles.reviewHeader}>
                            <Text style={styles.reviewUser}>{r.userName}</Text>
                            <View style={{ flexDirection: "row" }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons
                                  key={s}
                                  name={s <= r.rating ? "star" : "star-outline"}
                                  size={12}
                                  color="#F59E0B"
                                />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.reviewComment}>{r.comment}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ═══ MAP CONTROLS ═══ */}
          <View style={[styles.controls, routeInfo && { bottom: 250 }]}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={zoomIn}>
              <Ionicons name="add" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} onPress={zoomOut}>
              <Ionicons name="remove" size={22} color="#333" />
            </TouchableOpacity>
            <View style={{ height: 10 }} />
            <TouchableOpacity style={styles.ctrlBtn} onPress={centerUser}>
              <Ionicons name="locate" size={20} color="#4285F4" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.ctrlBtn,
                isTracking && { backgroundColor: "#4285F4" },
              ]}
              onPress={toggleTracking}
            >
              <Ionicons
                name={isTracking ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={isTracking ? "#fff" : "#4285F4"}
              />
            </TouchableOpacity>
          </View>

          {/* ═══ TRACKING BAR ═══ */}
          {isTracking && !routeInfo && (
            <View style={styles.trackingBar}>
              <View style={styles.trackingDot} />
              <Text style={styles.trackingText}>
                Live Tracking • 2s updates
              </Text>
              <TouchableOpacity onPress={toggleTracking}>
                <Text style={styles.trackingStop}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAVIGATION MODE STYLES
// ══════════════════════════════════════════════════════════════════════════════

const navStyles = StyleSheet.create({
  // Direction banner
  topBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  maneuverBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  bannerInstruction: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 22,
  },
  bannerStreet: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 2,
  },
  optionsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  // Next step
  nextStepBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 122 : 102,
    left: 0,
    right: 0,
    zIndex: 99,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16213e",
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 8,
  },
  nextLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  nextText: {
    fontSize: 13,
    color: "#bbb",
    flex: 1,
  },

  // Options menu
  optionsMenu: {
    position: "absolute",
    top: Platform.OS === "ios" ? 120 : 100,
    right: 16,
    zIndex: 200,
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 8,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    minWidth: 200,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderRadius: 10,
  },
  optionText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },

  // Step navigator
  stepNav: {
    position: "absolute",
    top: Platform.OS === "ios" ? 146 : 126,
    alignSelf: "center",
    zIndex: 90,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,26,46,0.85)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 6,
  },
  stepNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  stepCounter: {
    fontSize: 12,
    color: "#ccc",
    fontWeight: "600",
    paddingHorizontal: 8,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bottomInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bottomTime: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4FC3F7",
  },
  bottomDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#333",
  },
  bottomDist: {
    fontSize: 15,
    color: "#aaa",
    fontWeight: "600",
  },
  bottomEta: {
    fontSize: 13,
    color: "#888",
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F44336",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 6,
  },
  exitText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },

  // Full steps overlay
  stepsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 300,
    backgroundColor: "#0f0f23",
    paddingTop: Platform.OS === "ios" ? 54 : 34,
  },
  stepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  stepsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  stepsSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#1a1a2e",
  },
  stepsSubText: {
    fontSize: 14,
    color: "#aaa",
    fontWeight: "500",
  },
  stepsList: {
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
    gap: 12,
  },
  stepRowActive: {
    backgroundColor: "rgba(79,195,247,0.12)",
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepInstruction: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    lineHeight: 20,
  },
  stepStreet: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  stepDist: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// NORMAL MODE STYLES
// ══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // User
  userDot: { alignItems: "center", justifyContent: "center" },
  userDotRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  userDotRingNav: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4FC3F7",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userDotCenter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4285F4",
  },
  userDotCenterNav: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  userPulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(66,133,244,0.15)",
  },

  // Markers
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  markerSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    transform: [{ scale: 1.3 }],
  },
  routeMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },

  // Top bar
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    left: 14,
    right: 14,
    zIndex: 100,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: "#333" },
  directionsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EBF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  quickResults: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 6,
    maxHeight: 280,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Directions panel
  directionsPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 52 : 32,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dirHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  backBtn: { padding: 8, marginTop: 8 },
  dirFields: { flex: 1, marginLeft: 4 },
  dirFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dirDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  dirInput: { flex: 1, fontSize: 15, color: "#333", paddingVertical: 4 },
  dirDivider: { height: 1, backgroundColor: "#eee", marginLeft: 30 },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  // Travel modes (Google Maps tab style)
  travelModes: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    gap: 2,
  },
  modeTabActive: {
    backgroundColor: "#EBF3FF",
    borderWidth: 1.5,
    borderColor: "#4285F4",
  },
  modeLabel: { fontSize: 11, color: "#666", fontWeight: "500" },
  modeLabelActive: { color: "#4285F4", fontWeight: "700" },
  modeTime: { fontSize: 10, color: "#999", fontWeight: "500" },
  modeTimeActive: { color: "#4285F4" },

  // Go button
  goRow: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  goBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  goBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Search results
  dirResults: {
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  resultDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultName: { fontSize: 14, fontWeight: "500", color: "#333" },
  resultAddr: { fontSize: 12, color: "#888", marginTop: 1 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  loadingText: { color: "#666", fontSize: 13 },

  // Route overview bottom sheet
  routeSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: "65%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 8,
  },
  routeSummary: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  routeTimeWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  routeTimeText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a73e8",
  },
  routeDistText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  routeEtaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  routeEtaText: {
    fontSize: 13,
    color: "#666",
  },

  // Route action buttons
  routeActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a73e8",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    gap: 8,
    elevation: 4,
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#f5f8ff",
    gap: 2,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4285F4",
  },

  // Steps preview (in overview sheet)
  stepsPreview: {
    maxHeight: 220,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  stepsPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  stepsPreviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  previewStepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f8f8",
    gap: 12,
  },
  previewStepIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  previewStepText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    lineHeight: 18,
  },
  previewStepStreet: {
    fontSize: 11,
    color: "#888",
    marginTop: 1,
  },
  previewStepDist: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },

  // Building card
  card: {
    position: "absolute",
    bottom: 90,
    left: 14,
    right: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 12,
  },
  cardDesc: { fontSize: 13, color: "#666", marginLeft: 12, marginTop: 2 },
  cardActions: { flexDirection: "row", marginTop: 14, gap: 10 },
  cardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    gap: 6,
  },
  cardBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Reviews
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    marginTop: 4,
    gap: 2,
  },
  ratingText: { fontSize: 12, color: "#666", marginLeft: 4 },
  reviewForm: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
  },
  reviewFormTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  starPicker: { flexDirection: "row", gap: 6, marginBottom: 10 },
  reviewInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 60,
    textAlignVertical: "top",
  },
  reviewSubmitBtn: {
    backgroundColor: "#4285F4",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  reviewSubmitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  reviewsList: { marginTop: 10 },
  reviewsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  reviewsToggleText: { fontSize: 13, fontWeight: "600", color: "#4285F4" },
  reviewItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewUser: { fontSize: 13, fontWeight: "600", color: "#333" },
  reviewComment: { fontSize: 13, color: "#555", lineHeight: 18 },

  // Controls
  controls: { position: "absolute", right: 14, bottom: 120, gap: 8 },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  // Tracking
  trackingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 10,
  },
  trackingText: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "500" },
  trackingStop: { color: "#fff", fontSize: 13, fontWeight: "bold" },
});
