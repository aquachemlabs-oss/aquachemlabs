# SEO Operations — Aqua Chem Labs

## Repository-completed items
- robots.txt declares the production sitemap and blocks admin/API paths.
- sitemap.xml contains clean canonical URLs, plant pages, location pages, chemical topic pages, HTML technical guides, engineering articles and service PDFs.
- _redirects canonicalizes HTTP and www traffic to https://aquachemlabs.com/ and maps legacy .html URLs to clean routes.
- Every public HTML page is required to have one H1, a canonical HTTPS/non-www URL, a title and a meta description.
- Build output receives BreadcrumbList schema on public pages and WebSite schema on the homepage.
- Services and Products expose visible FAQ content with matching FAQPage schema.
- Run `npm run seo-hardening-audit` for repository QA.
- Set `LIVE_BASE_URL=https://aquachemlabs.com` in a networked CI runner to smoke-test production URLs.

## Search Console actions requiring the site owner's Google account

1. Open Google Search Console for aquachemlabs.com.
2. Submit https://aquachemlabs.com/sitemap.xml under Sitemaps.
3. Use URL Inspection on the homepage, Services, Products, major plant pages, location pages and new topic pages.
4. Request indexing for important URLs that are not indexed.
5. Review Page indexing for 401/403, redirect, canonical and crawl anomalies.
6. Confirm the preferred canonical is the HTTPS non-www URL.
7. Recheck indexing after Google recrawls the deployment.

Do not add a fake google-site-verification token to the repository. Use the real property verification method in Search Console.

## Off-site growth actions

Backlinks and Google Business Profile optimisation cannot be truthfully completed from this repository. The site is prepared through consistent company identity, service/location pages, technical resources and enquiry CTAs.

Recommended legitimate sources include supplier/manufacturer directories, industry associations, project/client case studies with permission, local business directories, trade publications and partner references. Avoid paid link schemes, automated link networks and unrelated directory spam.

For Google Business Profile, keep the business name, category, phone, website, service areas and address consistent with the website and collect genuine customer reviews.