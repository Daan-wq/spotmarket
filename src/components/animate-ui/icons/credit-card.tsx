'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type CreditCardProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { x: 0 },
      animate: {
        x: [0, 4, 0],
        transition: { duration: 0.4, ease: 'easeInOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CreditCardProps) {
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
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </motion.g>
    </motion.svg>
  );
}

function CreditCard(props: CreditCardProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  CreditCard,
  CreditCard as CreditCardIcon,
  type CreditCardProps,
  type CreditCardProps as CreditCardIconProps,
};
