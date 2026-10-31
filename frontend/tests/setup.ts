// Vite fills in import.meta.env at build time. Plain Node has none, so give
// api.ts the same value it would get from VITE_API_URL.
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!/\/src\/api\.ts/.test(url) || !result.source) return result;
    const source = result.source
      .toString()
      .replaceAll('import.meta.env', '({ VITE_API_URL: process.env.VITE_API_URL })');
    return { ...result, source };
  },
});
