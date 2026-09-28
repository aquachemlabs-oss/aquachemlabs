/* Company reviews: renders approved reviews (from /api/company-reviews) into any
   element marked with data-company-reviews (optional data-limit="N"), and wires up
   the review form marked with data-company-review-form. New reviews are held for
   approval, so they do not appear on the site straight away. */
(function () {
  var lists = document.querySelectorAll("[data-company-reviews]");
  var form = document.querySelector("[data-company-review-form]");
  if (!lists.length && !form) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function stars(n) {
    var full = Math.round(n || 0);
    return '<span class="gbp-stars" role="img" aria-label="' + esc(n) + ' out of 5 stars">' +
      "★★★★★".slice(0, full) + '<span class="off">' + "★★★★★".slice(full) + "</span></span>";
  }
  function when(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }
  function initials(name) {
    return esc(String(name || "?").split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase());
  }

  function card(r) {
    var role = [r.reviewer_name, r.designation].filter(Boolean).map(esc).join(", ");
    var meta = [r.industry, r.city].filter(Boolean).map(esc).join(" · ");
    return '<article class="company-review">' +
      '<header><div class="company-review__logo" aria-hidden="true">' + initials(r.company) + "</div>" +
      "<div><strong>" + esc(r.company) + "</strong>" + (meta ? "<small>" + meta + "</small>" : "") + "</div></header>" +
      stars(r.rating) +
      "<blockquote><p>" + esc(r.review).replace(/\n/g, "<br>") + "</p></blockquote>" +
      '<div class="company-review__foot"><span>' + role + "</span>" + (r.approved_at ? "<time>" + esc(when(r.approved_at)) + "</time>" : "") + "</div>" +
      "</article>";
  }

  if (lists.length) {
    fetch("/api/company-reviews", { headers: { Accept: "application/json" } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (d) {
        if (!d || !d.reviews || !d.reviews.length) return;
        lists.forEach(function (el) {
          var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
          var list = limit ? d.reviews.slice(0, limit) : d.reviews;
          el.innerHTML =
            '<p class="company-reviews__summary">' + stars(d.average) +
            " <strong>" + esc(Number(d.average).toFixed(1)) + "</strong> average from " +
            esc(d.count) + " published client compan" + (d.count === 1 ? "y" : "ies") + "</p>" +
            '<div class="company-reviews">' + list.map(card).join("") + "</div>";
        });
      })
      .catch(function () { /* keep the static fallback text */ });
  }

  if (form) {
    var status = form.querySelector("[data-form-status]");
    var button = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      button.disabled = true;
      status.className = "company-review-form__status";
      status.textContent = "Sending your review…";
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch("/api/company-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
          });
        })
        .then(function () {
          form.reset();
          status.className = "company-review-form__status is-ok";
          status.textContent = "Thank you! Your review has been received and will appear on our website once it is approved.";
        })
        .catch(function (err) {
          status.className = "company-review-form__status is-error";
          status.textContent = err.message || "Could not send your review. Please try again or call us.";
        })
        .then(function () { button.disabled = false; });
    });
  }
})();
