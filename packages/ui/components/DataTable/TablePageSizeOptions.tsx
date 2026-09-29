import * as React from "react";
import { SelectItem } from "../Select/Select";

interface TablePageSizeOptionsProps {
  sizes?: readonly number[];
  labelPrefix?: string;
}

export function TablePageSizeOptions({
  sizes = [10, 25],
  labelPrefix = "Show",
}: TablePageSizeOptionsProps) {
  const options = [...new Set([...sizes, 50, 100])].sort((a, b) => a - b);
  return (
    <>
      {options.map((size) => (
        <SelectItem key={size} value={String(size)}>
          {labelPrefix ? `${labelPrefix} ${size}` : size}
        </SelectItem>
      ))}
    </>
  );
}
