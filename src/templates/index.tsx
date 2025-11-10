import { type FC } from "hono/jsx";

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
      <h1
        style={{
          marginTop: "20px",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        LangChain Text RAG API 🚀🐧
      </h1>
      <p style={{ textAlign: "center", fontFamily: "sans-serif" }}>
        This is a simple LangChain text RAG API that allows you to upload a text
        file and ask questions about it.
      </p>
    </Layout>
  );
};
