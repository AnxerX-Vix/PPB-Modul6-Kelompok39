import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import {
  Atlas,
  Canvas,
  Circle,
  FilterMode,
  Group,
  MipmapMode,
  RadialGradient,
  Skia,
  rect,
  usePictureAsTexture,
  useRSXformBuffer,
  vec,
} from "react-native-skia";
import { useIsFocused } from "@react-navigation/native";
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;

const DOT_COUNT = 300;
const HOLE_RADIUS = 74;
const TILT = 0.38;
const TEX = 36;

// Palet warna per kondisi suhu untuk gradasi partikel & halo
const STATUS_THEMES = {
  normal: {
    stops: [
      [6, 182, 212], // cyan-500 (#06B6D4)
      [14, 165, 233], // sky-500 (#0EA5E9)
      [37, 99, 235], // blue-600 (#2563EB)
      [16, 185, 129], // emerald-500 (#10B981)
      [52, 211, 153], // emerald-400 (#34D399)
    ],
    glowInner: "rgba(6, 182, 212, 0.22)",
    glowMid: "rgba(16, 185, 129, 0.08)",
    ringPrimary: "#06B6D4",
    ringSecondary: "#10B981",
    baseSpeed: 0.19,
    pulseSpeed: 1.7,
  },
  near: {
    stops: [
      [251, 191, 36], // amber-400 (#FBBF24)
      [245, 158, 11], // amber-500 (#F59E0B)
      [234, 88, 12], // orange-600 (#EA580C)
      [251, 146, 60], // orange-400 (#FB923C)
    ],
    glowInner: "rgba(245, 158, 11, 0.22)",
    glowMid: "rgba(234, 88, 12, 0.08)",
    ringPrimary: "#F59E0B",
    ringSecondary: "#EA580C",
    baseSpeed: 0.24,
    pulseSpeed: 2.3,
  },
  over: {
    stops: [
      [249, 115, 22], // orange-500 (#F97316)
      [239, 68, 68], // red-500 (#EF4444)
      [220, 38, 38], // red-600 (#DC2626)
      [251, 113, 133], // rose-400 (#FB7185)
      [253, 186, 116], // orange-300 (#FDBA74)
    ],
    glowInner: "rgba(239, 68, 68, 0.26)",
    glowMid: "rgba(249, 115, 22, 0.10)",
    ringPrimary: "#EF4444",
    ringSecondary: "#F97316",
    baseSpeed: 0.32,
    pulseSpeed: 3.1,
  },
  idle: {
    stops: [
      [56, 189, 248], // sky-400 (#38BDF8)
      [99, 102, 241], // indigo-500 (#6366F1)
      [100, 116, 139], // slate-500 (#64748B)
    ],
    glowInner: "rgba(99, 102, 241, 0.16)",
    glowMid: "rgba(56, 189, 248, 0.06)",
    ringPrimary: "#6366F1",
    ringSecondary: "#38BDF8",
    baseSpeed: 0.15,
    pulseSpeed: 1.4,
  },
};

