import { defineConfig, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
// CLI status returns only this machine's local stack. Never point these tests at a hosted project.
const local = JSON.parse(
  execFileSync(
    process.execPath,
    ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'],
    { encoding: 'utf8' },
  ),
);
const api = new URL(local.API_URL);
if (!['127.0.0.1', 'localhost'].includes(api.hostname) || api.port !== '54321')
  throw Error('Local Supabase required');
process.env.TEST_LOCAL_SERVICE_KEY = local.SERVICE_ROLE_KEY;
export default defineConfig({
  testDir: './tests/local-account',
  workers: 1,
  use: { ...devices['Pixel 7'], baseURL: 'http://127.0.0.1:5173' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: api.origin,
      VITE_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY ?? local.ANON_KEY,
    },
  },
});
