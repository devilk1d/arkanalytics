interface QuoteSidebarProps {
  quote: string;
  author: string;
}

export default function QuoteSidebar({ quote, author }: QuoteSidebarProps) {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-black w-[38%] min-h-screen px-16 relative overflow-hidden shrink-0">

      {/* Concentric circles texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white"
            style={{
              width:  `${160 + i * 100}px`,
              height: `${160 + i * 100}px`,
              top:  '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-xs">
        {/* Big quotation mark */}
        <div className="font-display text-7xl text-white/20 leading-none mb-4 select-none">"</div>

        <p className="font-display text-white text-2xl font-bold leading-snug mb-8">
          {quote}
        </p>

        <div className="flex items-center gap-3">
          <div className="w-8 h-px bg-gray-600" />
          <p className="text-gray-400 text-sm">{author}</p>
        </div>
      </div>
    </div>
  );
}
