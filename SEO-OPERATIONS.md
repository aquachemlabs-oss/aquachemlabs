# SEO Operations — Aqua Chem Labs

## Repository-completed items
- robots.txt declares the production sitemap, provides explicit crawl permissions for Googlebot and Googlebot-Image, and blocks private/admin/API paths.
- sitemap.xml contains clean canonical URLs, lastmod dates, change frequencies, and priorities for all 55 public indexable HTML routes and 10 engineering service PDFs.
- _redirects permanently consolidates HTTP, www, and all 44 Netlify regional domain aliases (including indore, bhopal, malanpur, gwalior, jabalpur, pithampur, mandideep, etc.) to canonical https://aquachemlabs.com/, preventing duplicate indexing in Google Search Console.
- Every public HTML page features canonical HTTPS/non-www URLs, single H1 tags, verified title lengths (30-65 chars), and meta descriptions (70-165 chars).
- Googlebot and standard robots meta tags (`index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`) configured on all indexable public pages.
- Social metadata (Open Graph and Twitter Cards) added across all public pages with contextual hero imagery and entity metadata.
- Sector-focused meta keywords deployed for each product category spanning Pharmaceuticals, Chemicals, Food & Beverage, Dairy, Power Plants, Automobiles, Textiles, Steel, Paper, Municipal, and Commercial sectors.
- Google Consent Mode v2 default configuration (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`) integrated alongside Google Tag Manager (GTM-5NLZTGF6).
- Complete Schema.org JSON-LD structured data architecture:
  - Nationwide Organization schema replacing legacy LocalBusiness markup.
  - Sitelinks Searchbox WebSite schema on the homepage.
  - 17-item ItemList product catalog on Products page.
  - Rich Product schema on all 17 product and chemical pages with brand, manufacturer, category, pricing, availability, and seller metadata.
  - TechArticle schema on technical guides and engineering papers.
  - BreadcrumbList schema on all interior pages.
  - FAQPage schema on Services and Products pages.
- Run `npm run seo-hardening-audit` for repository QA.
- Run `npm run structured-data-audit` for schema syntax and guidelines compliance.
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