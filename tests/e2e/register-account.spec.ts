import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * T42b: a registered account is a real mock member. Every run uses fresh names,
 * because registrations persist in `.mock-data/users.json` across runs.
 */
const stamp = Date.now().toString(36);
let phoneSeq = 0;

/** A mobile number no other registration in this run uses. */
function freshPhone() {
  phoneSeq += 1;
  return `+601${String(Date.now() + phoneSeq).slice(-8)}`;
}

function registration(tag: string, overrides: Record<string, string> = {}) {
  return {
    email: `${tag}.${stamp}@example.test`,
    emailOtp: '123456',
    username: `${tag}${stamp}`,
    password: 'Secret123',
    fullName: 'Ada Lim',
    nickname: 'ada',
    phone: freshPhone(),
    ...overrides,
  };
}

async function registerViaApi(request: APIRequestContext, body: Record<string, string>) {
  return request.post('/api/mock-auth/register', { data: body });
}

async function fillRegistration(page: Page, body: ReturnType<typeof registration>) {
  await page.goto('/my/register');
  // Dev mode compiles the client bundle on first hit; the submit must not beat hydration.
  await page.waitForLoadState('networkidle');
  await page.fill('input[autocomplete="email"]', body.email);
  await page.fill('input[autocomplete="one-time-code"]', body.emailOtp);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.fill('input[autocomplete="username"]', body.username);
  const passwords = page.locator('input[autocomplete="new-password"]');
  await passwords.nth(0).fill(body.password);
  await passwords.nth(1).fill(body.password);
  await page.fill('input[autocomplete="name"]', body.fullName);
  await page.getByPlaceholder('Nick name').fill(body.nickname);
  // The dial code is picked as +60 by default; the field takes the local part.
  await page.fill('input[type="tel"]', body.phone.slice(3));
}

test('registering creates the account and signs it in on the home page', async ({ page, context }) => {
  const body = registration('reg');
  await fillRegistration(page, body);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(page).toHaveURL(/\/my\/?$/);
  const session = await (await context.request.get('/api/mock-auth/session')).json();
  expect(session.d).toMatchObject({ member: true, username: body.username, walletOpening: 'zero' });
});

test('a double click on sign-up sends one registration request', async ({ page }) => {
  const body = registration('dbl');
  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/mock-auth/register')) posts += 1;
  });
  await fillRegistration(page, body);
  await page.getByRole('button', { name: 'Sign up', exact: true }).dblclick();

  await expect(page).toHaveURL(/\/my\/?$/);
  expect(posts).toBe(1);
});

test('a taken username is refused on submit and the form says so', async ({ page, request }) => {
  const body = registration('tkn');
  expect((await registerViaApi(request, body)).status()).toBe(200);

  await fillRegistration(page, { ...body, email: `tkn2.${stamp}@example.test` });
  const response = page.waitForResponse((r) => r.url().includes('/api/mock-auth/register'));
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  expect((await response).status()).toBe(409);
  await expect(page.getByText('This username is already taken')).toBeVisible();
  await expect(page).toHaveURL(/\/my\/register/);
});

test('the register API refuses a taken email, a taken mobile and a wrong code', async ({ request }) => {
  const base = registration('api', { email: `api.${stamp}@example.test` });
  expect((await registerViaApi(request, base)).status()).toBe(200);

  const sameEmail = await registerViaApi(request, registration('apb', { email: base.email }));
  expect(sameEmail.status()).toBe(409);
  expect((await sameEmail.json()).d).toEqual({ field: 'email' });

  const sameMobile = await registerViaApi(
    request,
    registration('apc', { email: `apc.${stamp}@example.test`, phone: base.phone }),
  );
  expect(sameMobile.status()).toBe(409);
  expect((await sameMobile.json()).d).toEqual({ field: 'mobile' });

  const wrongCode = await registerViaApi(
    request,
    registration('apd', { emailOtp: '000000', email: `apd.${stamp}@example.test`, phone: '+6099999999' }),
  );
  expect(wrongCode.status()).toBe(400);
  expect((await wrongCode.json()).d).toEqual({ field: 'emailOtp' });
});

test('the new account signs in by username, email and phone OTP; a wrong password is refused', async ({
  request,
}) => {
  const body = registration('lgn', { email: `lgn.${stamp}@example.test` });
  expect((await registerViaApi(request, body)).status()).toBe(200);

  const byName = await request.post('/api/mock-auth/login', {
    data: { identifier: body.username, password: body.password },
  });
  expect(byName.status()).toBe(200);
  expect((await byName.json()).d).toEqual({ username: body.username });

  const byEmail = await request.post('/api/mock-auth/login', {
    data: { identifier: body.email, password: body.password },
  });
  expect(byEmail.status()).toBe(200);

  const byPhone = await request.post('/api/mock-auth/login', {
    data: { identifier: body.phone, otp: '123456' },
  });
  expect(byPhone.status()).toBe(200);

  const wrong = await request.post('/api/mock-auth/login', {
    data: { identifier: body.username, password: 'Wrong123' },
  });
  expect(wrong.status()).toBe(401);
});

test('the preset demo account still signs in', async ({ request }) => {
  const response = await request.post('/api/mock-auth/login', {
    data: { identifier: 'demo_player', password: 'Test1234!' },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).d).toEqual({ username: 'demo_player' });
});

test('plain http sign-in sets an httpOnly session cookie without Secure', async ({ request }) => {
  const response = await request.post('/api/mock-auth/login', {
    data: { identifier: 'demo_player', password: 'Test1234!' },
  });
  const setCookie = response.headers()['set-cookie'] ?? '';
  expect(setCookie).toContain('brand_session=');
  expect(setCookie).toMatch(/HttpOnly/i);
  expect(setCookie).not.toMatch(/;\s*Secure/i);
});
