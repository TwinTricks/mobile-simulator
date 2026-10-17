import { cn } from "@/lib/utils";

type BrandMarkProps = {
  logoUrl: string;
  className?: string;
};

export function BrandMark({ logoUrl, className }: BrandMarkProps) {
  return (
    <span className={cn("grid place-items-center", className)}>
      <img
        src={logoUrl}
        alt=""
        draggable={false}
        className="size-full object-contain select-none"
      />
    </span>
  );
}
