// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightImageZoom from 'starlight-image-zoom';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import starlightHeadingBadges from 'starlight-heading-badges';
import starlightChangelogs from 'starlight-changelogs';
import starlightScrollToTop from 'starlight-scroll-to-top';
import starlightGitHubAlerts from 'starlight-github-alerts';
import { ion } from 'starlight-ion-theme';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';
import { unified } from '@astrojs/markdown-remark';

// Custom domain via js.org — Pages serves at root of `thai-qr-payment.js.org`.
// CNAME file in `public/` pins the domain across deploys.
//
// One TypeDoc instance per scoped package so each gets its own sidebar
// section and stable slug under `api/<pkg>/`. Sharing a single instance
// across packages collapses the output into one folder with cross-linking
// problems; per-package keeps boundaries clean.
const packages = [
  { name: 'thai-qr-payment', dir: 'thai-qr-payment' },
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
        // typedoc-plugin-markdown emits namespace folders with `@` and
        // PascalCase that Astro's content-collection slugifier rewrites
        // case-insensitively, breaking inter-page links. Flatten the
        // output into a single directory keyed by member name so links
        // resolve regardless of case / `@` quirks.
        flattenOutputFiles: true,
      },
    }),
    sidebarGroup: typeDocSidebarGroup,
  };
});

