import Image from 'next/image';
import Link from 'next/link';
import { brand } from '@/config/brand';
import { AccountSlot } from './AccountSlot';
import { HeaderMenu } from './HeaderMenu';
import { VoucherEntry } from '@/components/content/VoucherEntry';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Desktop header: logo, primary menu cards, account area. Hidden below 769px. */
export function Header({ region }: { region: string }) {
  return (
    <header className="border-line bg-panel hidden border-b desktop:block">
      <div className="flex h-[68px] items-center gap-6 px-[var(--pad-page-x)]">
        <Link href={`/${region}`} className="flex shrink-0 items-center gap-2.5">
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={brand.logo.width}
            height={brand.logo.height}
            unoptimized
            priority
          />
          <span className="text-ink text-lg font-semibold tracking-wide">{brand.logo.text}</span>
        </Link>

        <HeaderMenu region={region} />

        <div className="ml-auto flex items-center gap-4">
          <VoucherEntry region={region} variant="header" />
          <LanguageSwitcher />
          <AccountSlot region={region} />
        </div>
      </div>
    </header>
  );
}
