import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from "react-native-google-mobile-ads";

import { NATIVE_AD_UNIT } from "@/config/ads";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

/**
 * A single inline "Sponsored" card — an AdMob Native Ad styled to sit in the
 * feed like a post, but clearly labelled as an ad (AdMob policy) and visually
 * distinct from wroom's fictional content. Renders nothing until an ad loads,
 * and nothing at all if loading fails, so the feed never shows an empty slot.
 */
export function FeedAd() {
  const t = useWroomTheme();
  const [ad, setAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let live = true;
    let loaded: NativeAd | null = null;
    NativeAd.createForAdRequest(NATIVE_AD_UNIT)
      .then((next) => {
        if (live) {
          loaded = next;
          setAd(next);
        } else {
          next.destroy();
        }
      })
      .catch(() => {
        // No fill or error — leave the slot empty.
      });
    return () => {
      live = false;
      loaded?.destroy();
    };
  }, []);

  if (!ad) return null;

  const showMedia = !!ad.mediaContent && ad.mediaContent.aspectRatio > 0;

  return (
    <NativeAdView nativeAd={ad} style={[styles.card, { borderBottomColor: t.border }]}>
      <View style={styles.row}>
        {ad.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: ad.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : (
          <View style={[styles.icon, { backgroundColor: t.surface2 }]} />
        )}

        <View style={styles.main}>
          <View style={styles.head}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
                {ad.headline}
              </Text>
            </NativeAsset>
            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: t.ink3 }]}>
                <Text style={[styles.badgeText, { color: t.bg }]}>Sponsored</Text>
              </View>
              {!!ad.advertiser && (
                <Text style={[styles.meta, { color: t.ink3 }]} numberOfLines={1}>
                  {ad.advertiser}
                </Text>
              )}
            </View>
          </View>

          {!!ad.body && (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={[styles.body, { color: t.ink }]} numberOfLines={4}>
                {ad.body}
              </Text>
            </NativeAsset>
          )}

          {showMedia && (
            <NativeMediaView
              resizeMode="cover"
              style={[styles.media, { aspectRatio: ad.mediaContent!.aspectRatio, borderColor: t.border }]}
            />
          )}

          {!!ad.callToAction && (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <View style={[styles.cta, { backgroundColor: t.accent }]}>
                <Text style={[styles.ctaText, { color: t.accentInk }]}>{ad.callToAction}</Text>
              </View>
            </NativeAsset>
          )}
        </View>
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", gap: space[3] },
  icon: { width: 42, height: 42, borderRadius: radius.md },
  main: { flex: 1, gap: space[1] },
  head: { gap: 2 },
  name: { fontFamily: fonts.serif, fontSize: type.base, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  badge: { paddingHorizontal: space[2], paddingVertical: 1, borderRadius: radius.sm },
  badgeText: { fontSize: type.xs, fontWeight: "700", letterSpacing: 0.3 },
  meta: { flex: 1, fontSize: type.xs },
  body: { fontFamily: fonts.serif, fontSize: type.base, lineHeight: type.base * 1.45 },
  media: {
    width: "100%",
    marginTop: space[2],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  ctaText: { fontSize: type.sm, fontWeight: "600" },
});
