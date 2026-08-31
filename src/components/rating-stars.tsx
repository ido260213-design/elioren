"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const starSize = size === "md" ? "size-5" : "size-4";

  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(starSize, i < Math.round(value) ? "fill-warning text-warning" : "fill-none text-muted-foreground")}
        />
      ))}
    </div>
  );
}

export function RatingStarsInput({
  name,
  defaultValue = 0,
}: {
  name: string;
  defaultValue?: number;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const display = hovered ?? value;

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value} />
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
            onClick={() => setValue(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(null)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                starValue <= display ? "fill-warning text-warning" : "fill-none text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
