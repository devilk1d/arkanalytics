interface AvatarProps {
  initials: string;
  color?: string;   // tailwind bg color like 'bg-blue-500'
  size?: 'sm' | 'md' | 'lg';
  src?: string;
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };

const colorMap: Record<string, string> = {
  NP: 'bg-blue-500',
  FA: 'bg-purple-500',
  MM: 'bg-pink-500',
  RP: 'bg-orange-500',
  AM: 'bg-gray-800',
  SJ: 'bg-teal-500',
  MC: 'bg-indigo-500',
  ED: 'bg-rose-500',
};

export default function Avatar({ initials, color, size = 'md', src }: AvatarProps) {
  const bg = color || colorMap[initials] || 'bg-gray-400';
  return (
    <div className={`${sizes[size]} ${bg} rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden`}>
      {src ? <img src={src} alt={initials} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
