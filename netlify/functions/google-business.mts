// Fetches the Aqua Chem Labs Google Business Profile (via the Google Places API)
// and returns a trimmed JSON payload for the website. Responses are cached on
// Netlify's CDN so the Places API is only hit a few times a day.

const LISTING = {
  query: "Aqua Chem Labs, Sanchi Road, Raisen, Madhya Pradesh",
  lat: 23.3320565,
  lng: 77.7828951,
  cid: "10116669877027612464",
};

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "rating",
  "userRatingCount",
  "reviews",
  "regularOpeningHours",
  "businessStatus",
  "primaryTypeDisplayName",
  "editorialSummary",
  "photos",
  "location",
].join(",");

const API = "https://places.googleapis.com/v1";

async function resolvePlaceId(key: string): Promise<string | null> {
  const res = await fetch(`${API}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: LISTING.query,
      locationBias: { circle: { center: { latitude: LISTING.lat, longitude: LISTING.lng }, radius: 500 } },
      maxResultCount: 5,
    }),
  });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = await res.json();
  const places: { id: string; googleMapsUri?: string }[] = data.places || [];
  const exact = places.find((p) => p.googleMapsUri?.includes(LISTING.cid));
  return (exact || places[0])?.id ?? null;
}

async function photoUrl(key: string, name: string): Promise<string | null> {
  const res = await fetch(`${API}/${name}/media?maxWidthPx=1200&skipHttpRedirect=true`, {
    headers: { "X-Goog-Api-Key": key },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.photoUri ?? null;
}

function json(body: unknown, cacheSeconds: number) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`,
    },
  });
}

export default async () => {
  const key = Netlify.env.get("GOOGLE_PLACES_API_KEY") || Netlify.env.get("GOOGLE_MAPS_API_KEY");
  const mapsUrl = `https://www.google.com/maps?cid=${LISTING.cid}`;

  if (!key) {
    return json({ configured: false, mapsUrl }, 300);
  }

  try {
    const placeId = Netlify.env.get("GOOGLE_PLACE_ID") || (await resolvePlaceId(key));
    if (!placeId) throw new Error("Listing not found");

    const res = await fetch(`${API}/places/${placeId}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
    });
    if (!res.ok) throw new Error(`Place details failed (${res.status})`);
    const p = await res.json();

    const photos = await Promise.all(
      (p.photos || []).slice(0, 10).map(async (ph: any) => ({
        url: await photoUrl(key, ph.name),
        attributions: (ph.authorAttributions || []).map((a: any) => ({ name: a.displayName, uri: a.uri })),
      })),
    );

    return json(
      {
        configured: true,
        placeId,
        name: p.displayName?.text,
        category: p.primaryTypeDisplayName?.text,
        summary: p.editorialSummary?.text,
        address: p.formattedAddress,
        phone: p.nationalPhoneNumber,
        phoneIntl: p.internationalPhoneNumber,
        website: p.websiteUri,
        mapsUrl: p.googleMapsUri || mapsUrl,
        reviewsUrl: `https://search.google.com/local/reviews?placeid=${placeId}`,
        writeReviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
        status: p.businessStatus,
        rating: p.rating,
        ratingCount: p.userRatingCount,
        openNow: p.regularOpeningHours?.openNow,
        hours: p.regularOpeningHours?.weekdayDescriptions || [],
        location: p.location,
        reviews: (p.reviews || []).map((r: any) => ({
          author: r.authorAttribution?.displayName,
          authorUrl: r.authorAttribution?.uri,
          authorPhoto: r.authorAttribution?.photoUri,
          rating: r.rating,
          text: r.originalText?.text || r.text?.text || "",
          when: r.relativePublishTimeDescription,
          time: r.publishTime,
          link: r.googleMapsUri,
        })),
        photos: photos.filter((ph) => ph.url),
        fetchedAt: new Date().toISOString(),
      },
      21600,
    );
  } catch (err) {
    console.error("google-business:", err);
    return json({ configured: true, error: true, mapsUrl }, 60);
  }
};

export const config = { path: "/api/google-business" };
