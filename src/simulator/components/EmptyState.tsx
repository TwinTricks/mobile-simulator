import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function EmptyState({ onAddDevices }: { onAddDevices: () => void }) {
  return (
    <Empty className="border-primary/30 bg-primary/5 m-5 max-h-80 max-w-md self-center rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-primary/10 text-primary rounded-full">
          <Smartphone />
        </EmptyMedia>
        <EmptyTitle className="text-base font-semibold">No devices selected</EmptyTitle>
        <EmptyDescription className="text-xs">
          Pick the phones, tablets and desktops you want to compare.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onAddDevices}>Choose devices</Button>
      </EmptyContent>
    </Empty>
  );
}
