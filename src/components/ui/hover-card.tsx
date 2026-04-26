"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as React from "react";

import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "start", side = "right", sideOffset = 8, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    side={side}
    sideOffset={sideOffset}
    collisionPadding={16}
    className={cn(
      "z-50 max-h-[min(70vh,28rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-featured border border-border-soft bg-white p-4 text-sm text-[var(--color-text-dark)] shadow-card-elevated outline-none",
      className,
    )}
    {...props}
  />
));
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };
