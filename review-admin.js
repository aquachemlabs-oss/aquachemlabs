(function () {
  var API = "/api/company-reviews/admin";
  var LABELS = { pending: "Waiting for approval", approved: "Published", rejected: "Rejected" };
  var key = sessionStorage.getItem("acl-review-key") || "";
  var status = "pending";
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function msg(text, isError) { $("msg").textContent = text || ""; $("msg").className = "ra-msg" + (isError ? " is-error" : ""); }

  function call(method, body) {
    return fetch(API + (method === "GET" ? "?status=" + status : ""), {
      method: method,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (!res.ok) throw Object.assign(new Error(d.error || "Request failed (" + res.status + ")"), { status: res.status });
        return d;
      });
    });
  }

  function item(r) {
    var buttons = [];
    if (r.status !== "approved") buttons.push('<button class="btn" data-act="approve" data-id="' + r.id + '">Approve &amp; publish</button>');
    if (r.status !== "rejected") buttons.push('<button class="btn outline" data-act="reject" data-id="' + r.id + '">' + (r.status === "approved" ? "Unpublish" : "Reject") + "</button>");
    buttons.push('<button class="btn danger" data-act="delete" data-id="' + r.id + '">Delete</button>');
    var contact = [r.email && "Email: " + esc(r.email), r.phone && "Phone: " + esc(r.phone)].filter(Boolean).join(" · ");
    return '<article class="ra-item"><h2>' + esc(r.company) + " — " + "★★★★★".slice(0, r.rating) + "</h2>" +
      '<p class="meta">' + [r.reviewer_name, r.designation, r.industry, r.city].filter(Boolean).map(esc).join(" · ") +
      " · submitted " + esc(new Date(r.created_at).toLocaleString("en-IN")) + "</p>" +
      '<p class="text">' + esc(r.review) + "</p>" +
      (contact ? '<p class="contact">Private (not published): ' + contact + "</p>" : "") +
      '<div class="actions">' + buttons.join("") + "</div></article>";
  }

  function load() {
    msg("Loading…");
    call("GET").then(function (d) {
      sessionStorage.setItem("acl-review-key", key);
      $("panel").hidden = false; $("logout").hidden = false;
      document.querySelectorAll(".ra-tabs button").forEach(function (b) {
        var s = b.getAttribute("data-status");
        b.setAttribute("aria-pressed", String(s === status));
        b.textContent = LABELS[s] + " (" + ((d.counts && d.counts[s]) || 0) + ")";
      });
      $("list").innerHTML = d.reviews.length ? d.reviews.map(item).join("") : "<p>No reviews here.</p>";
      msg("");
    }).catch(function (err) {
      if (err.status === 401) { sessionStorage.removeItem("acl-review-key"); $("panel").hidden = true; }
      msg(err.message, true);
    });
  }

  $("login").addEventListener("submit", function (e) { e.preventDefault(); key = $("key").value.trim(); load(); });
  $("logout").addEventListener("click", function () { sessionStorage.removeItem("acl-review-key"); location.reload(); });
  document.querySelector(".ra-tabs").addEventListener("click", function (e) {
    var s = e.target.getAttribute("data-status"); if (s) { status = s; load(); }
  });
  $("list").addEventListener("click", function (e) {
    var act = e.target.getAttribute("data-act"); if (!act) return;
    if (act === "delete" && !confirm("Delete this review permanently?")) return;
    e.target.disabled = true;
    call("POST", { id: Number(e.target.getAttribute("data-id")), action: act })
      .then(load)
      .catch(function (err) { e.target.disabled = false; msg(err.message, true); });
  });

  if (key) load();
})();
