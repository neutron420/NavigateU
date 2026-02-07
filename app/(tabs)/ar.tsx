import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Lazy-load native modules so the screen doesn't crash if they're missing
let CameraViewComponent: any = null;
let MagnetometerModule: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cam = require("expo-camera");
  CameraViewComponent = cam.CameraView;
} catch {
  // expo-camera native module not available (needs dev client rebuild)
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sensors = require("expo-sensors");
  MagnetometerModule = sensors.Magnetometer;
} catch {
  // expo-sensors native module not available
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Campus buildings (same as index.tsx) ─────────────────────────────────────
interface Building {
  id: string;
  name: string;
  short: string;
  coord: [number, number]; // [lng, lat]
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const BUILDINGS: Building[] = [
  {
    id: "main",
    name: "CV Raman College of Engineering",
    short: "CGU Main",
    coord: [85.7349, 20.2194],
    icon: "school-outline",
    color: "#4285F4",
  },
  {
    id: "mba",
    name: "Department of MBA",
    short: "MBA Dept",
    coord: [85.7295, 20.2275],
    icon: "school-outline",
    color: "#4285F4",
  },
  {
    id: "playground",
    name: "CV Raman Play Ground",
    short: "Play Ground",
    coord: [85.734, 20.2305],
    icon: "football-outline",
    color: "#F44336",
  },
  {
    id: "fountain",
    name: "CGU Fountain",
    short: "Fountain",
    coord: [85.7358, 20.2248],
    icon: "water-outline",
    color: "#FFD700",
  },
  {
    id: "bh2",
    name: "New Boys Hostel 2",
    short: "Boys Hostel 2",
    coord: [85.742, 20.227],
    icon: "bed-outline",
    color: "#FF9800",
  },
  {
    id: "bh1",
    name: "Boys Apartment Hostel",
    short: "Boys Hostel 1",
    coord: [85.743, 20.221],
    icon: "bed-outline",
    color: "#FF9800",
  },
  {
    id: "nursery",
    name: "CGU Plant Nursery",
    short: "Nursery",
    coord: [85.744, 20.2175],
    icon: "leaf-outline",
    color: "#8BC34A",
  },
  {
    id: "admin",
    name: "Administrative Block",
    short: "Admin",
    coord: [85.735, 20.222],
    icon: "business-outline",
    color: "#9C27B0",
  },
  {
    id: "lib",
    name: "Central Library",
    short: "Library",
    coord: [85.736, 20.223],
    icon: "library-outline",
    color: "#00BCD4",
  },
  {
    id: "canteen",
    name: "Main Canteen",
    short: "Canteen",
    coord: [85.737, 20.22],
    icon: "cafe-outline",
    color: "#4CAF50",
  },
  {
    id: "gh",
    name: "Girls Hostel",
    short: "GH",
    coord: [85.73, 20.219],
    icon: "bed-outline",
    color: "#FF9800",
  },
];

// ── Geo helpers ──────────────────────────────────────────────────────────────
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingTo(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ARNavigationScreen() {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [heading, setHeading] = useState(0);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );
  const arrowAnim = useRef(new Animated.Value(0)).current;

  // ── Permissions & Location ──
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      // Watch position
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 2,
        },
        (l) => setUserLoc({ lat: l.coords.latitude, lng: l.coords.longitude }),
      );
    })();
  }, []);

  // ── Compass ──
  useEffect(() => {
    if (!MagnetometerModule) return;
    MagnetometerModule.setUpdateInterval(100);
    const sub = MagnetometerModule.addListener((data: any) => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading((angle + 360) % 360);
    });
    return () => sub.remove();
  }, []);

  // ── Arrow pulse anim ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [arrowAnim]);

  // If native modules are not available, show rebuild message
  if (!CameraViewComponent) {
    return (
      <View style={styles.center}>
        <Ionicons name="build-outline" size={64} color="#FF9800" />
        <Text style={styles.permText}>AR requires a new development build</Text>
        <Text
          style={[
            styles.waitingText,
            { textAlign: "center", paddingHorizontal: 32 },
          ]}
        >
          {
            'Run "npx expo run:android" or "npx expo run:ios" to rebuild with camera support.'
          }
        </Text>
      </View>
    );
  }

  // ── Compute AR overlays ──
  const arOverlays: {
    building: Building;
    distance: number;
    screenX: number;
    screenY: number;
    visible: boolean;
  }[] = [];

  if (userLoc) {
    const FOV = 60; // camera horizontal FOV in degrees

    for (const b of BUILDINGS) {
      const dist = haversineDistance(
        userLoc.lat,
        userLoc.lng,
        b.coord[1],
        b.coord[0],
      );
      if (dist > 5000) continue; // skip anything > 5km

      const bearing = bearingTo(
        userLoc.lat,
        userLoc.lng,
        b.coord[1],
        b.coord[0],
      );
      let delta = bearing - heading;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const visible = Math.abs(delta) <= FOV / 2 + 10;
      const screenX = SCREEN_W / 2 + (delta / (FOV / 2)) * (SCREEN_W / 2);

      // Closer buildings appear lower on screen
      const maxDist = 2000;
      const normalized = Math.min(dist / maxDist, 1);
      const screenY = SCREEN_H * 0.3 + normalized * SCREEN_H * 0.25;

      arOverlays.push({
        building: b,
        distance: dist,
        screenX,
        screenY,
        visible,
      });
    }

    // Sort by distance (far → near so near renders on top)
    arOverlays.sort((a, b) => b.distance - a.distance);
  }

  // Selected building nav info
  const navInfo =
    selectedBuilding && userLoc
      ? {
          distance: haversineDistance(
            userLoc.lat,
            userLoc.lng,
            selectedBuilding.coord[1],
            selectedBuilding.coord[0],
          ),
          bearing: bearingTo(
            userLoc.lat,
            userLoc.lng,
            selectedBuilding.coord[1],
            selectedBuilding.coord[0],
          ),
        }
      : null;

  const arrowRotation = navInfo ? `${navInfo.bearing - heading}deg` : "0deg";

  const arrowScale = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  return (
    <View style={styles.container}>
      {/* Camera Background — no children allowed */}
      <CameraViewComponent style={StyleSheet.absoluteFill} facing="back" />

      {/* AR Overlays (absolute positioned on top of camera) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {arOverlays.map(({ building, distance, screenX, screenY, visible }) =>
          visible ? (
            <TouchableOpacity
              key={building.id}
              style={[
                styles.arMarker,
                {
                  left: screenX - 40,
                  top: screenY - 20,
                  opacity: Math.max(0.4, 1 - distance / 2000),
                },
              ]}
              onPress={() => setSelectedBuilding(building)}
            >
              <View
                style={[styles.arBubble, { backgroundColor: building.color }]}
              >
                <Ionicons name={building.icon} size={18} color="#fff" />
              </View>
              <View style={styles.arLabel}>
                <Text style={styles.arName} numberOfLines={1}>
                  {building.short}
                </Text>
                <Text style={styles.arDist}>{formatDist(distance)}</Text>
              </View>
              {/* Line to ground */}
              <View
                style={[styles.arLine, { backgroundColor: building.color }]}
              />
            </TouchableOpacity>
          ) : null,
        )}

        {/* Navigation Arrow (when a building is selected) */}
        {selectedBuilding && navInfo && (
          <View style={styles.navArrowWrap}>
            <Animated.View
              style={[
                styles.navArrow,
                {
                  transform: [{ rotate: arrowRotation }, { scale: arrowScale }],
                },
              ]}
            >
              <Ionicons name="navigate" size={48} color="#4FC3F7" />
            </Animated.View>
            <Text style={styles.navArrowDist}>
              {formatDist(navInfo.distance)}
            </Text>
          </View>
        )}
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <Ionicons name="compass-outline" size={20} color="#4FC3F7" />
          <Text style={styles.topBarTitle}>AR Navigation</Text>
          <Text style={styles.headingText}>{Math.round(heading)}°</Text>
        </View>
        {!userLoc && <Text style={styles.waitingText}>Getting GPS fix...</Text>}
      </View>

      {/* Bottom Building Selector */}
      <View style={styles.bottomPanel}>
        {selectedBuilding ? (
          <View style={styles.selectedCard}>
            <View style={styles.selectedRow}>
              <View
                style={[
                  styles.selectedIcon,
                  { backgroundColor: selectedBuilding.color },
                ]}
              >
                <Ionicons name={selectedBuilding.icon} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName}>{selectedBuilding.name}</Text>
                {navInfo && (
                  <Text style={styles.selectedDist}>
                    {formatDist(navInfo.distance)} · Point your phone to see the
                    arrow
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedBuilding(null)}>
                <Ionicons name="close-circle" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.panelTitle}>Select a destination</Text>
            <View style={styles.buildingGrid}>
              {BUILDINGS.map((b) => {
                const dist = userLoc
                  ? haversineDistance(
                      userLoc.lat,
                      userLoc.lng,
                      b.coord[1],
                      b.coord[0],
                    )
                  : null;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.buildingChip}
                    onPress={() => setSelectedBuilding(b)}
                  >
                    <View
                      style={[styles.chipIcon, { backgroundColor: b.color }]}
                    >
                      <Ionicons name={b.icon} size={14} color="#fff" />
                    </View>
                    <Text style={styles.chipName} numberOfLines={1}>
                      {b.short}
                    </Text>
                    {dist !== null && (
                      <Text style={styles.chipDist}>{formatDist(dist)}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Compass ring */}
      <View style={styles.compassWrap}>
        <View
          style={[
            styles.compassRing,
            { transform: [{ rotate: `-${heading}deg` }] },
          ]}
        >
          <View style={styles.compassNorth}>
            <Text style={styles.compassN}>N</Text>
          </View>
        </View>
        <View style={styles.compassDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
    gap: 16,
  },
  permText: { color: "#aaa", fontSize: 16 },
  permBtn: {
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // AR Markers
  arMarker: {
    position: "absolute",
    alignItems: "center",
    width: 80,
  },
  arBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  arLabel: {
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    alignItems: "center",
  },
  arName: { fontSize: 11, fontWeight: "700", color: "#fff" },
  arDist: { fontSize: 9, color: "#4FC3F7" },
  arLine: {
    width: 2,
    height: 30,
    marginTop: 2,
    borderRadius: 1,
    opacity: 0.5,
  },

  // Nav Arrow
  navArrowWrap: {
    position: "absolute",
    top: SCREEN_H * 0.35,
    alignSelf: "center",
    alignItems: "center",
    left: SCREEN_W / 2 - 40,
  },
  navArrow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4FC3F7",
  },
  navArrowDist: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#4FC3F7",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  headingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4FC3F7",
  },
  waitingText: {
    fontSize: 12,
    color: "#FF9800",
    marginTop: 4,
  },

  // Bottom panel
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15,15,35,0.92)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    maxHeight: SCREEN_H * 0.35,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#aaa",
    marginBottom: 10,
  },
  buildingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  buildingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipName: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    maxWidth: 80,
  },
  chipDist: {
    fontSize: 10,
    color: "#888",
  },

  // Selected card
  selectedCard: {
    paddingVertical: 4,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  selectedDist: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },

  // Compass
  compassWrap: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 82,
    right: 16,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  compassRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  compassNorth: {
    marginTop: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
  },
  compassN: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fff",
  },
  compassDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
});
