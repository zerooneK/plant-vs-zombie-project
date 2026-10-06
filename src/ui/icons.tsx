import type { PlantName } from '../game/plants.ts'

interface IconProps {
  className?: string | undefined
  size?: number | undefined
}

export function PeashooterIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Leaves at base */}
      <path d="M14 42 C10 38 10 34 16 36 C20 38 22 41 22 42 Z" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1.5" />
      <path d="M26 42 C32 40 36 36 34 33 C30 32 26 36 24 42 Z" fill="#388e3c" stroke="#1b5e20" strokeWidth="1.5" />
      {/* Stem */}
      <path d="M22 42 Q23 30 21 24" fill="none" stroke="#2e7d32" strokeLinecap="round" strokeWidth="4" />
      {/* Back leaf crest */}
      <path d="M16 16 C10 14 8 8 13 8 C17 8 18 12 19 16 Z" fill="#43a047" stroke="#1b5e20" strokeWidth="1.5" />
      {/* Head */}
      <circle cx="23" cy="18" fill="#66bb6a" r="11" stroke="#2e7d32" strokeWidth="2" />
      {/* Snout */}
      <path d="M30 14 L40 12 Q42 18 40 24 L30 22 Z" fill="#4caf50" stroke="#1b5e20" strokeWidth="1.5" />
      <ellipse cx="40" cy="18" fill="#1b5e20" rx="2" ry="5" />
      {/* Eye */}
      <ellipse cx="26" cy="14" fill="#ffffff" rx="3.5" ry="4.5" />
      <circle cx="27" cy="14" fill="#111111" r="2.2" />
      <circle cx="28" cy="13" fill="#ffffff" r="0.8" />
    </svg>
  )
}

export function SunflowerIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Leaves and stem */}
      <path d="M16 42 C12 37 14 34 20 36 Z" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1.5" />
      <path d="M28 42 C34 38 32 34 26 36 Z" fill="#388e3c" stroke="#1b5e20" strokeWidth="1.5" />
      <path d="M24 42 L24 26" fill="none" stroke="#2e7d32" strokeLinecap="round" strokeWidth="3.5" />
      {/* Petals */}
      <g fill="#fdd835" stroke="#f57f17" strokeWidth="1">
        <circle cx="24" cy="8" r="4.5" />
        <circle cx="33" cy="12" r="4.5" />
        <circle cx="37" cy="20" r="4.5" />
        <circle cx="33" cy="28" r="4.5" />
        <circle cx="24" cy="32" r="4.5" />
        <circle cx="15" cy="28" r="4.5" />
        <circle cx="11" cy="20" r="4.5" />
        <circle cx="15" cy="12" r="4.5" />
      </g>
      {/* Center disk */}
      <circle cx="24" cy="20" fill="#f57f17" r="9" stroke="#e65100" strokeWidth="1.5" />
      {/* Face */}
      <ellipse cx="21" cy="18" fill="#3e2723" rx="1.5" ry="2" />
      <ellipse cx="27" cy="18" fill="#3e2723" rx="1.5" ry="2" />
      <path d="M21 22 Q24 26 27 22" fill="none" stroke="#3e2723" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}

export function WallNutIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Sturdy rounded nut body */}
      <path
        d="M24 8 C35 8 40 16 40 28 C40 40 34 44 24 44 C14 44 8 40 8 28 C8 16 13 8 24 8 Z"
        fill="#c68642"
        stroke="#5d4037"
        strokeWidth="2"
      />
      {/* Shell ridges */}
      <path d="M24 9 Q23 26 24 43" fill="none" stroke="#8d5524" strokeWidth="1.5" />
      <path d="M15 15 Q13 28 16 38" fill="none" stroke="#8d5524" strokeWidth="1" />
      <path d="M33 15 Q35 28 32 38" fill="none" stroke="#8d5524" strokeWidth="1" />
      {/* Friendly eyes */}
      <ellipse cx="19" cy="22" fill="#ffffff" rx="3.5" ry="4.5" stroke="#4e342e" strokeWidth="1" />
      <ellipse cx="29" cy="22" fill="#ffffff" rx="3.5" ry="4.5" stroke="#4e342e" strokeWidth="1" />
      <circle cx="20" cy="22" fill="#212121" r="2" />
      <circle cx="28" cy="22" fill="#212121" r="2" />
      <circle cx="21" cy="21" fill="#ffffff" r="0.7" />
      <circle cx="29" cy="21" fill="#ffffff" r="0.7" />
      {/* Smile */}
      <path d="M21 31 Q24 33 27 31" fill="none" stroke="#4e342e" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}

