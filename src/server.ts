import { watch } from "node:fs";
import { join } from "node:path";
import { buildResume } from "./builder";

const LIVE_RELOAD_SCRIPT = `
<script>
(() => {
  const es = new EventSource("/__live_reload");
  es.onmessage = (e) => {
    if (e.data === "reload") window.location.reload();
  };
})();
</script>
</body>`;

export async function startDevServer(port = 3000): Promise<void> {
  const rootDir = process.cwd();
  await buildResume(rootDir);

  const clients = new Set<ReadableStreamDefaultController>();

  const notifyClients = () => {
    for (const controller of clients) {
      try {
        controller.enqueue("data: reload\n\n");
      } catch {
        clients.delete(controller);
      }
    }
  };

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const triggerRebuild = (_event: string, filename: string | null) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(`Detected change in ${filename ?? "files"}, rebuilding...`);
      try {
        await buildResume(rootDir);
        notifyClients();
      } catch (err) {
        console.error("Build error:", err);
      }
    }, 80);
  };

  watch(join(rootDir, "content"), triggerRebuild);
  watch(join(rootDir, "templates"), triggerRebuild);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/__live_reload") {
        let ctrl: ReadableStreamDefaultController;
        const stream = new ReadableStream({
          start(controller) {
            ctrl = controller;
            clients.add(controller);
          },
          cancel() {
            clients.delete(ctrl);
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      let pathname = url.pathname;
      if (pathname === "/") pathname = "/index.html";
      if (pathname === "/customize") pathname = "/customize.html";

      const filePath = join(rootDir, pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        if (pathname.endsWith(".html")) {
          const html = await file.text();
          return new Response(html.replace("</body>", LIVE_RELOAD_SCRIPT), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        return new Response(file);
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`\nLocal server running:`);
  console.log(`  Public Resume:       http://localhost:${server.port}/`);
  console.log(`  Tailoring Workbench: http://localhost:${server.port}/customize.html\n`);
}