export default defineConfig({
  site: 'https://thai-qr-payment.js.org',
  // Astro 7 defaults to the Sätteri markdown processor; the Starlight plugin
  // ecosystem (image-zoom, links-validator, …) still hooks the unified
  // pipeline, so pin the processor back to unified until they catch up.
  markdown: {
    processor: unified(),
  },
  integrations: [
    react(),
    starlight({
      title: {
        en: 'thai-qr-payment',
        th: 'thai-qr-payment',
      },
      description:
        'Zero-dependency Thai QR Payment (EMVCo MPM) toolkit — payload builder, QR encoder, SVG card renderer, brand assets, React bindings, CLI.',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        th: { label: 'ไทย', lang: 'th' },
      },
      // Fontsource self-hosts the WOFF2 files so we avoid FOUT and a
      // round-trip to Google's CDN. Order matters — fonts first, brand.css
      // last so brand vars override fontsource's bare @font-face.
      customCss: [
        '@fontsource/inter/400.css',
        '@fontsource/inter/500.css',
        '@fontsource/inter/600.css',
        '@fontsource/inter/700.css',
        '@fontsource/jetbrains-mono/400.css',
        '@fontsource/jetbrains-mono/500.css',
        '@fontsource/noto-sans-thai-looped/400.css',
        '@fontsource/noto-sans-thai-looped/500.css',
        '@fontsource/noto-sans-thai-looped/600.css',
        '@fontsource/noto-sans-thai-looped/700.css',
        './src/styles/brand.css',
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/uunw/thai-qr-payment' },
        { icon: 'npm', label: 'npm', href: 'https://www.npmjs.com/package/thai-qr-payment' },
      ],
      editLink: {
        baseUrl: 'https://github.com/uunw/thai-qr-payment/edit/main/docs/',
      },
      lastUpdated: true,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
      components: {
        // Force sidebar-topics' Sidebar override regardless of plugin
        // ordering — Ion + Starlight default both try to claim Sidebar.
        Sidebar: 'starlight-sidebar-topics/overrides/Sidebar.astro',
        // Hide the "content not available in your language" banner on
        // auto-generated API + changelog routes — they're code-derived,
        // never translated by humans.
        FallbackContentNotice: './src/overrides/FallbackContentNotice.astro',
      },
      plugins: [
        // Ion theme — base layout / typography. brand.css still overrides
        // the accent colors so the BoT navy stays the primary cue.
        // overrides.Sidebar disabled so starlight-sidebar-topics' Sidebar
        // wins; otherwise Ion's Sidebar wipes out the topic switcher.
        ion({ icons: {}, overrides: { Sidebar: false } }),
        // Click QR sample images to zoom — they're shrunk in body and the
        // user often wants to scan with a phone.
        starlightImageZoom(),
        // GitHub-flavoured `> [!NOTE]` / `[!WARNING]` callouts render as
        // proper Starlight asides without the `:::note` MDX syntax.
        starlightGitHubAlerts(),
        // Mark `new in 1.1`, `deprecated`, etc. badges on headings via
        // `## My heading [!badge primary New]` syntax.
        starlightHeadingBadges(),
        // Floating "↑ Top" button on long pages.
        starlightScrollToTop(),
        // Auto-render `/changelog/<pkg>/` from each package's CHANGELOG.md.
        // Loader config lives in `src/content.config.ts` per the plugin's
        // design — call signature here is zero-arg.
        starlightChangelogs(),
        // One plugin per package so each gets its own sidebar group + slug.
        // Must run BEFORE sidebar-topics so typedoc's sidebar pushes don't
        // wipe out the topic switcher.
        ...typeDocInstances.map((t) => t.plugin),
        // Topic-grouped sidebar — replaces the flat sidebar with switchable
        // tabs (Lib docs / Reference / API / LLMs) so the nav stops being
        // a wall of 16+ pages.
        starlightSidebarTopics(
          [
            {
              label: 'Lib docs',
              link: '/install/',
              id: 'guide',
              icon: 'open-book',
              items: [
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
              ],
            },
            {
              label: 'Reference',
              link: '/reference/spec/',
              id: 'reference',
              icon: 'document',
              items: [
                { label: 'Spec coverage', slug: 'reference/spec' },
                { label: 'Bundle sizes', slug: 'reference/sizes' },
                { label: 'CDN usage', slug: 'reference/cdn' },
                { label: 'Edge runtimes', slug: 'reference/edge' },
              ],
            },
            {
              label: 'API reference',
              link: '/api/payload/readme/',
              id: 'api',
              icon: 'puzzle',
              // typedoc's sidebarGroup is a JS Symbol the plugin patches
              // back into Starlight's flat sidebar — sidebar-topics
              // doesn't honour that patch, so we hardcode one readme entry
              // per package and let typedoc's own in-page nav handle the
              // sub-tree.
              items: packages.map(({ name }) => ({
                label:
                  name === 'thai-qr-payment'
                    ? 'thai-qr-payment (umbrella)'
                    : `@thai-qr-payment/${name}`,
                link: `/api/${name}/readme/`,
              })),
            },
            {
              label: 'Changelog',
              link: '/changelog/thai-qr-payment/',
              id: 'changelog',
              icon: 'list-format',
              items: packages.map(({ name }) => ({
                label:
                  name === 'thai-qr-payment'
                    ? 'thai-qr-payment (umbrella)'
                    : `@thai-qr-payment/${name}`,
                link: `/changelog/${name}/`,
              })),
            },
            {
              label: 'For LLMs',
              link: '/llms/',
              id: 'llms',
              icon: 'rocket',
              items: [
                { label: 'Overview', slug: 'llms' },
                {
                  label: 'llms.txt — index',
                  // Absolute URL so Starlight i18n doesn't prepend /th/ on
                  // Thai pages; .txt files are emitted once at the root.
                  link: 'https://thai-qr-payment.js.org/llms.txt',
                  attrs: { target: '_blank', rel: 'noopener' },
                },
                {
                  label: 'llms-full.txt — full docs',
                  link: 'https://thai-qr-payment.js.org/llms-full.txt',
                  attrs: { target: '_blank', rel: 'noopener' },
                },
                {
                  label: 'llms-small.txt — abridged',
                  link: 'https://thai-qr-payment.js.org/llms-small.txt',
                  attrs: { target: '_blank', rel: 'noopener' },
                },
              ],
            },
          ],
          {
            // Typedoc + Changelogs pages aren't in the static `items` arrays
            // above — map their slug globs to the right topic id so the
            // plugin doesn't error on "unlisted" pages.
            topics: {
              api: ['/api/**', '/th/api/**', 'api/**'],
              changelog: ['/changelog/**', '/th/changelog/**', 'changelog/**'],
            },
          },
        ),
        // Validate every internal link at build time so we don't ship 404s.
        // Skip typedoc output — its case-insensitive slugifier emits links
        // that don't match the on-disk paths for namespaces / scoped pkgs;
        // we trust typedoc's own routing inside those trees.
        starlightLinksValidator({
          errorOnInvalidHashes: false,
          exclude: ['/api/**', '/changelog/**'],
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
      ],
    }),
  ],
});