export function TallNutIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Tall towering nut shell */}
      <rect
        fill="#a06830"
        height="40"
        rx="12"
        stroke="#4e342e"
        strokeWidth="2"
        width="26"
        x="11"
        y="4"
      />
      {/* Vertical shell texture */}
      <line stroke="#6d421d" strokeWidth="1.5" x1="24" x2="24" y1="5" y2="43" />
      <line stroke="#6d421d" strokeWidth="1" x1="17" x2="17" y1="8" y2="40" />
      <line stroke="#6d421d" strokeWidth="1" x1="31" x2="31" y1="8" y2="40" />
      {/* Resolute/heavy brow */}
      <path d="M16 16 L22 18" stroke="#3e2723" strokeLinecap="round" strokeWidth="2" />
      <path d="M32 16 L26 18" stroke="#3e2723" strokeLinecap="round" strokeWidth="2" />
      {/* Serious eyes */}
      <ellipse cx="19" cy="21" fill="#ffffff" rx="2.8" ry="3.2" stroke="#3e2723" strokeWidth="0.8" />
      <ellipse cx="29" cy="21" fill="#ffffff" rx="2.8" ry="3.2" stroke="#3e2723" strokeWidth="0.8" />
      <circle cx="20" cy="21" fill="#111111" r="1.7" />
      <circle cx="28" cy="21" fill="#111111" r="1.7" />
      {/* Straight resolute mouth */}
      <line stroke="#3e2723" strokeLinecap="round" strokeWidth="1.8" x1="20" x2="28" y1="30" y2="30" />
    </svg>
  )
}

export function PotatoMineIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Dirt mound */}
      <ellipse cx="24" cy="40" fill="#5d4037" rx="18" ry="4" />
      {/* Sprout & Beacon */}
      <line stroke="#4e342e" strokeWidth="2" x1="24" x2="24" y1="24" y2="15" />
      <circle cx="24" cy="13" fill="#e53935" r="4" stroke="#b71c1c" strokeWidth="1.2" />
      <circle cx="23" cy="11.5" fill="#ffffff" r="1" />
      {/* Potato body */}
      <ellipse cx="24" cy="32" fill="#a1887f" rx="14" ry="9" stroke="#4e342e" strokeWidth="1.8" />
      {/* Cute eyes */}
      <circle cx="20" cy="31" fill="#3e2723" r="1.8" />
      <circle cx="28" cy="31" fill="#3e2723" r="1.8" />
      <circle cx="20.5" cy="30.5" fill="#ffffff" r="0.6" />
      <circle cx="28.5" cy="30.5" fill="#ffffff" r="0.6" />
      {/* Small mouth */}
      <path d="M22 35 Q24 37 26 35" fill="none" stroke="#3e2723" strokeLinecap="round" strokeWidth="1" />
    </svg>
  )
}

export function SnowPeaIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Frosty base leaves */}
      <path d="M14 42 C10 38 10 34 16 36 Z" fill="#546e7a" stroke="#263238" strokeWidth="1.5" />
      <path d="M26 42 C32 40 36 36 34 33 Z" fill="#78909c" stroke="#263238" strokeWidth="1.5" />
      {/* Stem */}
      <path d="M22 42 Q23 30 21 24" fill="none" stroke="#546e7a" strokeLinecap="round" strokeWidth="4" />
      {/* Ice crystals / spikes at back */}
      <polygon fill="#b0bec5" points="16,14 8,11 15,8" stroke="#37474f" strokeWidth="1" />
      <polygon fill="#cfd8dc" points="14,19 7,18 13,15" stroke="#37474f" strokeWidth="1" />
      {/* Chilled head */}
      <circle cx="23" cy="18" fill="#90caf9" r="11" stroke="#1565c0" strokeWidth="2" />
      {/* Frost snout */}
      <path d="M30 14 L40 12 Q42 18 40 24 L30 22 Z" fill="#64b5f6" stroke="#0d47a1" strokeWidth="1.5" />
      <ellipse cx="40" cy="18" fill="#0d47a1" rx="2" ry="5" />
      {/* Eye */}
      <ellipse cx="26" cy="14" fill="#ffffff" rx="3.5" ry="4.5" />
      <circle cx="27" cy="14" fill="#0d47a1" r="2.2" />
      <circle cx="28" cy="13" fill="#ffffff" r="0.8" />
    </svg>
  )
}

