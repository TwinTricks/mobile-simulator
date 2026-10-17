import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { deviceGroups } from "@/shared/device-groups";
import type { Device } from "@/shared/types";

type Props = {
  devices: readonly Device[];
  value: Device;
  onChange: (id: string) => void;
};

/**
 * The device list for the inline phone. Drawn in the phone's own shadow root, where a native
 * select would take the system's look and a portalled menu would lose its styles.
 */
export function DevicePicker({ devices, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(value.id);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matching = devices.filter((d) => words.every((w) => d.name.toLowerCase().includes(w)));
    return deviceGroups(matching);
  }, [devices, query]);
  const flat = groups.flatMap((g) => g.devices);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (root.current && !event.composedPath().includes(root.current)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector(`[data-device="${CSS.escape(active)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show() {
    setQuery("");
    setActive(value.id);
    setOpen(true);
  }

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      const at = flat.findIndex((d) => d.id === active);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(flat[(at + step + flat.length) % flat.length]!.id);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = flat.find((d) => d.id === active) ?? flat[0];
      if (chosen) pick(chosen.id);
    }
  }

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        aria-label="Device"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-value={value.id}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            show();
          }
        }}
        className={cn(
          "border-input bg-background hover:bg-accent/60 flex h-8 max-w-56 min-w-0 items-center gap-1.5 rounded-lg border pr-2 pl-2.5 text-[13px] font-medium shadow-xs transition-colors",
          open && "ring-ring/40 ring-2",
        )}
      >
        <span className="truncate">{value.name}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          onKeyDown={onKeyDown}
          className="bg-popover text-popover-foreground absolute top-[calc(100%+6px)] left-0 z-50 flex w-64 flex-col overflow-hidden rounded-xl border shadow-xl"
          style={{ maxHeight: "min(26rem, calc(100vh - 64px))" }}
        >
          <label className="flex shrink-0 items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground size-3.5 shrink-0" />
            <input
              ref={search}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive("");
              }}
              placeholder="Search devices"
              aria-label="Search devices"
              className="placeholder:text-muted-foreground h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            />
          </label>
          <div
            ref={list}
            role="listbox"
            aria-label="Devices"
            className="min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain p-1"
          >
            {groups.map((group) => (
              <div key={group.label} role="group" aria-label={group.label} className="pb-1">
                <div className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
                  {group.label}
                </div>
                {group.devices.map((device) => {
                  const selected = device.id === value.id;
                  return (
                    <div
                      key={device.id}
                      role="option"
                      aria-selected={selected}
                      data-device={device.id}
                      onPointerMove={() => setActive(device.id)}
                      onClick={() => pick(device.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
                        device.id === active && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Check
                        className={cn("text-primary size-3.5 shrink-0", !selected && "invisible")}
                      />
                      <span className={cn("min-w-0 flex-1 truncate", selected && "font-medium")}>
                        {device.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                        {device.width}×{device.height}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {flat.length === 0 && (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                No device matches “{query}”.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
