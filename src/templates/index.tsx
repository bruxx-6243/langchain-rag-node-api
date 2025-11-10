import type { FC } from "hono/jsx";

const Layout: FC = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>LangChain RAG API</title>
      </head>
      <body>{children}</body>
    </html>
  );
};

export const IndexPage: FC = () => {
  return (
    <Layout>
      <h1>LangChain RAG API</h1>
    </Layout>
  );
};
