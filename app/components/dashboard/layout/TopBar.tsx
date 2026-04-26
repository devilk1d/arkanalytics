interface TopBarProps {
  workspace: string;
  page: string;
}

export default function TopBar({ workspace, page }: TopBarProps) {
  return (
    <div className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-bold text-black">{workspace}</span>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500">{page}</span>
      </div>

      {/* AI assistant button */}
      <button className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white hover:bg-gray-800 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </button>
    </div>
  );
}
