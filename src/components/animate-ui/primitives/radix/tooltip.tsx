'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';

import { getStrictContext } from '@/lib/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';

type TooltipContextType = {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
};

const [TooltipProvider, useTooltip] =
  getStrictContext<TooltipContextType>('TooltipContext');

type TooltipRootProviderProps = React.ComponentProps<
  typeof TooltipPrimitive.Provider
>;

function TooltipRootProvider(props: TooltipRootProviderProps) {
  return <TooltipPrimitive.Provider delayDuration={150} {...props} />;
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root>;

function Tooltip(props: TooltipProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <TooltipProvider value={{ isOpen, setIsOpen }}>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        {...props}
        onOpenChange={setIsOpen}
      />
    </TooltipProvider>
  );
}

type TooltipTriggerProps = React.ComponentProps<
  typeof TooltipPrimitive.Trigger
>;

function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

type TooltipContentProps = React.ComponentProps<
  typeof TooltipPrimitive.Content
> & {
  motionProps?: HTMLMotionProps<'div'>;
};

function TooltipContent({
  children,
  sideOffset = 6,
  collisionPadding = 8,
  motionProps,
  ...props
}: TooltipContentProps) {
  const { isOpen } = useTooltip();

  return (
    <AnimatePresence>
      {isOpen && (
        <TooltipPrimitive.Portal forceMount>
          <TooltipPrimitive.Content
            data-slot="tooltip-content"
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            asChild
            {...props}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              {...motionProps}
            >
              {children}
            </motion.div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipRootProvider as TooltipProvider,
};
export type {
  TooltipProps,
  TooltipTriggerProps,
  TooltipContentProps,
  TooltipRootProviderProps,
};
