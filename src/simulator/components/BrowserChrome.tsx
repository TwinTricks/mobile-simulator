import type { ReactNode } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  EllipsisVertical,
  House,
  Lock,
  Plus,
  RotateCw,
  Share,
  SlidersHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BrowserChromeSpec } from "../frame-box";
import { isDarkColor } from "../status-color";

export type BrowserAction = "back" | "forward" | "reload" | "address";

type Props = {
  spec: BrowserChromeSpec;
  /** The bars on this side of the page; Safari's iPhone bars sit below it, the rest above. */
  side: "top" | "bottom";
  /** The address the page is on; empty before one is opened. */
  address: string;
  loading: boolean;
  /** The page's top colour, which Chrome's bar and Safari's top bar take on. */
  color: string | null;
  dark: boolean;
  onAction: (action: BrowserAction) => void;
};

function hostOf(address: string): string {
  try {
    return new URL(address).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const SAFARI_FONT = '-apple-system, "SF Pro Text", "SF Pro", system-ui, sans-serif';
const CHROME_FONT = 'Roboto, "Google Sans", system-ui, sans-serif';

/**
 * Safari's or Chrome's own bars around the page. They are drawn, not real: the arrows step the
 * page's history, the circle reloads, and the address opens the simulator's address box.
 */
export function BrowserChrome({ spec, side, address, loading, color, dark, onAction }: Props) {
  const host = hostOf(address);
  const secure = address.startsWith("https:");
  const height = side === "top" ? spec.top : spec.bottom;
  if (height <= 0) return null;

  if (spec.kind === "safari") {
    const tint = dark ? "#0a84ff" : "#007aff";
    return (
      <div
        data-browser-chrome="safari"
        className={cn(
          "relative z-[5] flex shrink-0 flex-col border-t backdrop-blur select-none",
          dark ? "border-white/10 bg-[#1c1c1e]/95 text-white" : "border-black/10 bg-[#f9f9f9]/95",
        )}
        style={{ height, fontFamily: SAFARI_FONT }}
      >
        <div className="flex h-[52px] shrink-0 items-center px-3">
          <AddressPill
            dark={dark}
            loading={loading}
            onAddress={() => onAction("address")}
            className="h-[42px] rounded-[13px] text-[15px] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            fill={dark ? "#3a3a3c" : "#ffffff"}
            left={<span className="text-[13px] font-semibold tracking-tight">aA</span>}
            right={
              <BarButton label="Reload" onClick={() => onAction("reload")}>
                <RotateCw className="size-[15px]" strokeWidth={2.4} />
              </BarButton>
            }
          >
            {host ? (
              <>
                {secure && <Lock className="size-3 shrink-0 opacity-70" strokeWidth={2.6} />}
                <span className="truncate">{host}</span>
              </>
            ) : (
              <span className="truncate opacity-50">Search or enter website name</span>
            )}
          </AddressPill>
        </div>
        <div
          className="flex h-[46px] shrink-0 items-center justify-around px-2"
          style={{ color: tint }}
        >
          <BarButton label="Back" onClick={() => onAction("back")}>
            <ChevronLeft className="size-[26px]" strokeWidth={2.2} />
          </BarButton>
          <BarButton label="Forward" onClick={() => onAction("forward")}>
            <ChevronRight className="size-[26px]" strokeWidth={2.2} />
          </BarButton>
          <Share className="size-[22px]" strokeWidth={2} />
          <BookOpen className="size-[22px]" strokeWidth={2} />
          <Copy className="size-[21px]" strokeWidth={2} />
        </div>
      </div>
    );
  }

  const background = color ?? (dark ? (spec.kind === "chrome" ? "#202124" : "#1c1c1e") : "#ffffff");
  const light = color ? isDarkColor(color) : dark;
  const fill = light ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)";

  if (spec.kind === "chrome") {
    return (
      <div
        data-browser-chrome="chrome"
        className={cn(
          "relative z-[5] flex shrink-0 items-center gap-1 px-2 transition-colors duration-200 select-none",
          light ? "text-white" : "text-[#1f1f1f]",
        )}
        style={{ height, background, fontFamily: CHROME_FONT }}
      >
        <BarButton label="Home" onClick={() => onAction("address")} className="size-10">
          <House className="size-5" />
        </BarButton>
        <AddressPill
          dark={light}
          loading={loading}
          onAddress={() => onAction("address")}
          className="h-10 rounded-full text-[15px]"
          fill={fill}
          left={<SlidersHorizontal className="size-4" />}
        >
          {host ? (
            <span className="truncate">{host}</span>
          ) : (
            <span className="truncate opacity-60">Search or type URL</span>
          )}
        </AddressPill>
        <span
          aria-hidden
          className="mx-1.5 flex size-[22px] shrink-0 items-center justify-center rounded-[5px] border-2 border-current text-[11px] font-semibold"
        >
          1
        </span>
        <EllipsisVertical className="size-5 shrink-0" />
      </div>
    );
  }

  const roomy = height >= 50;
  return (
    <div
      data-browser-chrome="safari-top"
      className={cn(
        "relative z-[5] flex shrink-0 items-center gap-2 px-3 transition-colors duration-200 select-none",
        light ? "text-white" : "text-black",
      )}
      style={{ height, background, fontFamily: SAFARI_FONT }}
    >
      {roomy && (
        <span
          className="flex shrink-0 items-center"
          style={{ color: light ? "#0a84ff" : "#007aff" }}
        >
          <BarButton label="Back" onClick={() => onAction("back")}>
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </BarButton>
          <BarButton label="Forward" onClick={() => onAction("forward")}>
            <ChevronRight className="size-6" strokeWidth={2.2} />
          </BarButton>
        </span>
      )}
      <AddressPill
        dark={light}
        loading={loading}
        onAddress={() => onAction("address")}
        className="mx-auto h-[34px] max-w-[460px] rounded-[10px] text-[14px]"
        fill={fill}
        left={<span className="text-[12px] font-semibold tracking-tight">aA</span>}
        right={
          <BarButton label="Reload" onClick={() => onAction("reload")}>
            <RotateCw className="size-[14px]" strokeWidth={2.4} />
          </BarButton>
        }
      >
        {host ? (
          <>
            {secure && <Lock className="size-3 shrink-0 opacity-70" strokeWidth={2.6} />}
            <span className="truncate">{host}</span>
          </>
        ) : (
          <span className="truncate opacity-50">Search or enter website name</span>
        )}
      </AddressPill>
      {roomy && (
        <span
          className="flex shrink-0 items-center gap-4"
          style={{ color: light ? "#0a84ff" : "#007aff" }}
        >
          <Share className="size-5" strokeWidth={2} />
          <Plus className="size-6" strokeWidth={2} />
          <Copy className="size-5" strokeWidth={2} />
        </span>
      )}
    </div>
  );
}

function AddressPill({
  dark,
  loading,
  onAddress,
  className,
  fill,
  left,
  right,
  children,
}: {
  dark: boolean;
  loading: boolean;
  onAddress: () => void;
  className: string;
  fill: string;
  left: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-3",
        className,
      )}
      style={{ background: fill }}
    >
      <span className="flex shrink-0 items-center">{left}</span>
      <button
        type="button"
        aria-label="Change the address"
        onClick={(e) => {
          e.stopPropagation();
          onAddress();
        }}
        className="flex min-w-0 flex-1 items-center justify-center gap-1 self-stretch"
      >
        {children}
      </button>
      {right}
      {loading && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 left-0 h-[2.5px] w-2/3 animate-pulse",
            dark ? "bg-[#0a84ff]" : "bg-[#007aff]",
          )}
        />
      )}
    </div>
  );
}

function BarButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      onClick={(e) => {
        // The stage behind closes open panels on a click, and the address opens one.
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full p-1 active:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
