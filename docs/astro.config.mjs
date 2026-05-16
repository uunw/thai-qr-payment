// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

// Custom domain via js.org — Pages serves at root of `thai-qr-payment.js.org`.
// CNAME file in `public/` pins the domain across deploys.
//
// One TypeDoc instance per scoped package so each gets its own sidebar
// section and stable slug under `api/<pkg>/`. Sharing a single instance
// across packages collapses the output into one folder with cross-linking
// problems; per-package keeps boundaries clean.
const packages = [
  { name: 'payload', dir: '@thai-qr-payment/payload' },
  { name: 'qr', dir: '@thai-qr-payment/qr' },
  { name: 'render', dir: '@thai-qr-payment/render' },
  { name: 'assets', dir: '@thai-qr-payment/assets' },
  { name: 'react', dir: '@thai-qr-payment/react' },
];

const typeDocInstances = packages.map(({ name, dir }) => {
  const [TypeDocPlugin, typeDocSidebarGroup] = createStarlightTypeDocPlugin();
  return {
    name,
    dir,
    plugin: TypeDocPlugin({
      entryPoints: [`../packages/${name}/src/index.ts${name === 'react' ? 'x' : ''}`],
      tsconfig: `../packages/${name}/tsconfig.json`,
      output: `api/${name}`,
      sidebar: { label: name, collapsed: true },
      typeDoc: {
        excludeInternal: true,
        excludePrivate: true,
        readme: 'none',
        gitRevision: 'main',
        sourceLinkTemplate: `https://github.com/uunw/thai-qr-payment/blob/main/{path}#L{line}`,
      },
    }),
    sidebarGroup: typeDocSidebarGroup,
  };
});

export default defineConfig({
  site: 'https://thai-qr-payment.js.org',
  integrations: [
    react(),
    starlight({
      title: 'thai-qr-payment',
      description:
        'Zero-dependency Thai QR Payment (EMVCo MPM) toolkit — payload builder, QR encoder, SVG card renderer, brand assets, React bindings, CLI.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/uunw/thai-qr-payment' },
      ],
      editLink: {
        baseUrl: 'https://github.com/uunw/thai-qr-payment/edit/main/docs/',
      },
      lastUpdated: true,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
      plugins: [
        // Validate every internal link at build time so we don't ship 404s.
        // Skip typedoc output — its case-insensitive slugifier emits links
        // that don't match the on-disk paths for namespaces / scoped pkgs;
        // we trust typedoc's own routing inside those trees.
        starlightLinksValidator({
          errorOnInvalidHashes: false,
          exclude: ['/api/**'],
        }),
        // Emit /llms.txt + /llms-full.txt for LLM ingestion. Defaults are
        // sane: full doc dump under /llms-full.txt, brief index at /llms.txt.
        starlightLlmsTxt({
          projectName: 'thai-qr-payment',
          description:
            'Zero-dependency Thai QR Payment (EMVCo MPM) toolkit for JavaScript/TypeScript. Builds the wire payload, encodes the QR matrix, renders the SVG card, ships React bindings + CLI. Runs in browsers, Node ≥ 18, Bun, Deno, Cloudflare Workers, Vercel Edge.',
          optionalLinks: [
            { label: 'GitHub', url: 'https://github.com/uunw/thai-qr-payment' },
            { label: 'npm', url: 'https://www.npmjs.com/package/thai-qr-payment' },
          ],
          // demo.mdx hydrates a React island; raw-content mode skips MDX
          // rendering so the build doesn't try to SSR the framework component
          // into a plain-text dump.
          rawContent: true,
          exclude: ['demo'],
        }),
        // One plugin per package so each gets its own sidebar group + slug.
        ...typeDocInstances.map((t) => t.plugin),
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Overview', slug: 'index' },
            { label: 'Install', slug: 'install' },
            { label: 'Live demo', slug: 'demo' },
          ],
        },
        {
          label: 'Guide',
          items: [
            { label: 'Payload (EMVCo TLV)', slug: 'guide/payload' },
            { label: 'Slip Verify', slug: 'guide/slip-verify' },
            { label: 'BOT barcode', slug: 'guide/barcode' },
            { label: 'QR encoder', slug: 'guide/qr' },
            { label: 'SVG renderer', slug: 'guide/render' },
            { label: 'Brand assets', slug: 'guide/assets' },
            { label: 'React component', slug: 'guide/react' },
            { label: 'CLI', slug: 'guide/cli' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Spec coverage', slug: 'reference/spec' },
            { label: 'Bundle sizes', slug: 'reference/sizes' },
            { label: 'CDN usage', slug: 'reference/cdn' },
            { label: 'Edge runtimes', slug: 'reference/edge' },
          ],
        },
        {
          label: 'API reference',
          collapsed: false,
          items: typeDocInstances.map((t) => t.sidebarGroup),
        },
        {
          label: 'For LLMs',
          collapsed: true,
          items: [
            {
              label: 'llms.txt — index',
              link: '/llms.txt',
              attrs: { target: '_blank', rel: 'noopener' },
            },
            {
              label: 'llms-full.txt — full docs',
              link: '/llms-full.txt',
              attrs: { target: '_blank', rel: 'noopener' },
            },
            {
              label: 'llms-small.txt — abridged',
              link: '/llms-small.txt',
              attrs: { target: '_blank', rel: 'noopener' },
            },
          ],
        },
      ],
    }),
  ],
});
