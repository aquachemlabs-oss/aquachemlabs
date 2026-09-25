/* Renders Google Business Profile data (from /api/google-business) into any
   element marked with data-gbp="summary|reviews|hours|photos|details|links".
   If the data is unavailable, the static fallback markup inside each element stays. */
(function () {
  var targets = document.querySelectorAll("[data-gbp]");
  if (!targets.length) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function stars(n) {
    var full = Math.round(n || 0);
    return '<span class="gbp-stars" role="img" aria-label="' + esc((n || 0).toFixed(1)) + ' out of 5 stars">' +
      "★★★★★".slice(0, full) + '<span class="off">' + "★★★★★".slice(full) + "</span></span>";
  }
  var G = '<svg class="gbp-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  var render = {
    summary: function (d, el) {
      if (!d.rating) return;
      el.innerHTML = '<a class="gbp-summary" href="' + esc(d.reviewsUrl || d.mapsUrl) + '" target="_blank" rel="noopener">' + G +
        '<span class="gbp-score">' + esc(d.rating.toFixed(1)) + "</span>" + stars(d.rating) +
        '<span class="gbp-count">' + esc(d.ratingCount || 0) + " Google reviews</span></a>";
    },
    reviews: function (d, el) {
      var list = (d.reviews || []).filter(function (r) { return r.text || r.rating; });
      var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
      if (limit) list = list.slice(0, limit);
      if (!list.length) return;
      el.innerHTML = '<div class="gbp-reviews">' + list.map(function (r) {
        var initial = esc((r.author || "?").charAt(0).toUpperCase());
        var avatar = r.authorPhoto
          ? '<img src="' + esc(r.authorPhoto) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
          : "<span>" + initial + "</span>";
        return '<article class="gbp-review"><header>' +
          '<div class="gbp-avatar">' + avatar + "</div><div>" +
          (r.authorUrl ? '<a href="' + esc(r.authorUrl) + '" target="_blank" rel="noopener"><strong>' + esc(r.author) + "</strong></a>" : "<strong>" + esc(r.author) + "</strong>") +
          "<small>" + esc(r.when || "") + "</small></div>" + G + "</header>" +
          stars(r.rating) + (r.text ? "<p>" + esc(r.text).replace(/\n/g, "<br>") + "</p>" : "") +
          "</article>";
      }).join("") + "</div>";
    },
    hours: function (d, el) {
      if (!d.hours || !d.hours.length) return;
      var status = typeof d.openNow === "boolean"
        ? '<p class="gbp-open ' + (d.openNow ? "yes" : "no") + '">' + (d.openNow ? "Open now" : "Closed now") + "</p>" : "";
      el.innerHTML = status + '<table class="gbp-hours">' + d.hours.map(function (h) {
        var i = h.indexOf(":");
        return "<tr><th>" + esc(h.slice(0, i)) + "</th><td>" + esc(h.slice(i + 1).trim()) + "</td></tr>";
      }).join("") + "</table>";
    },
    photos: function (d, el) {
      if (!d.photos || !d.photos.length) return;
      el.innerHTML = '<div class="grid-gallery">' + d.photos.map(function (p, i) {
        var credit = (p.attributions || []).map(function (a) {
          return a.uri ? '<a href="' + esc(a.uri) + '" target="_blank" rel="noopener">' + esc(a.name) + "</a>" : esc(a.name);
        }).join(", ");
        return '<figure class="gbp-photo"><img src="' + esc(p.url) + '" alt="Aqua Chem Labs photo ' + (i + 1) + '" loading="lazy" referrerpolicy="no-referrer">' +
          (credit ? "<figcaption>Photo: " + credit + "</figcaption>" : "") + "</figure>";
      }).join("") + "</div>";
    },
    details: function (d, el) {
      var rows = [];
      if (d.category) rows.push(["Category", esc(d.category)]);
      if (d.summary) rows.push(["About", esc(d.summary)]);
      if (d.address) rows.push(["Address", esc(d.address)]);
      if (d.phone) rows.push(["Phone", '<a href="tel:' + esc((d.phoneIntl || d.phone).replace(/\s/g, "")) + '">' + esc(d.phone) + "</a>"]);
      if (d.website) rows.push(["Website", '<a href="' + esc(d.website) + '" target="_blank" rel="noopener">' + esc(d.website.replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</a>"]);
      if (d.status && d.status !== "OPERATIONAL") rows.push(["Status", esc(d.status.replace(/_/g, " ").toLowerCase())]);
      if (!rows.length) return;
      el.innerHTML = '<dl class="gbp-details">' + rows.map(function (r) {
        return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
      }).join("") + "</dl>";
    },
    links: function (d, el) {
      if (!d.placeId) return;
      el.innerHTML = '<a class="btn" href="' + esc(d.writeReviewUrl) + '" target="_blank" rel="noopener">Write a review</a>' +
        '<a class="btn outline" href="' + esc(d.reviewsUrl) + '" target="_blank" rel="noopener">See all reviews on Google</a>' +
        '<a class="btn outline" href="' + esc(d.mapsUrl) + '" target="_blank" rel="noopener">Get directions</a>';
    }
  };

  fetch("/api/google-business")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.configured || d.error) return;
      targets.forEach(function (el) {
        var fn = render[el.getAttribute("data-gbp")];
        if (fn) fn(d, el);
      });
      document.querySelectorAll("[data-gbp-hide-when-live]").forEach(function (el) { el.hidden = true; });
    })
    .catch(function () {});
})();
