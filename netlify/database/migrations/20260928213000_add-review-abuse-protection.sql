ALTER TABLE company_reviews ADD COLUMN submitter_hash TEXT;

CREATE INDEX company_reviews_submitter_recent_idx
  ON company_reviews (submitter_hash, created_at DESC);
