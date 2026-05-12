// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
//
// GitHub Pages serves project pages from
// `https://<user>.github.io/<repo>/`, so the `site` + `base` pair below
// keeps every URL + asset reference correct after the rewrite. The
// interactive demo component is a React island hydrated via
// `client:load` — that's why `@astrojs/react` is wired here.
export default defineConfig({
  site: 'https://uunw.github.io',
  base: '/thai-qr-payment',
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
      ],
    }),
  ],
});
