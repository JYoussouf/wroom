// Pre-alpha in-app feature requests. The form in the web/native app POSTs here;
// we file it as a GitHub issue on the wroom repo using a server-held token, so
// the token never touches the client. Intentionally unauthenticated — anyone
// trying the pre-alpha can send feedback — but rate-limited and length-capped.
import { Hono } from "hono";
import type { Env, Variables } from "./db";

export const feedback = new Hono<{ Bindings: Env; Variables: Variables }>();

type Kind = "feature_idea" | "bug";

const KIND_LABEL: Record<Kind, string> = {
  feature_idea: "feature-request",
  bug: "bug",
};

const KIND_TITLE: Record<Kind, string> = {
  feature_idea: "Feature idea",
  bug: "Bug report",
};

feedback.post("/", async (c) => {
  let payload: { text?: unknown; kind?: unknown };
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request." }, 400);
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const kind: Kind = payload.kind === "bug" ? "bug" : "feature_idea";

  if (text.length < 3) {
    return c.json({ error: "Add a few words so we know what you mean." }, 400);
  }

  const token = c.env.GITHUB_TOKEN;
  const repo = c.env.GITHUB_REPO; // e.g. "JYoussouf/wroom"
  if (!token || !repo) {
    return c.json({ error: "Feedback isn't configured on the server yet." }, 503);
  }

  // Derive a clean issue title from the first line; the full text is the body.
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? text;
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine;

  const issueBody = `${text}\n\n---\n_Filed from the wroom pre-alpha in-app feature request._`;

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "wroom-api",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: `[${KIND_TITLE[kind]}] ${title.slice(0, 120)}`,
        body: issueBody.slice(0, 8000),
        labels: [KIND_LABEL[kind], "pre-alpha"],
      }),
    });
  } catch {
    return c.json({ error: "Couldn't reach GitHub. Try again later." }, 502);
  }

  if (!res.ok) {
    return c.json({ error: "Couldn't file the request. Try again later." }, 502);
  }

  const issue = (await res.json()) as { html_url?: string; number?: number };
  return c.json({ ok: true, url: issue.html_url ?? null, number: issue.number ?? null });
});
