/*!
 * IntentPulse embed: scores a lead form on submit with the Aware IntentPulse Lead Engine.
 * <script src="https://<host>/embed/intentpulse.js" data-form="#lead-form" data-vip-redirect="https://..." defer></script>
 * Fields read: name|leadName, company, budget|budgetK, message.
 * Emits `intentpulse:scored` (detail = result) or `intentpulse:error` on the form.
 * Also exposes window.IntentPulse.score({ leadName, company, budgetK, message }) -> Promise<result>.
 */
(function () {
  var script = document.currentScript;
  var endpoint = (script && script.getAttribute("data-endpoint")) || new URL("/api/intent-pulse", script ? script.src : location.href).href;
  var formSelector = script && script.getAttribute("data-form");
  var vipRedirect = script && script.getAttribute("data-vip-redirect");

  function score(lead) {
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      keepalive: true,
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) throw new Error((json.error && json.error.message) || "IntentPulse request failed");
        return json;
      });
    });
  }

  window.IntentPulse = { score: score, endpoint: endpoint };
  if (!formSelector) return;

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form || !form.matches || !form.matches(formSelector)) return;
      var data = new FormData(form);
      var pick = function (a, b) {
        return String(data.get(a) || data.get(b) || "");
      };
      var budget = pick("budget", "budgetK");
      var lead = {
        leadName: pick("name", "leadName"),
        company: pick("company", "company"),
        budgetK: budget ? Number(budget) : null,
        message: pick("message", "signal"),
      };
      if (!lead.message) return;

      score(lead)
        .then(function (result) {
          form.dispatchEvent(new CustomEvent("intentpulse:scored", { detail: result, bubbles: true }));
          if (vipRedirect && result.tier === "VIP") location.href = vipRedirect;
        })
        .catch(function (err) {
          form.dispatchEvent(new CustomEvent("intentpulse:error", { detail: err, bubbles: true }));
        });
    },
    true,
  );
})();
