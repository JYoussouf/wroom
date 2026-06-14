import { useStore } from "../store/store";

/** A soft, fast confirmation that fades in above the tab bar. */
export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast}
    </div>
  );
}
