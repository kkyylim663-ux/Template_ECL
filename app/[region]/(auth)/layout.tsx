/**
 * Auth pages sit outside the shop window: the reference renders them as a
 * full-height card over a plain backdrop, with no site header, drawer or footer.
 * `<main>` stays on the wrapper so every page keeps the landmark the smoke test
 * and screen readers look for.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="bg-wrapper">{children}</main>;
}
