/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@new-szn/db', '@new-szn/types'],
  experimental: {
    // Every dashboard tab is a dynamic route (reads the session cookie via auth()),
    // which opts it out of the Router Cache by default in Next 14 — so switching
    // back to a tab you just visited re-runs the full server fetch every time.
    // Matches the 30s revalidate window already used by apiGet (lib/api.ts) so
    // cached navigations and cached fetches expire together.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
