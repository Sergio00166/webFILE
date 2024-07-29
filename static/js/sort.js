function sortNameBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("mode") || "np";
      if (sortValue === "np") { sortValue = "nd"; }
      else { sortValue = "np"; }
      urlObj.pathname = urlObj.pathname.endsWith("/") ? urlObj.pathname : urlObj.pathname + "/";
      urlObj.searchParams.set("mode", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }

function sortSizeBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("mode") || "sd";
      if (sortValue === "sp") { sortValue = "sd"; }
      else { sortValue = "sp";}
      urlObj.pathname = urlObj.pathname.endsWith("/") ? urlObj.pathname : urlObj.pathname + "/";
      urlObj.searchParams.set("mode", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }

function sortDateBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("mode") || "dd";
      if (sortValue === "dp") { sortValue = "dd"; }
      else { sortValue = "dp"; }
      urlObj.pathname = urlObj.pathname.endsWith("/") ? urlObj.pathname : urlObj.pathname + "/";
      urlObj.searchParams.set("mode", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }