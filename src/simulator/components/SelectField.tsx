import { PanelField } from "@/components/app/Section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: [string, string][];
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <PanelField label={label} htmlFor={id}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className="bg-card h-9 w-full rounded-[8px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="rounded-lg">
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue} className="text-xs">
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p> : null}
    </PanelField>
  );
}
