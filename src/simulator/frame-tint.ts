/**
 * Where a custom colour goes on a frame image: its metal body, which the lightest frame shows
 * light, and not the black glass, bezel, hinge or cameras. Dark pixels fade out of the mask.
 */
const DARK = 0.25;
const LIGHT = 0.5;

const masks = new Map<string, Promise<HTMLCanvasElement | null>>();
const maskUrls = new Map<string, Promise<string | null>>();

/** The frame image at `url` as a mask, or null if it can't be read. */
export function tintMask(url: string): Promise<HTMLCanvasElement | null> {
  let pending = masks.get(url);
  if (!pending) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    pending = image
      .decode()
      .then(() => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = pixels.data;
        for (let i = 0; i < data.length; i += 4) {
          const light = (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255;
          const t = Math.min(1, Math.max(0, (light - DARK) / (LIGHT - DARK)));
          data[i + 3] = Math.round(data[i + 3]! * t * t * (3 - 2 * t));
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
        ctx.putImageData(pixels, 0, 0);
        return canvas;
      })
      .catch(() => null);
    masks.set(url, pending);
  }
  return pending;
}

/** {@link tintMask} as a URL for CSS `mask-image`. */
export function tintMaskUrl(url: string): Promise<string | null> {
  let pending = maskUrls.get(url);
  if (!pending) {
    pending = tintMask(url).then(
      (canvas) =>
        canvas &&
        new Promise<string | null>((resolve) =>
          canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null)),
        ),
    );
    maskUrls.set(url, pending);
  }
  return pending;
}
