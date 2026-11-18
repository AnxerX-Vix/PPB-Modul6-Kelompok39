import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;

const SPLASH_DURATION_MS = 2500;
const FADE_OUT_MS = 320;

export function SplashScreen({ onFinish }) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.86)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enterAnim = Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        friction: 7,
        tension: 48,
        useNativeDriver: true,
      }),
    ]);

    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.28,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.35,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const progressAnim = Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION_MS - FADE_OUT_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });

    enterAnim.start();
    pulseLoop.start();
    progressAnim.start();

    let isMounted = true;
    const exitTimer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (isMounted && onFinish) {
          onFinish();
        }
      });
    }, SPLASH_DURATION_MS - FADE_OUT_MS);

    return () => {
      isMounted = false;
      clearTimeout(exitTimer);
      enterAnim.stop();
      pulseLoop.stop();
      progressAnim.stop();
    };
  }, [
    containerOpacity,
    contentOpacity,
    contentScale,
    pulseOpacity,
    pulseScale,
    progress,
    onFinish,
  ]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["8%", "100%"],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      accessible
      accessibilityLabel="LiveTemp splash screen, memuat aplikasi"
    >
      <View style={styles.ambientTop} pointerEvents="none" />
      <View style={styles.ambientBottom} pointerEvents="none" />

      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <View style={styles.emblemStage}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
          <View style={styles.emblemOuter}>
            <View style={styles.emblemInner}>
              <Ionicons name="thermometer" size={44} color={color.onPrimary} />
            </View>
            <View style={styles.iotBadge}>
              <Ionicons name="radio-outline" size={16} color={color.primary} />
            </View>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>LiveTemp</Text>
          <Text style={styles.subtitle}>
            Monitoring Suhu Real-Time - Kelompok 39 (Shift 06)
          </Text>
        </View>

        <View style={styles.loaderWrap}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: progressWidth }]}
            />
          </View>
          <View style={styles.loaderRow}>
            <Ionicons name="pulse" size={14} color={color.primary} />
            <Text style={styles.loaderText}>Menyiapkan layanan IoT…</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.footerText}>
        Teknik Komputer · Universitas Diponegoro
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
    overflow: "hidden",
  },
  ambientTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  ambientBottom: {
    position: "absolute",
    bottom: -130,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(6, 182, 212, 0.09)",
  },
  centerContent: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: space.xl,
  },
  emblemStage: {
    width: 124,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: "#06B6D4",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  emblemOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadow.card,
  },
  emblemInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iotBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadow.card,
  },
  titleBlock: {
    alignItems: "center",
    gap: space.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: color.text,
    fontFamily: "monospace",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: color.text2,
    textAlign: "center",
    lineHeight: 20,
  },
  loaderWrap: {
    width: "100%",
    maxWidth: 220,
    alignItems: "center",
    gap: 10,
    marginTop: space.sm,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: color.primary,
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loaderText: {
    fontSize: 12,
    fontWeight: "500",
    color: color.text3,
  },
  footerText: {
    position: "absolute",
    bottom: 36,
    fontSize: 12,
    fontWeight: "500",
    color: color.text3,
    letterSpacing: 0.2,
  },
});
