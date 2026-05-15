'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type Trash2Props = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 14 } },
      animate: { rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 14 } },
    },
    lid: {
      initial: { rotate: 0, y: 0, transition: { type: 'spring', stiffness: 200, damping: 14 } },
      animate: {
        rotate: [0, -18, 12, -8, 0],
        y: [0, -1, 0, 0, 0],
        transition: { duration: 0.55, ease: 'easeInOut' },
      },
    },
    handle: {
      initial: { rotate: 0, y: 0, transition: { type: 'spring', stiffness: 200, damping: 14 } },
      animate: {
        rotate: [0, -18, 12, -8, 0],
        y: [0, -1, 0, 0, 0],
        transition: { duration: 0.55, ease: 'easeInOut' },
      },
    },
    body: {},
    line1: {},
    line2: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: Trash2Props) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={variants.group}
      initial="initial"
      animate={controls}
      {...props}
    >
      {/* Lid (top horizontal bar) — pivots from its center on hover */}
      <motion.path
        d="M3 6h18"
        style={{ originX: '12px', originY: '6px' }}
        variants={variants.lid}
        initial="initial"
        animate={controls}
      />
      {/* Handle on top — rotates with the lid */}
      <motion.path
        d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        style={{ originX: '12px', originY: '6px' }}
        variants={variants.handle}
        initial="initial"
        animate={controls}
      />
      {/* Body of the can — stays still */}
      <motion.path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
        variants={variants.body}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="10"
        x2="10"
        y1="11"
        y2="17"
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="14"
        x2="14"
        y1="11"
        y2="17"
        variants={variants.line2}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Trash2(props: Trash2Props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Trash2,
  Trash2 as Trash2Icon,
  type Trash2Props,
  type Trash2Props as Trash2IconProps,
};
