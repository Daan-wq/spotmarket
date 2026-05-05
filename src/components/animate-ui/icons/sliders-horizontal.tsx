'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type SlidersHorizontalProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    line1: {
      initial: { x: 0 },
      animate: {
        x: [0, -4, 4, 0],
        transition: { duration: 0.6, ease: 'easeInOut' },
      },
    },
    line2: {
      initial: { x: 0 },
      animate: {
        x: [0, 4, -4, 0],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0.05 },
      },
    },
    line3: {
      initial: { x: 0 },
      animate: {
        x: [0, -3, 3, 0],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0.1 },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: SlidersHorizontalProps) {
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
      {...props}
    >
      <motion.line
        x1="21"
        x2="14"
        y1="4"
        y2="4"
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="10"
        x2="3"
        y1="4"
        y2="4"
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="21"
        x2="12"
        y1="12"
        y2="12"
        variants={variants.line2}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="8"
        x2="3"
        y1="12"
        y2="12"
        variants={variants.line2}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="21"
        x2="16"
        y1="20"
        y2="20"
        variants={variants.line3}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="12"
        x2="3"
        y1="20"
        y2="20"
        variants={variants.line3}
        initial="initial"
        animate={controls}
      />
      <motion.circle cx={12} cy={4} r={2} variants={variants.line1} initial="initial" animate={controls} />
      <motion.circle cx={10} cy={12} r={2} variants={variants.line2} initial="initial" animate={controls} />
      <motion.circle cx={14} cy={20} r={2} variants={variants.line3} initial="initial" animate={controls} />
    </motion.svg>
  );
}

function SlidersHorizontal(props: SlidersHorizontalProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  SlidersHorizontal,
  SlidersHorizontal as SlidersHorizontalIcon,
  type SlidersHorizontalProps,
  type SlidersHorizontalProps as SlidersHorizontalIconProps,
};
