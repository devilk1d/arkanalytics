import Image from 'next/image';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';

const sg = Space_Grotesk({ subsets: ['latin'] });

export default function AuthLogo({ centered = false }: { centered?: boolean }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 group w-fit ${centered ? 'mx-auto' : ''}`}
    >
      <div className="transition-transform duration-300 group-hover:rotate-12">
        <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={30} height={30} />
      </div>
      <span className={`${sg.className} font-semibold text-lg text-black`}>Arkanalytics</span>
    </Link>
  );
}
