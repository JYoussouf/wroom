import { createContext, useContext, useMemo, useRef } from "react";
import { Animated, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";

/**
 * Shared "chrome" state for the floating glass tab bar. Holds a single
 * `barOpacity` Animated.Value so scrollable screens can fade the bar slightly
 * while the user is scrolling, then restore it when they stop.
 *
 * Core Animated (not reanimated) is used deliberately: it's one opacity value,
 * needs no worklets/babel plugin, and drives `useNativeDriver` smoothly.
 */
const ACTIVE = 1;
const SCROLLING = 0.6;

interface TabBarChrome {
  barOpacity: Animated.Value;
  onScrollBeginDrag: () => void;
  onScrollEndDrag: () => void;
  onMomentumScrollEnd: () => void;
}

const Ctx = createContext<TabBarChrome | null>(null);

export function TabBarChromeProvider({ children }: { children: React.ReactNode }) {
  const barOpacity = useRef(new Animated.Value(ACTIVE)).current;

  const value = useMemo<TabBarChrome>(() => {
    const to = (v: number) =>
      Animated.timing(barOpacity, {
        toValue: v,
        duration: 180,
        useNativeDriver: true,
      }).start();
    return {
      barOpacity,
      onScrollBeginDrag: () => to(SCROLLING),
      onScrollEndDrag: () => to(ACTIVE),
      onMomentumScrollEnd: () => to(ACTIVE),
    };
  }, [barOpacity]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Read the bar opacity (for the bar itself). Safe to call outside a provider. */
export function useTabBarOpacity(): Animated.Value {
  return useContext(Ctx)?.barOpacity ?? FALLBACK_OPACITY;
}
const FALLBACK_OPACITY = new Animated.Value(ACTIVE);

/**
 * Scroll handlers to spread onto a ScrollView/FlatList so the bar fades while
 * that list is scrolling. No-ops gracefully when used outside a provider.
 */
export function useTabBarScroll() {
  const chrome = useContext(Ctx);
  return useMemo(
    () => ({
      scrollEventThrottle: 16,
      onScrollBeginDrag: (_e?: NativeSyntheticEvent<NativeScrollEvent>) =>
        chrome?.onScrollBeginDrag(),
      onScrollEndDrag: (_e?: NativeSyntheticEvent<NativeScrollEvent>) =>
        chrome?.onScrollEndDrag(),
      onMomentumScrollEnd: (_e?: NativeSyntheticEvent<NativeScrollEvent>) =>
        chrome?.onMomentumScrollEnd(),
    }),
    [chrome]
  );
}
