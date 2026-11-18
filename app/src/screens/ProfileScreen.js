import { ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { MQTT_BROKER_URL, MQTT_TOPIC } from "../services/config.js";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;

const MEMBERS = [
  {
    id: "1",
    name: "Yesaya Sandya Putra Prabaswara",
    nim: "21120124120072",
  },
  {
    id: "2",
    name: "Muhammad Isya Asyhari",
    nim: "21120124130051",
  },
  {
    id: "3",
    name: "Reizal Haidar Akmal",
    nim: "21120124130083",
  },
  {
    id: "4",
    name: "Zaidan Ali Arroyan",
    nim: "21120124140117",
  },
];

const TECH_STACK = [
  {
    icon: "logo-react",
    name: "React Native & Expo",
    desc: "Framework mobile lintas platform Android & iOS",
  },
  {
    icon: "radio-outline",
    name: "MQTT over WebSocket",
    desc: "Streaming data suhu IoT secara real-time melalui HiveMQ",
  },
  {
    icon: "server-outline",
    name: "REST API Backend",
    desc: "Penyimpanan riwayat alarm suhu & konfigurasi threshold",
  },
  {
    icon: "sparkles-outline",
    name: "Skia & Reanimated",
    desc: "Visualisasi animasi 3D particle sphere responsif 60 fps",
  },
  {
    icon: "compass-outline",
    name: "React Navigation",
    desc: "Navigasi Bottom Tab antar halaman Monitoring, Control, dan Profil",
  },
];

export function ProfileScreen() {
  const reduceMotion = useReducedMotion();

  const cardEntering = (delay = 0) =>
    reduceMotion
      ? FadeIn.duration(150)
      : FadeInDown.duration(tokens.motion.entering).delay(delay);

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Kartu Identitas Kelompok */}
        <Animated.View style={styles.heroCard} entering={cardEntering(0)}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="people" size={28} color={color.onPrimary} />
            </View>
            <View style={styles.heroTextWrap}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>Praktikum PPB · Modul 6</Text>
              </View>
              <Text style={styles.groupTitle}>Kelompok 39 - Shift 06</Text>
              <View style={styles.institutionRow}>
                <Ionicons name="school-outline" size={15} color={color.text2} />
                <Text style={styles.institutionText}>
                  Teknik Komputer, Universitas Diponegoro
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.heroDescription}>
            Aplikasi pemantauan suhu IoT real-time LiveTemp berbasis MQTT dan
            REST API untuk memantau pembacaan sensor, mengelola batas ambang
            (threshold), serta mencatat riwayat alarm secara otomatis.
          </Text>
        </Animated.View>

        {/* Kartu Daftar Anggota */}
        <Animated.View style={styles.card} entering={cardEntering(60)}>
          <View style={styles.cardHeader}>
            <Ionicons name="id-card-outline" size={18} color={color.primary} />
            <Text style={styles.cardTitle}>Daftar Anggota</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{MEMBERS.length} Orang</Text>
            </View>
          </View>

          <View style={styles.memberList}>
            {MEMBERS.map((member, index) => (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  index === 0 && styles.memberRowFirst,
                ]}
              >
                <View style={styles.memberIndex}>
                  <Text style={styles.memberIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberNim}>{member.nim}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Kartu Ringkasan MQTT */}
        <Animated.View style={styles.card} entering={cardEntering(120)}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-network-outline" size={18} color={color.primary} />
            <Text style={styles.cardTitle}>Ringkasan Topik MQTT</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Topik Langganan (Subscribe)</Text>
              <Text style={styles.monoValue} selectable>
                {MQTT_TOPIC || "ppb/kel39/iot/temperature"}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Broker MQTT (WSS)</Text>
              <Text style={styles.monoValue} selectable>
                {MQTT_BROKER_URL || "wss://broker.hivemq.com:8884/mqtt"}
              </Text>
            </View>
          </View>

          <Text style={styles.summaryText}>
            Simulator sensor memublikasikan payload JSON berisi nilai suhu dan
            timestamp ke topik MQTT di atas. Aplikasi LiveTemp berlangganan
            secara langsung untuk menampilkan suhu live dan menyinkronkan alarm
            melewati threshold ke backend.
          </Text>
        </Animated.View>

        {/* Kartu Teknologi yang Digunakan */}
        <Animated.View style={styles.card} entering={cardEntering(180)}>
          <View style={styles.cardHeader}>
            <Ionicons name="layers-outline" size={18} color={color.primary} />
            <Text style={styles.cardTitle}>Teknologi yang Digunakan</Text>
          </View>

          <View style={styles.techList}>
            {TECH_STACK.map((item, index) => (
              <View
                key={item.name}
                style={[styles.techRow, index === 0 && styles.techRowFirst]}
              >
                <View style={styles.techIconWrap}>
                  <Ionicons name={item.icon} size={18} color={color.primary} />
                </View>
                <View style={styles.techInfo}>
                  <Text style={styles.techName}>{item.name}</Text>
                  <Text style={styles.techDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
    backgroundColor: color.bg,
  },
  heroCard: {
    backgroundColor: color.surface,
    padding: space.xl,
    borderRadius: radius.card,
    borderCurve: "continuous",
    gap: space.md,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
  },
  heroIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  badgePill: {
    alignSelf: "flex-start",
    backgroundColor: color.surface2,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: color.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupTitle: {
    fontSize: tokens.type.title,
    fontWeight: "700",
    color: color.text,
    letterSpacing: -0.3,
  },
  institutionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  institutionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: color.text2,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: color.text2,
  },
  card: {
    backgroundColor: color.surface,
    padding: space.xl,
    borderRadius: radius.card,
    borderCurve: "continuous",
    gap: space.md,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: tokens.type.section,
    fontWeight: "700",
    color: color.text,
  },
  countPill: {
    backgroundColor: color.surface2,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: color.text2,
    fontVariant: ["tabular-nums"],
  },
  memberList: {
    marginTop: 2,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  memberRowFirst: {
    borderTopWidth: 0,
    paddingTop: 4,
  },
  memberIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  memberIndexText: {
    fontSize: 13,
    fontWeight: "700",
    color: color.primary,
    fontVariant: ["tabular-nums"],
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
    color: color.text,
  },
  memberNim: {
    fontSize: 13,
    color: color.text3,
    fontVariant: ["tabular-nums"],
  },
  infoGrid: {
    gap: space.sm,
  },
  infoBox: {
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.input,
    borderCurve: "continuous",
    padding: space.md,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: color.text3,
  },
  monoValue: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "monospace",
    color: color.text,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
    color: color.text2,
  },
  techList: {
    marginTop: 2,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  techRowFirst: {
    borderTopWidth: 0,
    paddingTop: 4,
  },
  techIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: color.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  techInfo: {
    flex: 1,
    gap: 2,
  },
  techName: {
    fontSize: 14,
    fontWeight: "600",
    color: color.text,
  },
  techDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: color.text2,
  },
});
