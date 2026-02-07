import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { getCurrentUser } from "@/services/auth";
import {
    UserProfile,
    addFriend,
    getFriendProfiles,
    getUserProfile,
    removeFriend,
    searchUsersByEmail,
} from "@/services/firestore";
import {
    LiveLocation,
    removeMyLocation,
    updateMyLocation,
    watchFriendsLocations,
} from "@/services/realtime";

// ══════════════════════════════════════════════════════════════════════════════
export default function FriendsScreen() {
  const [tab, setTab] = useState<"friends" | "add">("friends");
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendLocations, setFriendLocations] = useState<
    Record<string, LiveLocation>
  >({});
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add friend
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const friendUnsubs = useRef<(() => void)[]>([]);

  // ── Load profile & friends ──
  useEffect(() => {
    loadData();
    return () => {
      friendUnsubs.current.forEach((u) => u());
      if (locationSub.current) locationSub.current.remove();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const profile = await getUserProfile(user.uid);
    setMyProfile(profile);

    if (profile?.friendIds?.length) {
      const friendProfiles = await getFriendProfiles(profile.friendIds);
      setFriends(friendProfiles);

      // Watch live locations
      friendUnsubs.current.forEach((u) => u());
      friendUnsubs.current = watchFriendsLocations(profile.friendIds, (locs) =>
        setFriendLocations(locs),
      );
    }
    setLoading(false);
  };

  // ── Share / Stop sharing my location ──
  const toggleSharing = async () => {
    const user = getCurrentUser();
    if (!user) return;

    if (isSharing) {
      if (locationSub.current) {
        locationSub.current.remove();
        locationSub.current = null;
      }
      await removeMyLocation(user.uid);
      setIsSharing(false);
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Enable location to share with friends.",
        );
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        async (loc) => {
          await updateMyLocation(user.uid, {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? undefined,
            speed: loc.coords.speed ?? undefined,
            displayName: myProfile?.displayName || user.email || "User",
          });
        },
      );
      locationSub.current = sub;
      setIsSharing(true);
    }
  };

  // ── Search users ──
  const handleSearch = async () => {
    if (searchEmail.length < 3) {
      Alert.alert("Enter email", "Type at least 3 characters to search.");
      return;
    }
    setIsSearching(true);
    const results = await searchUsersByEmail(searchEmail.toLowerCase());
    const user = getCurrentUser();
    // Filter out self and existing friends
    const filtered = results.filter(
      (r) => r.uid !== user?.uid && !myProfile?.friendIds?.includes(r.uid),
    );
    setSearchResults(filtered);
    setIsSearching(false);
  };

  // ── Add friend ──
  const handleAddFriend = async (friendUid: string) => {
    const user = getCurrentUser();
    if (!user) return;
    await addFriend(user.uid, friendUid);
    // Also add reverse friendship
    await addFriend(friendUid, user.uid);
    Alert.alert("Friend added!", "They can now see your shared location.");
    setSearchResults((prev) => prev.filter((r) => r.uid !== friendUid));
    loadData();
  };

  // ── Remove friend ──
  const handleRemoveFriend = async (friendUid: string) => {
    Alert.alert("Remove friend?", "They won't see your location anymore.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const user = getCurrentUser();
          if (!user) return;
          await removeFriend(user.uid, friendUid);
          await removeFriend(friendUid, user.uid);
          loadData();
        },
      },
    ]);
  };

  // ── Render ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity
          style={[styles.shareBtn, isSharing && styles.shareBtnActive]}
          onPress={toggleSharing}
        >
          <Ionicons
            name={isSharing ? "radio-button-on" : "location-outline"}
            size={16}
            color={isSharing ? "#fff" : "#3B82F6"}
          />
          <Text
            style={[
              styles.shareBtnText,
              isSharing && styles.shareBtnTextActive,
            ]}
          >
            {isSharing ? "Sharing Live" : "Share Location"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "friends" && styles.tabActive]}
          onPress={() => setTab("friends")}
        >
          <Text
            style={[styles.tabText, tab === "friends" && styles.tabTextActive]}
          >
            My Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "add" && styles.tabActive]}
          onPress={() => setTab("add")}
        >
          <Text style={[styles.tabText, tab === "add" && styles.tabTextActive]}>
            Add Friend
          </Text>
        </TouchableOpacity>
      </View>

      {/* Friends List */}
      {tab === "friends" ? (
        friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>
              Add friends to share live locations on campus
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setTab("add")}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add Friend</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const loc = friendLocations[item.uid];
              const isOnline = loc && Date.now() - loc.timestamp < 60000;
              return (
                <View style={styles.friendCard}>
                  <View style={styles.friendRow}>
                    <View style={styles.avatarWrap}>
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: isOnline ? "#4CAF50" : "#ccc" },
                        ]}
                      >
                        <Text style={styles.avatarText}>
                          {(item.displayName || "?")[0].toUpperCase()}
                        </Text>
                      </View>
                      {isOnline && <View style={styles.onlineDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>
                        {item.displayName || item.email}
                      </Text>
                      <Text style={styles.friendRole}>
                        {item.role}{" "}
                        {item.department ? `· ${item.department}` : ""}
                      </Text>
                      {isOnline ? (
                        <View style={styles.liveRow}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveText}>
                            Live now
                            {loc.speed && loc.speed > 0.5
                              ? ` · ${(loc.speed * 3.6).toFixed(0)} km/h`
                              : ""}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.offlineText}>Offline</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveFriend(item.uid)}
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={20}
                        color="#999"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : (
        /* Add Friend Tab */
        <View style={styles.addPanel}>
          <Text style={styles.addTitle}>Search by email</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="friend@example.com"
              placeholderTextColor="#999"
              value={searchEmail}
              onChangeText={setSearchEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.uid}
              style={{ marginTop: 12 }}
              renderItem={({ item }) => (
                <View style={styles.searchResultCard}>
                  <View style={[styles.avatar, { backgroundColor: "#3B82F6" }]}>
                    <Text style={styles.avatarText}>
                      {(item.displayName || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.friendName}>
                      {item.displayName || "User"}
                    </Text>
                    <Text style={styles.friendRole}>
                      {item.email} · {item.role}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addFriendBtn}
                    onPress={() => handleAddFriend(item.uid)}
                  >
                    <Ionicons name="person-add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {searchResults.length === 0 &&
            searchEmail.length > 0 &&
            !isSearching && (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={32} color="#ccc" />
                <Text style={styles.noResultsText}>
                  No users found. Try a different email.
                </Text>
              </View>
            )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFCFF" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFCFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 58 : 40,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a2e",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#EBF3FF",
    gap: 6,
  },
  shareBtnActive: {
    backgroundColor: "#4CAF50",
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
  },
  shareBtnTextActive: {
    color: "#fff",
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  tabActive: {
    backgroundColor: "#3B82F6",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },

  // Friend card
  friendCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  friendName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  friendRole: {
    fontSize: 12,
    color: "#888",
    marginTop: 1,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
  },
  liveText: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "600",
  },
  offlineText: {
    fontSize: 11,
    color: "#ccc",
    marginTop: 4,
  },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // Add panel
  addPanel: {
    flex: 1,
    padding: 20,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  addFriendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  noResultsText: {
    fontSize: 13,
    color: "#999",
  },
});
