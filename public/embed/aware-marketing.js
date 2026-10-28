/* The Aware Marketing Engine: embeddable client.
 * AwareMarketing.negotiate({ brandName, budget, deliverables, usageRights, tone, creatorName, emailText }) -> Promise<result>
 */
(function () {
  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : "";
  var endpoint = origin + "/api/aware-marketing";

  function negotiate(deal) {
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deal || {}),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.error && data.error.message) || "Aware request failed (" + res.status + ")");
          return data;
        });
      })
      .then(function (result) {
        window.dispatchEvent(new CustomEvent("aware:result", { detail: result }));
        return result;
      });
  }

  window.AwareMarketing = { endpoint: endpoint, negotiate: negotiate, version: "1.0.0" };
})();
