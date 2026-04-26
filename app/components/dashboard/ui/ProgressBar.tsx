interface ProgressBarProps {
  value: number;  // 0–100
  color?: 'green' | 'red' | 'yellow' | 'blue';
  height?: 'sm' | 'md';
}

const colorMap = {
  green:  'bg-green-500',
  red:    'bg-red-500',
  yellow: 'bg-yellow-400',
  blue:   'bg-blue-500',
};

function getColor(value: number) {
  if (value >= 70) return 'green';
  if (value >= 40) return 'yellow';
  return 'red';
}

export default function ProgressBar({ value, color, height = 'sm' }: ProgressBarProps) {
  const c = color || getColor(value);
  return (
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${height === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[c]}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
