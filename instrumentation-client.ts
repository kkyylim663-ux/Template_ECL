/**
 * T75: browser-side error reporting, loaded before hydration so an uncaught
 * render error is reported. Same switch as the server entry: `initObservability`
 * returns on the DSN check, and the SDK's chunk is never even fetched.
 */
import { initObservability } from '@/lib/observability/setup';

void initObservability();
