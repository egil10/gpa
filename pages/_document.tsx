import { Html, Head, Main, NextScript } from 'next/document';

// BasePath constant - matches next.config.js
// In production, this is '/gpa' for GitHub Pages deployment
const isProduction = process.env.NODE_ENV === 'production';
const BASEPATH = isProduction ? '/gpa' : '';

export default function Document() {
  return (
    <Html lang="no">
      <Head>
        {/* Favicon with correct basePath for GitHub Pages */}
        {/* Next.js static export with basePath requires explicit path */}
        <link rel="icon" href={`${BASEPATH}/favicon.svg`} type="image/svg+xml" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
