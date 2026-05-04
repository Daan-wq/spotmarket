'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type GitPullRequestArrowProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { x: 0 },
      animate: {
        x: [0, 3, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: GitPullRequestArrowProps) {
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
        <circle cx="5" cy="6" r="3" />
        <path d="M5 9v12" />
        <circle cx="19" cy="18" r="3" />
        <path d="m15 9-3-3 3-3" />
        <path d="M12 6h5a2 2 0 0 1 2 2v7" />
      </motion.g>
    </motion.svg>
  );
}

function GitPullRequestArrow(props: GitPullRequestArrowProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  GitPullRequestArrow,
  GitPullRequestArrow as GitPullRequestArrowIcon,
  type GitPullRequestArrowProps,
  type GitPullRequestArrowProps as GitPullRequestArrowIconProps,
};
