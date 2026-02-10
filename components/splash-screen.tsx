import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const decorOpacity = useRef(new Animated.Value(0)).current;
  const compassRotation = useRef(new Animated.Value(0)).current;
  const pinBounce = useRef(new Animated.Value(-20)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  // Campus illustration elements animation
  const buildingOpacity = useRef(new Animated.Value(0)).current;
  const pathOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered animation sequence
    Animated.sequence([
      // 1. Fade in background decorations
      Animated.timing(decorOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      // 2. Logo entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 3. Title slide up and fade in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),

      // 4. Campus elements and subtitle
      Animated.parallel([
        Animated.timing(buildingOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pathOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 5. Compass rotation + pin bounce
      Animated.parallel([
        Animated.timing(compassRotation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(pinBounce, {
          toValue: 0,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),

      // 6. Hold for a moment
      Animated.delay(800),

      // 7. Fade out everything
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const compassSpin = compassRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      {/* Background gradient circles */}
      <Animated.View style={[styles.bgCircle1, { opacity: decorOpacity }]} />
      <Animated.View style={[styles.bgCircle2, { opacity: decorOpacity }]} />
      <Animated.View style={[styles.bgCircle3, { opacity: decorOpacity }]} />

      {/* Campus illustration - buildings */}
      <Animated.View
        style={[styles.campusContainer, { opacity: buildingOpacity }]}
      >
        {/* Building 1 - tall */}
        <View style={styles.building1}>
          <View style={styles.buildingRoof1} />
          <View style={styles.buildingBody1}>
            <View style={styles.windowRow}>
              <View style={styles.window} />
              <View style={styles.window} />
            </View>
            <View style={styles.windowRow}>
              <View style={styles.window} />
              <View style={styles.window} />
            </View>
            <View style={styles.windowRow}>
              <View style={styles.window} />
              <View style={styles.window} />
            </View>
          </View>
        </View>

        {/* Building 2 - medium */}
        <View style={styles.building2}>
          <View style={styles.buildingRoof2} />
          <View style={styles.buildingBody2}>
            <View style={styles.windowRow}>
              <View style={styles.windowSmall} />
              <View style={styles.windowSmall} />
              <View style={styles.windowSmall} />
            </View>
            <View style={styles.windowRow}>
              <View style={styles.windowSmall} />
              <View style={styles.windowSmall} />
              <View style={styles.windowSmall} />
            </View>
          </View>
        </View>

        {/* Building 3 - small */}
        <View style={styles.building3}>
          <View style={styles.buildingRoof3} />
          <View style={styles.buildingBody3}>
            <View style={styles.windowRow}>
              <View style={styles.windowSmall} />
              <View style={styles.windowSmall} />
            </View>
          </View>
        </View>

        {/* Trees */}
        <View style={[styles.tree, { left: 20 }]}>
          <View style={styles.treeTop} />
          <View style={styles.treeTrunk} />
        </View>
        <View style={[styles.tree, { left: 200 }]}>
          <View style={styles.treeTop} />
          <View style={styles.treeTrunk} />
        </View>
        <View style={[styles.tree, { left: 280 }]}>
          <View style={[styles.treeTop, { width: 20, height: 20 }]} />
          <View style={styles.treeTrunk} />
        </View>
      </Animated.View>

      {/* Pathway */}
      <Animated.View style={[styles.pathway, { opacity: pathOpacity }]}>
        <View style={styles.pathLine} />
        <View style={styles.pathDots}>
          <View style={styles.pathDot} />
          <View style={styles.pathDot} />
          <View style={styles.pathDot} />
          <View style={styles.pathDot} />
          <View style={styles.pathDot} />
        </View>
      </Animated.View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Location Pin */}
        <Animated.View
          style={[
            styles.pinContainer,
            {
              opacity: decorOpacity,
              transform: [{ translateY: pinBounce }],
            },
          ]}
        >
          <View style={styles.locationPin}>
            <View style={styles.pinHead}>
              <View style={styles.pinDot} />
            </View>
            <View style={styles.pinTail} />
          </View>
        </Animated.View>

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>Wayfinder</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        {/* Compass Icon */}
        <Animated.View
          style={[
            styles.compassContainer,
            {
              opacity: subtitleOpacity,
              transform: [{ rotate: compassSpin }],
            },
          ]}
        >
          <View style={styles.compass}>
            <View style={styles.compassRing}>
              <View style={styles.compassNeedle} />
              <View style={styles.compassNeedleSouth} />
              <View style={styles.compassCenter} />
              {/* Cardinal directions */}
              <Text style={[styles.compassDir, styles.compassN]}>N</Text>
              <Text style={[styles.compassDir, styles.compassS]}>S</Text>
              <Text style={[styles.compassDir, styles.compassE]}>E</Text>
              <Text style={[styles.compassDir, styles.compassW]}>W</Text>
            </View>
          </View>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={styles.subtitle}>Navigate Your Campus</Text>
          <Text style={styles.tagline}>Find your way with ease</Text>
        </Animated.View>
      </View>

      {/* Bottom decorative greenery */}
      <Animated.View
        style={[styles.bottomGreenery, { opacity: buildingOpacity }]}
      >
        <View style={styles.grassRow}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.grassBlade,
                {
                  height: 8 + Math.random() * 12,
                  marginHorizontal: 2 + Math.random() * 4,
                  backgroundColor:
                    i % 3 === 0
                      ? "#68B984"
                      : i % 3 === 1
                        ? "#4E9F6D"
                        : "#7BC97F",
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
  },

  // Background circles
  bgCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    top: -50,
    right: -80,
  },
  bgCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59, 130, 246, 0.04)",
    bottom: 100,
    left: -60,
  },
  bgCircle3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(96, 165, 250, 0.06)",
    top: height * 0.35,
    right: -30,
  },

  // Campus illustration
  campusContainer: {
    position: "absolute",
    bottom: height * 0.18,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 30,
    width: "100%",
    justifyContent: "center",
    gap: 12,
  },

  building1: {
    alignItems: "center",
  },
  buildingRoof1: {
    width: 60,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 15,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#93C5FD",
  },
  buildingBody1: {
    width: 50,
    height: 70,
    backgroundColor: "#BFDBFE",
    borderRadius: 2,
    padding: 4,
    gap: 5,
  },

  building2: {
    alignItems: "center",
  },
  buildingRoof2: {
    width: 70,
    height: 0,
    borderLeftWidth: 35,
    borderRightWidth: 35,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#93C5FD",
  },
  buildingBody2: {
    width: 60,
    height: 50,
    backgroundColor: "#BFDBFE",
    borderRadius: 2,
    padding: 4,
    gap: 5,
  },

  building3: {
    alignItems: "center",
  },
  buildingRoof3: {
    width: 50,
    height: 0,
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#93C5FD",
  },
  buildingBody3: {
    width: 40,
    height: 35,
    backgroundColor: "#BFDBFE",
    borderRadius: 2,
    padding: 4,
    gap: 5,
  },

  windowRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  window: {
    width: 10,
    height: 10,
    backgroundColor: "#DBEAFE",
    borderRadius: 1,
    borderWidth: 0.5,
    borderColor: "#93C5FD",
  },
  windowSmall: {
    width: 8,
    height: 8,
    backgroundColor: "#DBEAFE",
    borderRadius: 1,
    borderWidth: 0.5,
    borderColor: "#93C5FD",
  },

  // Trees
  tree: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
  },
  treeTop: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#86EFAC",
  },
  treeTrunk: {
    width: 4,
    height: 10,
    backgroundColor: "#A3825C",
    borderRadius: 1,
  },

  // Pathway
  pathway: {
    position: "absolute",
    bottom: height * 0.15,
    width: width * 0.7,
    alignItems: "center",
  },
  pathLine: {
    width: "100%",
    height: 3,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
  },
  pathDots: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    marginTop: -5,
  },
  pathDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#93C5FD",
  },

  // Content
  content: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -60,
  },

  // Location Pin
  pinContainer: {
    position: "absolute",
    top: -100,
    right: -80,
  },
  locationPin: {
    alignItems: "center",
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#3B82F6",
    marginTop: -2,
  },

  // Logo
  logoContainer: {
    marginBottom: 20,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 28,
  },

  // Title
  titleContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#1E3A5F",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: "#3B82F6",
    borderRadius: 2,
    marginTop: 8,
  },

  // Compass
  compassContainer: {
    marginBottom: 20,
  },
  compass: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  compassRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  compassNeedle: {
    position: "absolute",
    top: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#EF4444",
  },
  compassNeedleSouth: {
    position: "absolute",
    bottom: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#93C5FD",
  },
  compassCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1E3A5F",
  },
  compassDir: {
    position: "absolute",
    fontSize: 7,
    fontWeight: "700",
    color: "#3B82F6",
  },
  compassN: {
    top: 1,
  },
  compassS: {
    bottom: 1,
  },
  compassE: {
    right: 3,
  },
  compassW: {
    left: 3,
  },

  // Subtitle
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
    letterSpacing: 1,
    textAlign: "center",
  },
  tagline: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // Bottom greenery
  bottomGreenery: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingBottom: 40,
    alignItems: "center",
  },
  grassRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  grassBlade: {
    width: 3,
    borderRadius: 2,
  },
});
