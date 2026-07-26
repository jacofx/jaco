// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en-NG" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>SolveConnect | Find trusted help and opportunities in Nigeria</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta
          name="description"
          content="SolveConnect connects individuals, businesses, communities, and trusted service providers to solve problems, share skills, and create opportunities in Ibadan and across Nigeria."
        />
        <meta
          name="keywords"
          content="problem-solving platform, service marketplace Nigeria, professional services Ibadan, business networking, community collaboration"
        />
        <meta name="theme-color" content="#0B6B4F" />
        <meta name="color-scheme" content="light" />
        <meta name="robots" content="index,follow" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SolveConnect" />
        <meta property="og:title" content="SolveConnect | Find the right people to solve problems faster" />
        <meta
          property="og:description"
          content="Request help, offer your skills, and build trusted local connections online and offline."
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="SolveConnect" />
        <meta
          name="twitter:description"
          content="Find trusted people, services, and communities to move your next problem forward."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'SolveConnect',
              description: 'A problem-solving, professional services, and community collaboration platform based in Ibadan, Nigeria.',
              areaServed: { '@type': 'Country', name: 'Nigeria' },
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Ibadan',
                addressCountry: 'NG',
              },
            }),
          }}
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { box-sizing: border-box; }
              html, body { background: #F6F9F7; }
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
              :focus-visible { outline: 3px solid rgba(11, 107, 79, 0.35); outline-offset: 2px; }
              ::selection { background: #D6F2E6; color: #102A23; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}
