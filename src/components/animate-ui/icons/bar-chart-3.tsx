'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type BarChart3Props = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 1.1, 1],
        transition: { duration: 0.4, ease: 'easeInOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: BarChart3Props) {
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
      <motion.g
        variants={variants.group}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: 'bottom' }}
      >
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </motion.g>
    </motion.svg>
  );
}

function BarChart3(props: BarChart3Props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  BarChart3,
  BarChart3 as BarChart3Icon,
  type BarChart3Props,
  type BarChart3Props as BarChart3IconProps,
};
