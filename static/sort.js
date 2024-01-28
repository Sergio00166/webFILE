function sortNameBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("sort") || "np";
      if (sortValue === "np") { sortValue = "nd"; }
      else { sortValue = "np"; }
      urlObj.searchParams.set("sort", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }

function sortSizeBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("sort") || "sd";
      if (sortValue === "sp") { sortValue = "sd"; }
      else { sortValue = "sp";}
      urlObj.searchParams.set("sort", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }

function sortDateBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("sort") || "dd";
      if (sortValue === "dp") { sortValue = "dd"; }
      else { sortValue = "dp"; }
      urlObj.searchParams.set("sort", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }