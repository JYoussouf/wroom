import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Every screen the app can be on. A mobile-style navigation stack. */
export type Route =
  | { name: "room" }
  | { name: "character-new" }
  | { name: "character-edit"; id: string }
  | { name: "home" } // stepped-in character home
  | { name: "profile"; id: string } // character or world account
  | { name: "compose"; replyTo?: string; threadAfter?: string }
  | { name: "post"; id: string }
  | { name: "connections"; id: string; tab: "followers" | "following" }
  | { name: "share"; id: string }
  | { name: "settings" }
  | { name: "graph" };

interface NavValue {
  route: Route;
  canBack: boolean;
  push: (route: Route) => void;
  back: () => void;
  reset: (route: Route) => void;
  /** Replace the current top of stack (no animation of depth). */
  replace: (route: Route) => void;
}

const Ctx = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: "room" }]);

  const push = useCallback((route: Route) => {
    setStack((s) => [...s, route]);
  }, []);

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const reset = useCallback((route: Route) => {
    setStack([route]);
  }, []);

  const replace = useCallback((route: Route) => {
    setStack((s) => [...s.slice(0, -1), route]);
  }, []);

  const value = useMemo<NavValue>(
    () => ({
      route: stack[stack.length - 1],
      canBack: stack.length > 1,
      push,
      back,
      reset,
      replace,
    }),
    [stack, push, back, reset, replace]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav(): NavValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
