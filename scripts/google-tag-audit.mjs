import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root)
.filter((f) => f.endsWith('.html'));

const pages = htmlFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8'));
const allHtml = pages.join('\n');
const csp = fs.existsSync(path.join(root, '_headers'))
  ? fs.readFileSync(path.join(root, '_headers'), 'utf8')
  : '';

const gtmIds = [...new Set(allHtml.match(/GTM-[A-Z0-9]+/gi) || [])];
const hasGtmLoader = /googletagmanager\.com/i.test(allHtml);
const hasConsentMode = /ad_storage|analytics_storage|ad_user_data|ad_personalization/i.test(allHtml);
const errors = [];
const warnings = [];

if (!csp.includes('https://www.googletagmanager.com')) {
  errors.push('CSP does not allow Google Tag Manager.');
}
if (!csp.includes('google-analytics.com')) {
  errors.push('CSP does not allow Google Analytics endpoints.');
}

if (gtmIds.length > 1) {
  errors.push('Multiple GTM container IDs detected: ' + gtmIds.join(', '));
}
if (gtmIds.length === 1 && !hasGtmLoader) {
  errors.push(gtmIds[0] + ' is present but no googletagmanager.com loader was found.');
}
if (hasGtmLoader && !hasConsentMode) {
  warnings.push('Google Tag Manager is referenced but no Consent Mode signals were found. If GA4/Google Ads is used, verify CMP/Consent Mode before production.');
}
if (gtmIds.length === 0) {
  warnings.push('No GTM container ID is present in the repository. GTM cannot run until a real container ID is configured.');
}

const pagesWithoutGtm = htmlFiles.filter((file) => {\n  const html = fs.readFileSync(path.join(root, file), 'utf8');\n  return !/GTM-5NLZTGF6/i.test(html) || !/googletagmanager\\.com\\/gtm\\.js/i.test(html) || !/googletagmanager\\.com\\/ns\\.html/i.test(html);\n});\nif (pagesWithoutGtm.length) errors.push('GTM installation is incomplete on: ' + pagesWithoutGtm.join(', '));\n\nconst duplicatePageSnippets = pages.filter((html) => (html.match(/googletagmanager\.com/gi) || []).length > 2);
if (duplicatePageSnippets.length) {
  warnings.push('One or more pages contain repeated GTM loader references; check for duplicate installation.');
}

console.log('Google tag audit: ' + htmlFiles.length + ' public HTML pages scanned.');
if (gtmIds.length) console.log('Detected GTM container: ' + gtmIds.join(', '));
else console.log('Detected GTM container: none');
console.log('Consent Mode signals present: ' + (hasConsentMode ? 'yes' : 'no'));

warnings.forEach((w) => console.warn('WARN: ' + w));
errors.forEach((e) => console.error('ERROR: ' + e));
if (errors.length) process.exit(1);
