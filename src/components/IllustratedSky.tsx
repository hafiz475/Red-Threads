import type { DayScene } from '../archive/types';
import type { HistoricalPhase } from '../scenes/time';

interface Props {
  phase?: HistoricalPhase;
  scene?: DayScene;
  animate: boolean;
  className?: string;
}

export function IllustratedSky({ phase = 'night', scene, animate, className = '' }: Props) {
  const seed = scene?.seed ?? 7;
  return (
    <div className={`illustrated-sky phase-${phase} scene-${scene?.kind ?? 'storybook'} ${animate ? 'is-animated' : 'is-still'} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop className="sky-top" offset="0" />
            <stop className="sky-bottom" offset="1" />
          </linearGradient>
          <radialGradient id={`glow-${seed}`}>
            <stop offset="0" stopColor="currentColor" stopOpacity=".95" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <filter id={`soft-${seed}`}><feGaussianBlur stdDeviation="16" /></filter>
        </defs>
        <rect width="1200" height="700" fill={`url(#sky-${seed})`} />
        <circle className="sun-or-moon-glow" cx="880" cy={phase === 'sunset' ? 330 : 150} r="120" fill={`url(#glow-${seed})`} filter={`url(#soft-${seed})`} />
        <circle className="sun-or-moon" cx="880" cy={phase === 'sunset' ? 330 : 150} r={phase === 'night' ? 44 : 58} />
        {Array.from({ length: 18 }, (_, index) => (
          <circle key={index} className="star" style={{ '--delay': `${((index * 7 + seed) % 15) / 4}s` } as React.CSSProperties} cx={(index * 173 + seed * 41) % 1180} cy={(index * 83 + seed * 17) % 360} r={(index % 3) + 1.2} />
        ))}
        <g className="cloud cloud-one"><ellipse cx="205" cy="180" rx="105" ry="24" /><ellipse cx="155" cy="166" rx="48" ry="34" /><ellipse cx="245" cy="158" rx="60" ry="43" /></g>
        <g className="cloud cloud-two"><ellipse cx="710" cy="285" rx="122" ry="29" /><ellipse cx="665" cy="264" rx="55" ry="38" /><ellipse cx="755" cy="257" rx="68" ry="48" /></g>
        <path className="hills far" d="M0 470 Q150 370 290 470 T570 450 T880 470 T1200 430 V700 H0Z" />
        <path className="hills near" d="M0 555 Q170 450 340 550 T690 530 T1020 545 T1200 510 V700 H0Z" />
        <g className="window-frame">
          <path d="M70 700V170Q70 95 145 95H410V700" />
          <path d="M74 260H405M240 100V560" />
          <path className="curtain left" d="M60 65Q185 120 125 430Q95 565 170 700H20V50Z" />
          <path className="curtain right" d="M425 65Q335 165 390 430Q430 575 365 700H490V50Z" />
        </g>
        <g className="lantern">
          <path d="M180 0V76" /><ellipse cx="180" cy="125" rx="42" ry="54" /><path d="M145 105H215M145 132H215M180 75V179" />
        </g>
        <g className="flowers">
          {Array.from({ length: 10 }, (_, index) => <circle key={index} cx={70 + index * 33} cy={620 + (index % 3) * 20} r="16" />)}
        </g>
        <g className="rain">
          {Array.from({ length: 18 }, (_, index) => (
            <path key={index} style={{ '--delay': `${(index % 6) * .35}s` } as React.CSSProperties} d={`M${500 + (index * 47) % 650} ${50 + (index % 4) * 80}l-18 66`} />
          ))}
        </g>
        <path className="red-thread" pathLength="1" d="M40 610C210 510 275 680 450 565C595 470 655 600 770 505C900 398 1005 520 1180 410" />
        <g className="petals">
          {Array.from({ length: 8 }, (_, index) => <ellipse key={index} style={{ '--delay': `${index * .7}s` } as React.CSSProperties} cx={470 + index * 85} cy={90 + (index % 3) * 140} rx="7" ry="13" transform={`rotate(${index * 23})`} />)}
        </g>
      </svg>
    </div>
  );
}
