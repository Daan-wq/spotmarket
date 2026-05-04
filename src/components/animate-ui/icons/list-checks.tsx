'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type ListChecksProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.1, 1],
        transition: { duration: 0.4, ease: 'easeInOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: ListChecksProps) {
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
      <motion.g variants={variants.group} initial="initial" animate={controls}>
        <path d="M13 5h8" />
        <path d="M13 12h8" />
        <path d="M13 19h8" />
        <path d="m3 17 2 2 4-4" />
        <path d="m3 7 2 2 4-4" />
      </motion.g>
    </motion.svg>
  );
}

function ListChecks(props: ListChecksProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  ListChecks,
  ListChecks as ListChecksIcon,
  type ListChecksProps,
  type ListChecksProps as ListChecksIconProps,
};
