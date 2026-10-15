import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { IntlScope } from '@/lib/i18n/scope';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('register', { region, path: '/register', index: false });
}

/**
 * Sign-up, in the reference's shape: the `signup-card` — a 430px card (header,
 * logo slot and the two-step form, all inside RegisterForm) beside the promo
 * slot the reference fills with its poster.
 */
export default async function RegisterPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;

  return (
    <IntlScope namespaces={['auth']}>
      <div className="signup-card">
        <RegisterForm region={region} />
        <div className="signup-bg" aria-hidden="true">
          <span className="game-placeholder" />
        </div>
      </div>
    </IntlScope>
  );
}
