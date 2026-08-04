const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const isNextStaticAsset = req.url?.startsWith("/_next/static/");
    const acceptsHtml = req.headers.accept?.includes("text/html");

    if (acceptsHtml && !isNextStaticAsset) {
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    }

    handle(req, res);
  }).listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
