interface ProgressBarProps {
  value: number;  // 0–100
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'black';
  height?: 'xs' | 'sm' | 'md';
}

const colorMap = {
  green:  'bg-[var(--s)]',
  red:    'bg-[var(--d)]',
  yellow: 'bg-[var(--w)]',
  blue:   'bg-[var(--p)]',
  black:  'bg-[var(--t)]',
};

function getColor(value: number) {
  if (value >= 70) return 'green';
  if (value >= 40) return 'yellow';
  return 'red';
}

export default function ProgressBar({ value, color, height = 'sm' }: ProgressBarProps) {
  const c = color || getColor(value);
  const hClass = height === 'xs' ? 'h-1' : height === 'sm' ? 'h-1.5' : 'h-2.5';
  
  return (
    <div className={`w-full bg-[var(--bg1)] rounded-full overflow-hidden ${hClass}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[c]}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