export function ChomperIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Spiky base leaves */}
      <path d="M12 42 L18 36 L24 42 L30 36 L36 42" fill="none" stroke="#2e7d32" strokeWidth="2.5" />
      {/* Thick stem */}
      <path d="M24 42 Q25 32 23 26" fill="none" stroke="#388e3c" strokeLinecap="round" strokeWidth="4.5" />
      {/* Large carnivorous purple head */}
      <circle cx="24" cy="20" fill="#7b1fa2" r="12" stroke="#4a148c" strokeWidth="2" />
      {/* Open jaws notch */}
      <path d="M12 16 L28 20 L12 25 Z" fill="#212121" />
      {/* Sharp teeth */}
      <polygon fill="#ffffff" points="14,16 17,19 20,17" />
      <polygon fill="#ffffff" points="21,17 24,20 27,19" />
      <polygon fill="#ffffff" points="14,25 17,22 20,24" />
      <polygon fill="#ffffff" points="21,24 24,21 27,23" />
      {/* Glaring eye */}
      <circle cx="27" cy="13" fill="#fbc02d" r="3" stroke="#e65100" strokeWidth="0.8" />
      <circle cx="26.5" cy="13" fill="#212121" r="1.5" />
    </svg>
  )
}

export function RepeaterIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Leaves and stem */}
      <path d="M14 42 C10 38 10 34 16 36 Z" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1.5" />
      <path d="M26 42 C32 40 36 36 34 33 Z" fill="#388e3c" stroke="#1b5e20" strokeWidth="1.5" />
      <path d="M22 42 Q23 30 21 24" fill="none" stroke="#2e7d32" strokeLinecap="round" strokeWidth="4" />
      {/* Double leaf crest behind head */}
      <path d="M15 15 C8 12 7 6 12 6 C16 6 18 11 18 15 Z" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1.5" />
      <path d="M18 13 C12 8 13 3 17 3 C21 3 22 8 21 13 Z" fill="#43a047" stroke="#1b5e20" strokeWidth="1.5" />
      {/* Head */}
      <circle cx="23" cy="18" fill="#43a047" r="11" stroke="#1b5e20" strokeWidth="2" />
      {/* Dual firing snout */}
      <path d="M30 13 L41 11 Q43 16 41 21 L30 19 Z" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1.5" />
      <ellipse cx="41" cy="16" fill="#1b5e20" rx="1.8" ry="4" />
      <path d="M29 18 L39 17 Q41 21 39 25 L29 24 Z" fill="#388e3c" stroke="#1b5e20" strokeWidth="1.5" />
      <ellipse cx="39" cy="21" fill="#1b5e20" rx="1.8" ry="3.5" />
      {/* Determined eye with brow */}
      <path d="M22 10 L28 12" stroke="#1b5e20" strokeLinecap="round" strokeWidth="2" />
      <ellipse cx="25" cy="14" fill="#ffffff" rx="3.5" ry="4" />
      <circle cx="26" cy="14" fill="#111111" r="2.2" />
      <circle cx="27" cy="13" fill="#ffffff" r="0.8" />
    </svg>
  )
}

