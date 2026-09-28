CREATE TABLE company_reviews (
  id SERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  designation TEXT,
  city TEXT,
  industry TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX company_reviews_status_idx ON company_reviews (status, approved_at DESC);