function toHex(n) {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

function samplePalette(stops, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const a = stops[idx];
  const b = stops[idx + 1];
  const r = a[0] + (b[0] - a[0]) * frac;
  const g = a[1] + (b[1] - a[1]) * frac;
  const bl = a[2] + (b[2] - a[2]) * frac;
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

// Fibonacci sphere dengan variasi ukuran partikel, fase denyut, dan kedalaman shell.
// Format tuple datar agar ramah serialisasi worklet:
// [x, y, z, sizeFactor, phase, shellRadius, colorT]
function buildSphereParticles(n) {
  const pts = new Array(n);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    // Variasi ukuran deterministik: campuran partikel halus & partikel aksen besar
    const hash = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const sizeFactor =
      i % 9 === 0
        ? 1.32 + hash * 0.25
        : i % 3 === 0
          ? 0.56 + hash * 0.24
          : 0.82 + hash * 0.36;

    // Variasi shell ringan untuk efek volume 3D berlapis
    const shellRadius =
      i % 7 === 0 ? 1.07 : i % 5 === 0 ? 0.87 : 0.98 + hash * 0.04;

    const phase = (theta % (Math.PI * 2)) + y * 1.8;

    // Nilai gradasi 0..1 berdasarkan lintang & bujur partikel
    const latT = (y + 1) / 2;
    const azT = (Math.sin(theta * 2) + 1) / 2;
    const colorT = Math.max(0, Math.min(1, latT * 0.65 + azT * 0.35));

    pts[i] = [x, y, z, sizeFactor, phase, shellRadius, colorT];
  }
  return pts;
}

const BASE_PTS = buildSphereParticles(DOT_COUNT);

// Proyeksi JS untuk frame awal sebelum pass worklet pertama
function projectAll(angle, pulse, swell, R, cx, cy) {
  const out = new Array(DOT_COUNT);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const tilt = TILT + Math.sin(angle * 0.45) * 0.14;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const roll = Math.cos(angle * 0.3) * 0.07;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const breath = 1 + 0.032 * Math.sin(pulse);

  for (let i = 0; i < DOT_COUNT; i++) {
    const p = BASE_PTS[i];
    const wave = 1 + 0.028 * Math.sin(pulse * 1.5 + p[4]);
    const rr = R * p[5] * breath * swell * wave;

    const x1 = p[0] * cosA + p[2] * sinA;
    const z1 = -p[0] * sinA + p[2] * cosA;
    const y1 = p[1] * cosT - z1 * sinT;
    const z2 = p[1] * sinT + z1 * cosT;

    const xr = x1 * cosR - y1 * sinR;
    const yr = x1 * sinR + y1 * cosR;

    const depth = (z2 + 1) / 2;
    const perspective = 2.35 / (2.35 - z2);
    const sx = cx + xr * rr * perspective;
    const sy = cy + yr * rr * perspective;

    const hx = sx - cx;
    const hy = sy - cy;
    const hidden = hx * hx + hy * hy < HOLE_RADIUS * HOLE_RADIUS;
    const pulseDot = 1 + 0.09 * Math.sin(pulse * 1.8 + p[4]);
    const sc = 0.21 * p[3] * (0.58 + 0.85 * depth) * swell * pulseDot;

    out[i] = hidden
      ? [0, 0, -10000, -10000]
      : [sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc];
  }
  return out;
}

export function TempOrb({
  status = "idle",
  tint = color.text,
  beatKey = 0,
  size = 200,
  dimmed = false,
}) {
  const reduceMotion = useReducedMotion();
  const focused = useIsFocused();

  const theme = STATUS_THEMES[status] ?? STATUS_THEMES.idle;

  const angleY = useSharedValue(0.6);
  const pulsePhase = useSharedValue(0);
  const spinBoost = useSharedValue(0);
  const intensity = useSharedValue(0);
  const dimSV = useSharedValue(dimmed ? 1 : 0);
  const baseSpeedSV = useSharedValue(theme.baseSpeed);
  const pulseSpeedSV = useSharedValue(theme.pulseSpeed);
  const firstBeat = useRef(true);

  const R = (size * 0.8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const centerVec = useMemo(() => vec(cx, cy), [cx, cy]);

  useEffect(() => {
    baseSpeedSV.set(theme.baseSpeed);
    pulseSpeedSV.set(theme.pulseSpeed);
  }, [theme.baseSpeed, theme.pulseSpeed, baseSpeedSV, pulseSpeedSV]);

  // Tekstur partikel bercahaya berlapis (outer glow + mid halo + inti terang)
  const dotPicture = useMemo(() => {
    try {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(rect(0, 0, TEX, TEX));
      const mid = TEX / 2;

      const outerPaint = Skia.Paint();
      outerPaint.setAntiAlias(true);
      outerPaint.setColor(Skia.Color("white"));
      outerPaint.setAlphaf(0.26);
      canvas.drawCircle(mid, mid, mid - 1, outerPaint);

      const midPaint = Skia.Paint();
      midPaint.setAntiAlias(true);
      midPaint.setColor(Skia.Color("white"));
      midPaint.setAlphaf(0.64);
      canvas.drawCircle(mid, mid, mid * 0.66, midPaint);

      const corePaint = Skia.Paint();
      corePaint.setAntiAlias(true);
      corePaint.setColor(Skia.Color("white"));
      canvas.drawCircle(mid, mid, mid * 0.44, corePaint);

      return recorder.finishRecordingAsPicture();
    } catch {
      return null;
    }
  }, []);

  const dotImg = usePictureAsTexture(dotPicture, { width: TEX, height: TEX });

  const sprites = useMemo(
    () => new Array(DOT_COUNT).fill(0).map(() => rect(0, 0, TEX, TEX)),
    []
  );

  const transforms = useRSXformBuffer(DOT_COUNT, (val, i) => {
    "worklet";
    const p = BASE_PTS[i];
    const a = angleY.value;
    const pulse = pulsePhase.value;

    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const tilt = TILT + Math.sin(a * 0.45) * 0.14;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const roll = Math.cos(a * 0.3) * 0.07;
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);

    const breath = 1 + 0.032 * Math.sin(pulse);
    const swell = 1 + 0.065 * intensity.value;
    const wave = 1 + 0.028 * Math.sin(pulse * 1.5 + p[4]);
    const rr = R * p[5] * breath * swell * wave;

    const x1 = p[0] * cosA + p[2] * sinA;
    const z1 = -p[0] * sinA + p[2] * cosA;
    const y1 = p[1] * cosT - z1 * sinT;
    const z2 = p[1] * sinT + z1 * cosT;

    const xr = x1 * cosR - y1 * sinR;
    const yr = x1 * sinR + y1 * cosR;

    const depth = (z2 + 1) / 2;
    const perspective = 2.35 / (2.35 - z2);
    const sx = cx + xr * rr * perspective;
    const sy = cy + yr * rr * perspective;

    const hx = sx - cx;
    const hy = sy - cy;
    if (hx * hx + hy * hy < HOLE_RADIUS * HOLE_RADIUS) {
      val.set(0, 0, -10000, -10000);
      return;
    }

    const pulseDot = 1 + 0.09 * Math.sin(pulse * 1.8 + p[4]);
    const sc = 0.21 * p[3] * (0.58 + 0.85 * depth) * swell * pulseDot;
    val.set(sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc);
  });

  // Inisialisasi frame pertama agar sphere langsung tampil rapi saat mount
  useEffect(() => {
    try {
      const initial = projectAll(0.6, 0, 1, R, cx, cy);
      transforms.value = transforms.value.map((slot, i) => {
        slot.set(initial[i][0], initial[i][1], initial[i][2], initial[i][3]);
        return slot;
      });
    } catch {
      // buffer write unsupported — mapper pass will fill it instead
    }
  }, [transforms, R, cx, cy]);

  useEffect(() => {
    dimSV.set(withTiming(dimmed ? 1 : 0, { duration: 400 }));
  }, [dimmed, dimSV]);

  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed || reduceMotion) return;
    intensity.set(0);
    intensity.set(
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.35, { duration: 190 }),
        withTiming(0.75, { duration: 130 }),
        withTiming(0, { duration: 340 })
      )
    );
    spinBoost.set(2.2);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unsupported — visual beat still plays
    }
  }, [beatKey, dimmed, reduceMotion, intensity, spinBoost]);

  const frame = useFrameCallback((info) => {
    "worklet";
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    spinBoost.value *= Math.pow(0.03, dt);
    angleY.value += dt * (baseSpeedSV.value + spinBoost.value);
    pulsePhase.value += dt * pulseSpeedSV.value;
  });

  useEffect(() => {
    frame.setActive(focused && !reduceMotion && !dimmed);
  }, [focused, reduceMotion, dimmed, frame]);

  const groupOpacity = useDerivedValue(() => 0.92 * (1 - 0.55 * dimSV.value));

  const glowRadius = useDerivedValue(
    () =>
      R *
      (0.95 + 0.06 * Math.sin(pulsePhase.value) + 0.09 * intensity.value)
  );

  const innerRingRadius = useDerivedValue(
    () =>
      HOLE_RADIUS -
      4 +
      2.5 * Math.sin(pulsePhase.value) +
      4 * intensity.value
  );

  const outerRingRadius = useDerivedValue(
    () =>
      HOLE_RADIUS +
      8 +
      5 * Math.sin(pulsePhase.value * 0.9 + 0.8) +
      8 * intensity.value
  );

  const outerRingOpacity = useDerivedValue(() => {
    const wave = (Math.sin(pulsePhase.value * 0.9 + 0.8) + 1) / 2;
    return (0.14 + 0.16 * wave + 0.22 * intensity.value) * (1 - 0.6 * dimSV.value);
  });

  const innerRingOpacity = useDerivedValue(() => {
    return (0.28 + 0.18 * intensity.value) * (1 - 0.6 * dimSV.value);
  });

  // Gradasi warna partikel berdasarkan status suhu (fallback ke tint jika status tidak dikenali)
  const colors = useMemo(() => {
    if (!STATUS_THEMES[status]) {
      return new Array(DOT_COUNT).fill(tint);
    }
    const { stops } = STATUS_THEMES[status];
    return BASE_PTS.map((p) => samplePalette(stops, p[6]));
  }, [status, tint]);

  const glowColors = useMemo(
    () => [theme.glowInner, theme.glowMid, "rgba(255, 255, 255, 0)"],
    [theme.glowInner, theme.glowMid]
  );

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Canvas style={{ width: size, height: size }}>
        {/* Halo gradasi lembut berdenyut di belakang sphere */}
        <Circle cx={cx} cy={cy} r={glowRadius}>
          <RadialGradient c={centerVec} r={glowRadius} colors={glowColors} />
        </Circle>

        {/* Dua cincin denyut halus mengitari angka suhu di tengah */}
        <Circle
          cx={cx}
          cy={cy}
          r={outerRingRadius}
          style="stroke"
          strokeWidth={1.5}
          color={theme.ringSecondary}
          opacity={outerRingOpacity}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={innerRingRadius}
          style="stroke"
          strokeWidth={1.25}
          color={theme.ringPrimary}
          opacity={innerRingOpacity}
        />

        {/* Sphere partikel 3D dengan variasi warna, ukuran, rotasi & denyut */}
        <Group opacity={groupOpacity}>
          <Atlas
            image={dotImg}
            sprites={sprites}
            transforms={transforms}
            colors={colors}
            colorBlendMode="modulate"
            sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }}
          />
        </Group>
      </Canvas>
    </View>
  );
}