export function CherryBombIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Stems */}
      <path d="M24 6 Q24 16 16 26" fill="none" stroke="#2e7d32" strokeLinecap="round" strokeWidth="2.5" />
      <path d="M24 6 Q25 16 32 26" fill="none" stroke="#2e7d32" strokeLinecap="round" strokeWidth="2.5" />
      {/* Top leaf */}
      <path d="M24 6 C28 4 33 5 32 10 C28 10 25 8 24 6 Z" fill="#43a047" stroke="#1b5e20" strokeWidth="1" />
      {/* Left Cherry */}
      <circle cx="15" cy="30" fill="#d32f2f" r="9.5" stroke="#7f0000" strokeWidth="1.8" />
      <ellipse cx="12" cy="27" fill="#ef5350" rx="3" ry="2" />
      <circle cx="13" cy="29" fill="#111111" r="1.5" />
      <circle cx="18" cy="29" fill="#111111" r="1.5" />
      <path d="M14 34 Q16 36 18 34" fill="none" stroke="#7f0000" strokeLinecap="round" strokeWidth="1.2" />
      {/* Right Cherry */}
      <circle cx="33" cy="30" fill="#c62828" r="9.5" stroke="#7f0000" strokeWidth="1.8" />
      <ellipse cx="30" cy="27" fill="#ef5350" rx="3" ry="2" />
      <circle cx="30" cy="29" fill="#111111" r="1.5" />
      <circle cx="35" cy="29" fill="#111111" r="1.5" />
      <path d="M31 34 Q33 36 35 34" fill="none" stroke="#7f0000" strokeLinecap="round" strokeWidth="1.2" />
    </svg>
  )
}

export function PuffShroomIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Short stem */}
      <path d="M20 40 L20 28 L28 28 L28 40 Z" fill="#cfd8dc" stroke="#546e7a" strokeWidth="1.5" />
      {/* Mushroom cap */}
      <path
        d="M10 28 C10 14 38 14 38 28 C38 31 34 32 24 32 C14 32 10 31 10 28 Z"
        fill="#8e24aa"
        stroke="#4a148c"
        strokeWidth="2"
      />
      {/* Spots */}
      <circle cx="18" cy="20" fill="#ba68c8" r="2.5" />
      <circle cx="28" cy="18" fill="#ba68c8" r="3" />
      <circle cx="23" cy="24" fill="#ba68c8" r="1.8" />
      {/* Cute face on stem */}
      <circle cx="22" cy="33" fill="#263238" r="1.2" />
      <circle cx="26" cy="33" fill="#263238" r="1.2" />
      {/* Spore spout */}
      <ellipse cx="34" cy="27" fill="#4a148c" rx="2" ry="3" />
    </svg>
  )
}

export function ShovelIcon({ className = 'packet__icon', size = 32 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* Wooden handle */}
      <line stroke="#8d6e63" strokeLinecap="round" strokeWidth="4" x1="14" x2="32" y1="14" y2="32" />
      {/* Grip */}
      <path d="M10 10 L16 16" stroke="#d7ccc8" strokeLinecap="round" strokeWidth="3" />
      {/* Spade head */}
      <path
        d="M30 30 L38 22 L42 26 L34 34 Z"
        fill="#b0bec5"
        stroke="#546e7a"
        strokeWidth="1.5"
      />
      <path
        d="M33 33 L40 40 C38 43 33 43 29 40 L26 33 Z"
        fill="#78909c"
        stroke="#37474f"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function PlantIcon({ name, size = 32, className }: { name: PlantName; size?: number; className?: string }) {
  switch (name) {
    case 'peashooter':
      return <PeashooterIcon className={className} size={size} />
    case 'sunflower':
      return <SunflowerIcon className={className} size={size} />
    case 'wall-nut':
      return <WallNutIcon className={className} size={size} />
    case 'tall-nut':
      return <TallNutIcon className={className} size={size} />
    case 'potato-mine':
      return <PotatoMineIcon className={className} size={size} />
    case 'snow-pea':
      return <SnowPeaIcon className={className} size={size} />
    case 'chomper':
      return <ChomperIcon className={className} size={size} />
    case 'repeater':
      return <RepeaterIcon className={className} size={size} />
    case 'cherry-bomb':
      return <CherryBombIcon className={className} size={size} />
    case 'puff-shroom':
      return <PuffShroomIcon className={className} size={size} />
  }
}
