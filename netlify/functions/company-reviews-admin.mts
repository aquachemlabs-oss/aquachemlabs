// Moderation API for company reviews, used by review-admin.html.
// Every request must send "Authorization: Bearer <REVIEWS_ADMIN_KEY>".
//   GET  /api/company-reviews/admin?status=pending|approved|rejected
//   POST /api/company-reviews/admin  { id, action: "approve" | "reject" | "delete" }
import { getDatabase } from "@netlify/database";
import { createHash, timingSafeEqual } from "node:crypto";

const STATUSES = ["pending", "approved", "rejected"];

function authorised(req: Request, key: string): boolean {
  const sent = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = createHash("sha256").update(sent).digest();
  const b = createHash("sha256").update(key).digest();
  return sent.length > 0 && timingSafeEqual(a, b);
}

export default async (req: Request) => {
  const key = Netlify.env.get("REVIEWS_ADMIN_KEY");
  if (!key) {
    return Response.json(
      { error: "Review approval is not set up yet. Add a REVIEWS_ADMIN_KEY environment variable in Netlify." },
      { status: 503 },
    );
  }
  if (!authorised(req, key)) {
    return Response.json({ error: "Wrong admin key." }, { status: 401 });
  }

  const db = getDatabase();
  const headers = { "Cache-Control": "no-store" };

  if (req.method === "GET") {
    const status = new URL(req.url).searchParams.get("status") || "pending";
    if (!STATUSES.includes(status)) return Response.json({ error: "Unknown status." }, { status: 400 });
    const rows = await db.sql`
      SELECT * FROM company_reviews WHERE status = ${status} ORDER BY created_at DESC LIMIT 200
    `;
    const counts = await db.sql`SELECT status, COUNT(*)::int AS count FROM company_reviews GROUP BY status`;
    return Response.json(
      { reviews: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c.count])) },
      { headers },
    );
  }

  if (req.method === "POST") {
    let body: { id?: unknown; action?: unknown };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    const id = parseInt(String(body.id ?? ""), 10);
    if (!id) return Response.json({ error: "Missing review id." }, { status: 400 });

    if (body.action === "approve") {
      await db.sql`UPDATE company_reviews SET status = 'approved', approved_at = NOW() WHERE id = ${id}`;
    } else if (body.action === "reject") {
      await db.sql`UPDATE company_reviews SET status = 'rejected', approved_at = NULL WHERE id = ${id}`;
    } else if (body.action === "delete") {
      await db.sql`DELETE FROM company_reviews WHERE id = ${id}`;
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    return Response.json({ ok: true }, { headers });
  }

  return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
};

export const config = {
  path: "/api/company-reviews/admin",
};
