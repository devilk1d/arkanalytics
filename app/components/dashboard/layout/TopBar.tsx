import Image from 'next/image';

interface TopBarProps {
  workspace: string;
  logoUrl?: string | null;
  page: string;
}

export default function TopBar({ workspace, logoUrl, page }: TopBarProps) {
  return (
    <div className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-1.5 text-sm">
        <div className="w-7 h-7 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="w-full h-full object-cover" />
          ) : (
            <Image src="/images/logo_arka_hitam.png" alt="Arka" width={16} height={16} />
          )}
        </div>
        <span className="font-bold text-black">{workspace}</span>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500">{page}</span>
      </div>
    </div>
  );
}
