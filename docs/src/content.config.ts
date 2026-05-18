import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { changelogsLoader } from 'starlight-changelogs/loader';

// One loader entry per scoped + umbrella package. The `base` is the URL
// slug the plugin emits pages under; `provider: 'changeset'` reads the
// Markdown that `@changesets/cli` writes on every release.
const packages = ['payload', 'qr', 'render', 'assets', 'cli', 'react', 'thai-qr-payment'];

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  changelogs: defineCollection({
    loader: changelogsLoader(
      packages.map((name) => ({
        base: `changelog/${name}`,
        title: name === 'thai-qr-payment' ? 'thai-qr-payment' : `@thai-qr-payment/${name}`,
        provider: 'changeset',
        changelog: `../packages/${name}/CHANGELOG.md`,
      })),
    ),
  }),
};
