"use client";

import { useState, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { keepDrawerOnDialogInteraction } from "@/ui/ConfirmDelete";
import { useIsMobile } from "@/ui/useIsMobile";

/**
 * Reusable right-column pattern: a compact card whose full content lives in a
 * drawer (right on desktop, bottom on mobile). One instance manages one card +
 * its drawer. See docs/DESIGN.md ("Cards de la columna derecha") — used by
 * Generar CV (wizard), Notas generales (editor) and the list ↔ form managers
 * (Links estables, Cover letters, Preguntas).
 *
 * `card` renders the compact face and gets `open()`; `children` renders
 * everything below the pinned header and gets `close()` (so a flow like the
 * wizard can dismiss itself). Children compose the drawer slots themselves:
 * wrap the content in `DrawerBody` (the scrollable middle) and put primary
 * actions in a `DrawerFooter` (pinned at the bottom) when the flow has them.
 */
export interface PanelCardProps {
  /** Drawer title. */
  title: string;
  /** Drawer subtitle. */
  description?: string;
  card: (open: () => void) => ReactNode;
  /**
   * Drawer content below the header — a `DrawerBody` plus optional
   * `DrawerFooter`. `container` is the drawer node — pass it to popouts inside.
   */
  children: (close: () => void, container: HTMLElement | null) => ReactNode;
}

export function PanelCard({ title, description, card, children }: PanelCardProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  // The drawer node — popouts (dropdowns) inside the body portal here so they
  // stay in the drawer's focus / pointer-events scope.
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  return (
    <>
      {card(() => setOpen(true))}
      <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={setOpen}>
        <DrawerContent
          ref={setNode}
          // A nested confirm dialog (ConfirmDelete) portals to <body>; keep the
          // drawer open when the interaction is inside it.
          onPointerDownOutside={keepDrawerOnDialogInteraction}
          onInteractOutside={keepDrawerOnDialogInteraction}
          onEscapeKeyDown={(event) => {
            if (document.querySelector('[data-slot="alert-dialog-content"]')) event.preventDefault();
          }}
        >
          <DrawerHeader className="relative pr-12">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              title="Cerrar"
              className="absolute top-3 right-3"
            >
              <X className="size-4" />
            </Button>
          </DrawerHeader>
          {children(() => setOpen(false), node)}
        </DrawerContent>
      </Drawer>
    </>
  );
}

/**
 * Shared compact card face (icon + title + description), so the three
 * right-column cards look identical. `h-full` lets them stretch to equal height
 * when laid out in a row. Provide `cta` (a button) for a card with an explicit
 * action (Generar CV); otherwise pass `onOpen` to make the whole card clickable.
 */
export function PanelCardFace({
  icon: Icon,
  title,
  description,
  onOpen,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onOpen?: () => void;
  cta?: ReactNode;
}) {
  const clickable = Boolean(onOpen);
  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      className={cn(
        "h-full",
        clickable &&
          "cursor-pointer transition-colors hover:border-ring/40 hover:bg-accent/30",
      )}
    >
      <CardContent className="flex flex-1 items-center justify-center py-6">
        <Empty className="border-0 p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          {cta && <EmptyContent>{cta}</EmptyContent>}
        </Empty>
      </CardContent>
    </Card>
  );
}
