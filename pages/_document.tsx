import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  // Next.js automatically applies basePath from next.config.js to all paths
  // On Vercel: basePath is NOT set in config, so paths are NOT prefixed
  // On GitHub Pages: basePath is '/gpa' in config, so Next.js auto-prefixes paths
  // Just use the path normally - Next.js will handle basePath automatically
  return (
    <Html lang="no">
      <Head>
        {/* Favicon - Next.js automatically applies basePath from config */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
