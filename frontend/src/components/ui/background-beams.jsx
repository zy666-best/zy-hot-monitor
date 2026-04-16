import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const paths = [
  'M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875',
  'M-330 -246C-330 -246 -261 160 202 287C665 414 732 820 732 820',
  'M-280 -302C-280 -302 -213 104 251 231C714 358 782 763 782 763',
  'M-230 -359C-230 -359 -163 47 301 174C764 301 831 707 831 707',
  'M-180 -416C-180 -416 -112 -9 352 118C815 245 882 650 882 650',
  'M-130 -473C-130 -473 -61 -71 403 56C867 183 936 588 936 588',
  'M-80 -530C-80 -530 -11 -128 453 -1C918 126 986 532 986 532',
  'M-30 -588C-30 -588 38 -184 502 -57C966 70 1034 475 1034 475',
  'M20 -645C20 -645 87 -240 551 -113C1015 14 1083 419 1083 419',
];

const staticPath =
  'M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875M-330 -246C-330 -246 -261 160 202 287C665 414 732 820 732 820M-280 -302C-280 -302 -213 104 251 231C714 358 782 763 782 763M-230 -359C-230 -359 -163 47 301 174C764 301 831 707 831 707M-180 -416C-180 -416 -112 -9 352 118C815 245 882 650 882 650M-130 -473C-130 -473 -61 -71 403 56C867 183 936 588 936 588M-80 -530C-80 -530 -11 -128 453 -1C918 126 986 532 986 532M-30 -588C-30 -588 38 -184 502 -57C966 70 1034 475 1034 475M20 -645C20 -645 87 -240 551 -113C1015 14 1083 419 1083 419';

export const BackgroundBeams = React.memo(function BackgroundBeams({ className }) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex h-full w-full items-center justify-center [mask-repeat:no-repeat] [mask-size:40px]',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        className="pointer-events-none absolute z-0 h-full w-full"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={staticPath}
          stroke="url(#beam-radial)"
          strokeOpacity="0.06"
          strokeWidth="0.5"
        />

        {paths.map((path, index) => (
          <motion.path
            key={`path-${index}`}
            d={path}
            stroke={`url(#beam-gradient-${index})`}
            strokeOpacity="0.42"
            strokeWidth="0.5"
          />
        ))}

        <defs>
          {paths.map((_, index) => (
            <motion.linearGradient
              id={`beam-gradient-${index}`}
              key={`gradient-${index}`}
              initial={{ x1: '0%', x2: '0%', y1: '0%', y2: '0%' }}
              animate={{
                x1: ['0%', '100%'],
                x2: ['0%', '96%'],
                y1: ['0%', '100%'],
                y2: ['0%', `${92 + ((index * 3) % 8)}%`],
              }}
              transition={{
                duration: 12 + index,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: index * 0.5,
              }}
            >
              <stop stopColor="#18CCFC" stopOpacity="0" />
              <stop offset="32.5%" stopColor="#18CCFC" />
              <stop offset="67.5%" stopColor="#6CF7D6" />
              <stop offset="100%" stopColor="#AE48FF" stopOpacity="0" />
            </motion.linearGradient>
          ))}

          <radialGradient
            id="beam-radial"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)"
          >
            <stop offset="0.0666667" stopColor="#d4d4d4" />
            <stop offset="0.243243" stopColor="#d4d4d4" />
            <stop offset="0.43594" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
});