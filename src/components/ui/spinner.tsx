import { cn } from "@/lib/utils";

/**
 * Loading spinner: a smooth ring with a trailing fade instead of a dashed icon.
 *
 * Size and colour come from className (`size-*`, `text-*`); defaults to primary.
 *
 *   <Spinner className="size-6" />
 *   <Spinner className="size-4 text-muted-foreground" />
 */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "text-primary inline-block size-4 shrink-0 animate-spin rounded-full",
        className,
      )}
      style={{
        // Conic sweep drawn in currentColor, then a radial mask punches out the
        // centre to leave a ~2.5px ring with a smooth trailing fade.
        background: "conic-gradient(from 90deg at 50% 50%, transparent 0deg, currentColor 300deg)",
        WebkitMask:
          "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
        mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
      }}
    />
  );
}

export { Spinner };
