// Company reviews for the website.
//   GET  /api/company-reviews        -> approved reviews (public fields only)
//   POST /api/company-reviews        -> submit a review; it is stored as "pending"
//                                       and only shows on the site after approval
//                                       on review-admin.html.
import { getDatabase } from "@netlify/database";

const LIMITS = {
  company: 120,
  reviewer_name: 80,
  designation: 80,
  city: 80,
  industry: 80,
  review: 1500,
  email: 120,
  phone: 30,
};

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanReview(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, LIMITS.review);
}

async function submitterHash(req: Request): Promise<string> {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || req.headers.get("x-nf-client-connection-ip") || "unknown";
  const bytes = new TextEncoder().encode(`aqua-chem-reviews:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) return (await req.json()) as Record<string, unknown>;
  return Object.fromEntries((await req.formData()).entries());
}

export default async (req: Request) => {
  const db = getDatabase();

  if (req.method === "GET") {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 100);
    const rows = await db.sql`
      SELECT id, company, reviewer_name, designation, city, industry, rating, review, approved_at
      FROM company_reviews
      WHERE status = 'approved'
      ORDER BY approved_at DESC NULLS LAST, id DESC
      LIMIT ${limit}
    `;
    const [stats] = await db.sql`
      SELECT COUNT(*)::int AS count, COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS average
      FROM company_reviews WHERE status = 'approved'
    `;
    return Response.json(
      { reviews: rows, count: stats.count, average: stats.average },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await readBody(req);
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    // Honeypot: real visitors never fill this hidden field.
    if (clean(body.website, 200)) return Response.json({ ok: true }, { status: 201 });

    const review = {
      company: clean(body.company, LIMITS.company),
      reviewer_name: clean(body.reviewer_name, LIMITS.reviewer_name),
      designation: clean(body.designation, LIMITS.designation) || null,
      city: clean(body.city, LIMITS.city) || null,
      industry: clean(body.industry, LIMITS.industry) || null,
      rating: parseInt(String(body.rating ?? ""), 10),
      review: cleanReview(body.review),
      email: clean(body.email, LIMITS.email) || null,
      phone: clean(body.phone, LIMITS.phone) || null,
    };

    if (!review.company || !review.reviewer_name) {
      return Response.json({ error: "Please enter your company and your name." }, { status: 400 });
    }
    if (!(review.rating >= 1 && review.rating <= 5)) {
      return Response.json({ error: "Please choose a rating from 1 to 5 stars." }, { status: 400 });
    }
    if (review.review.length < 20) {
      return Response.json({ error: "Please write at least a couple of sentences in your review." }, { status: 400 });
    }
    if (review.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(review.email)) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const fingerprint = await submitterHash(req);
    const [recent] = await db.sql`
      SELECT COUNT(*)::int AS count
      FROM company_reviews
      WHERE submitter_hash = ${fingerprint} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (recent.count >= 3) {
      return Response.json(
        { error: "Too many reviews were submitted from this connection. Please try again later." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const [duplicate] = await db.sql`
      SELECT EXISTS(
        SELECT 1 FROM company_reviews
        WHERE LOWER(company) = LOWER(${review.company})
          AND LOWER(reviewer_name) = LOWER(${review.reviewer_name})
          AND review = ${review.review}
          AND created_at > NOW() - INTERVAL '24 hours'
      ) AS exists
    `;
    if (duplicate.exists) {
      return Response.json({ error: "This review has already been received." }, { status: 409 });
    }

    await db.sql`
      INSERT INTO company_reviews (company, reviewer_name, designation, city, industry, rating, review, email, phone, submitter_hash)
      VALUES (${review.company}, ${review.reviewer_name}, ${review.designation}, ${review.city}, ${review.industry},
              ${review.rating}, ${review.review}, ${review.email}, ${review.phone}, ${fingerprint})
    `;
    return Response.json({ ok: true }, { status: 201 });
  }

  return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
};

export const config = {
  path: "/api/company-reviews",
};
