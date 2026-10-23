// `node --import ./scripts/lib/register-import-meta-env.mjs <script>`
import { register } from 'node:module';
register('./import-meta-env-loader.mjs', import.meta.url);
