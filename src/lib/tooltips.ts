import { delegate, type Instance, type Placement, type Props } from "tippy.js/headless";

const SHOW_DELAY_MS = 350;

/** The tooltip itself, drawn with the app's own classes so it follows the theme. */
function render(instance: Instance): ReturnType<NonNullable<Props["render"]>> {
  const popper = document.createElement("div");
  const box = document.createElement("div");
  box.setAttribute("role", "tooltip");
  box.className =
    "bg-foreground text-background pointer-events-none font-sans max-w-64 rounded-md px-2 py-1 text-[11px] leading-snug font-medium shadow-lg opacity-0 transition-opacity duration-[120ms] data-[shown]:opacity-100";
  box.textContent = String(instance.props.content);
  popper.append(box);
  return {
    popper,
    onUpdate: (_prev: Props, next: Props) => {
      box.textContent = String(next.content);
    },
  };
}

/**
 * Shows a tooltip for every element under `root` with a `data-tip`, now or added later.
 * `data-tip-placement` picks the side. `appendTo` is where tooltips are drawn, which inside a
 * shadow root has to be in it, or they lose their styles.
 */
export function installTooltips(root: Element, appendTo: Element = document.body): () => void {
  const instances = delegate(root, {
    target: "[data-tip]",
    render,
    appendTo: () => appendTo,
    content: (reference) => reference.getAttribute("data-tip") ?? "",
    placement: "top",
    offset: [0, 8],
    delay: [SHOW_DELAY_MS, 0],
    // Clicking a button shouldn't leave its tooltip in the way.
    hideOnClick: true,
    touch: false,
    onTrigger(instance) {
      const reference = instance.reference;
      instance.setProps({
        content: reference.getAttribute("data-tip") ?? "",
        placement: (reference.getAttribute("data-tip-placement") as Placement | null) ?? "top",
      });
    },
    animation: false,
    onShow(instance) {
      if (!instance.props.content) return false;
      requestAnimationFrame(() =>
        instance.popper.firstElementChild?.setAttribute("data-shown", ""),
      );
    },
  });
  return () => [instances].flat().forEach((instance) => instance.destroy());
}
