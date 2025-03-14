document.addEventListener("DOMContentLoaded", () => {
  // Arrays to store unfiltered data
  let jsFiles = [];
  let endpoints = [];  // Basic form endpoints loaded on extension open
  let allLinks = [];

  // -- TAB SWITCHING LOGIC --
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.getAttribute("data-target")).classList.add("active");
    });
  });

  // -- AUTO LOAD ON POPUP OPEN --
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    // 1) JS Files
    chrome.scripting.executeScript(
      { target: { tabId }, function: findJavaScriptFiles },
      (results) => {
        if (results && results[0] && results[0].result) {
          jsFiles = results[0].result;
          displayJSFiles(jsFiles);
        }
      }
    );

    // 2) Basic Endpoints
    chrome.scripting.executeScript(
      { target: { tabId }, function: findEndpointsBasic },
      (results) => {
        if (results && results[0] && results[0].result) {
          endpoints = results[0].result;
          loadHiddenPathsFromSessionStorage(tabId);
        }
      }
    );

    // 3) All Links
    chrome.scripting.executeScript(
      { target: { tabId }, function: findAllLinks },
      (results) => {
        if (results && results[0] && results[0].result) {
          allLinks = results[0].result;
          displayAllLinks(allLinks);
          // MERGE any .js links from All Links into JS Files
          mergeJSFromAllLinks();
        }
      }
    );
  });

  // Merge .js from All Links into the JS files array
  function mergeJSFromAllLinks() {
    const jsFromAll = allLinks.filter(link => link.toLowerCase().endsWith(".js"));
    const merged = [...new Set([...jsFiles, ...jsFromAll])];
    jsFiles = merged;
    displayJSFiles(jsFiles);
  }

  // Load ephemeral hidden endpoints from sessionStorage
  function loadHiddenPathsFromSessionStorage(tabId) {
    chrome.scripting.executeScript(
      { target: { tabId }, function: getSessionRevealedPaths },
      (res) => {
        if (res && res[0] && Array.isArray(res[0].result)) {
          const stored = res[0].result;
          let merged = endpoints.concat(stored);
          merged = [...new Set(merged)];
          endpoints = merged;
        }
        // Now show final endpoints in the popup
        displayEndpoints(endpoints);
      }
    );
  }

  /* -----------------------------
   *   JS FILES SECTION
   * ----------------------------- */
  function displayJSFiles(files) {
    const title = document.getElementById("jsCountTitle");
    const list = document.getElementById("jsList");
    list.innerHTML = "";

    title.textContent = `Found (${files.length}) .js Files`;

    if (!files.length) {
      const li = document.createElement("li");
      li.textContent = "No JavaScript files found.";
      li.style.color = "#999";
      list.appendChild(li);
      return;
    }

    files.forEach(url => {
      const li = document.createElement("li");
      li.textContent = url;
      list.appendChild(li);
    });
  }

  document.getElementById("jsFilterBtn").addEventListener("click", () => {
    const filterValue = document.getElementById("jsFilterInput").value.toLowerCase();
    const filtered = jsFiles.filter(url => url.toLowerCase().includes(filterValue));
    displayJSFiles(filtered);
  });

  document.getElementById("copyJsBtn").addEventListener("click", () => {
    if (!jsFiles.length) return alert("No JS files to copy!");
    navigator.clipboard.writeText(jsFiles.join("\n")).then(() => {
      alert("Copied JS file URLs to clipboard!");
    });
  });

  document.getElementById("downloadJsBtn").addEventListener("click", async () => {
    if (!jsFiles.length) return alert("No JS files to download!");
    try {
      await downloadAllJSFiles(jsFiles);
      alert("JS Files ZIP download started.");
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download JS files.");
    }
  });

  async function downloadAllJSFiles(files) {
    const zip = new JSZip();
    for (let url of files) {
      try {
        const resp = await fetch(url, { mode: "cors", credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
        const content = await resp.text();
        let filename = url.split("/").pop() || "file.js";
        filename = filename.split("?")[0] || "file.js";
        zip.file(filename, content);
      } catch (error) {
        console.warn("Could not fetch:", url, error);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "js_files.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /* -----------------------------
   *   ENDPOINTS SECTION
   * ----------------------------- */
  function displayEndpoints(data) {
    const title = document.getElementById("endpointsCountTitle");
    const list = document.getElementById("endpointsList");
    list.innerHTML = "";

    title.textContent = `Found (${data.length}) Endpoints`;

    if (!data.length) {
      const li = document.createElement("li");
      li.textContent = "No endpoints found.";
      li.style.color = "#999";
      list.appendChild(li);
      return;
    }

    data.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }

  document.getElementById("endpointsFilterBtn").addEventListener("click", () => {
    const filterValue = document.getElementById("endpointsFilterInput").value.toLowerCase();
    const filtered = endpoints.filter(ep => ep.toLowerCase().includes(filterValue));
    displayEndpoints(filtered);
  });

  document.getElementById("copyEndpointsBtn").addEventListener("click", () => {
    if (!endpoints.length) return alert("No endpoints to copy!");
    navigator.clipboard.writeText(endpoints.join("\n")).then(() => {
      alert("Copied endpoints to clipboard!");
    });
  });

  document.getElementById("downloadEndpointsBtn").addEventListener("click", () => {
    if (!endpoints.length) return alert("No endpoints to download!");
    downloadTextFile("endpoints.txt", endpoints.join("\n"));
    alert("Endpoints download started.");
  });

  // REVEAL HIDDEN with spinner
  document.getElementById("revealHiddenBtn").addEventListener("click", () => {
    showEndpointsSpinner();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      chrome.scripting.executeScript({
        target: { tabId },
        function: revealHiddenStuff
      }, (injectionResults) => {
        hideEndpointsSpinner();

        if (injectionResults && injectionResults[0] && injectionResults[0].result) {
          const newPaths = injectionResults[0].result;
          let merged = endpoints.concat(newPaths);
          merged = [...new Set(merged)];
          endpoints = merged;

          // store in session storage
          chrome.scripting.executeScript({
            target: { tabId },
            function: storeInSessionStorage,
            args: [ newPaths ]
          });

          displayEndpoints(endpoints);
        }
      });
    });
  });

  function showEndpointsSpinner() {
    const list = document.getElementById("endpointsList");
    list.innerHTML = "";
    const spinnerDiv = document.createElement("div");
    spinnerDiv.classList.add("spinner");
    list.appendChild(spinnerDiv);
  }
  function hideEndpointsSpinner() {
    document.getElementById("endpointsList").innerHTML = "";
  }

  /* -----------------------------
   *   ALL LINKS SECTION
   * ----------------------------- */
  function displayAllLinks(data) {
    const title = document.getElementById("allLinksCountTitle");
    const list = document.getElementById("allLinksList");
    list.innerHTML = "";

    title.textContent = `Found (${data.length}) Links`;

    if (!data.length) {
      const li = document.createElement("li");
      li.textContent = "No links found.";
      li.style.color = "#999";
      list.appendChild(li);
      return;
    }

    data.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }

  document.getElementById("allLinksFilterBtn").addEventListener("click", () => {
    const filterValue = document.getElementById("allLinksFilterInput").value.toLowerCase();
    const filtered = allLinks.filter(link => link.toLowerCase().includes(filterValue));
    displayAllLinks(filtered);
  });

  document.getElementById("copyAllLinksBtn").addEventListener("click", () => {
    if (!allLinks.length) return alert("No links to copy!");
    navigator.clipboard.writeText(allLinks.join("\n")).then(() => {
      alert("Copied links to clipboard!");
    });
  });

  document.getElementById("downloadAllLinksBtn").addEventListener("click", () => {
    if (!allLinks.length) return alert("No links to download!");
    downloadTextFile("all_links.txt", allLinks.join("\n"));
    alert("Links download started.");
  });

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /* -----------------------------
   *  MASS OPEN SECTION (NEW)
   * ----------------------------- */
  const massOpenTextarea = document.getElementById("massOpenTextarea");
  const findInput = document.getElementById("findText");
  const replaceInput = document.getElementById("replaceText");
  const replaceAllBtn = document.getElementById("replaceAllBtn");
  const openAllBtn = document.getElementById("openAllBtn");

  // Replace all occurrences of findText with replaceText in the textarea
  replaceAllBtn.addEventListener("click", () => {
    const findStr = findInput.value;
    if (!findStr) {
      alert("Please enter the text to find.");
      return;
    }
    const replaceStr = replaceInput.value;
    const original = massOpenTextarea.value;
    // Use a global regex for all occurrences
    // Make sure to escape special regex chars in findStr if needed
    const escapedFind = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escapedFind, 'g');
    const replaced = original.replace(re, replaceStr);

    massOpenTextarea.value = replaced;
  });

  // Open all lines in new tabs
  openAllBtn.addEventListener("click", () => {
    const lines = massOpenTextarea.value.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      alert("No URLs to open.");
      return;
    }

    lines.forEach(url => {
      // Attempt to ensure it has a protocol; if missing, prefix with https://
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      chrome.tabs.create({ url });
    });
  });
});

/* 
  =============== 
  INJECTED METHODS (unchanged)
  ===============
*/

/**
 * Basic <form action="..."> endpoints
 */
function findEndpointsBasic() {
  const forms = [...document.querySelectorAll("form[action]")];
  const actions = forms.map(f => f.action).filter(Boolean);
  return [...new Set(actions)];
}

/**
 * Collects all JS script URLs from the page
 */
function findJavaScriptFiles() {
  const jsLinks = new Set();
  document.querySelectorAll("script[src]").forEach(script => jsLinks.add(script.src));
  performance.getEntriesByType("resource").forEach(entry => {
    if (entry.name.endsWith(".js")) {
      jsLinks.add(entry.name);
    }
  });
  document.querySelectorAll("script:not([src])").forEach(script => {
    const matches = script.innerHTML.match(/https?:\/\/[^"'\s]+\.js/g);
    if (matches) matches.forEach(url => jsLinks.add(url));
  });
  return Array.from(jsLinks);
}

/**
 * Collects all possible links from href, src, data-src, action, poster, formaction,
 * removing duplicates.
 */
function findAllLinks() {
  const raw = [
    ...document.querySelectorAll("[href],[src],[data-src],[action],[poster],[formaction]")
  ]
    .map(el => (
      el.href ||
      el.src ||
      el.getAttribute("data-src") ||
      el.action ||
      el.poster ||
      el.getAttribute("formaction")
    ))
    .filter(Boolean);

  return [...new Set(raw)];
}

/**
 * Hidden paths snippet logic
 */
function revealHiddenStuff() {
  return (async function(){
    let e = [],
        t = new Set();

    async function fetchResource(url) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.error(`Failed to fetch ${url}: ${resp.status}`);
          return null;
        }
        return await resp.text();
      } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        return null;
      }
    }

    function isLikelyPath(str) {
      return (
        (str.startsWith("/") || str.startsWith("./") || str.startsWith("../")) &&
        !str.includes(" ") &&
        !/[^\x20-\x7E]/.test(str) &&
        str.length > 1 &&
        str.length < 200
      );
    }

    function extractPaths(content) {
      return [...content.matchAll(/[%27"]((?:\/|\.\.?\/|\.\/)[^%27"]+)[%27"]/g)]
        .map(match => match[1])
        .filter(isLikelyPath);
    }

    function toAbsolute(base, rel) {
      try {
        return new URL(rel, base).href;
      } catch {
        try {
          return new URL(rel, document.location.href).href;
        } catch {
          return rel;
        }
      }
    }

    async function processResource(resourceURL) {
      if (t.has(resourceURL)) return;
      t.add(resourceURL);
      console.log(`Fetching and processing: ${resourceURL}`);
      const txt = await fetchResource(resourceURL);
      if (txt) {
        const found = extractPaths(txt);
        found.forEach(r => e.push(toAbsolute(resourceURL, r)));
      }
    }

    const resources = performance.getEntriesByType("resource").map(r => r.name);
    console.log("Resources found:", resources);

    for (const r of resources) {
      await processResource(r);
    }

    const i = [...new Set(e)];
    console.log("Final list of unique FULL paths:", i);
    console.log("All scanned resources:", Array.from(t));

    return i; 
  })();
}

/**
 * sessionStorage ephemeral logic
 */
function getSessionRevealedPaths() {
  const raw = sessionStorage.getItem("myExtensionHidden");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function storeInSessionStorage(newPaths) {
  let existing = [];
  const raw = sessionStorage.getItem("myExtensionHidden");
  if (raw) {
    try {
      existing = JSON.parse(raw);
    } catch {}
  }
  const merged = [...new Set([...existing, ...newPaths])];
  sessionStorage.setItem("myExtensionHidden", JSON.stringify(merged));
  return merged;
}


  // Function to trigger button click when Enter is pressed
  function enableEnterKey(inputId, buttonId) {
    document.getElementById(inputId).addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent default form submission
            document.getElementById(buttonId).click(); // Trigger button click
        }
    });
  }
  
  // Apply function to each input field and its corresponding button
  enableEnterKey("jsFilterInput", "jsFilterBtn");
  enableEnterKey("endpointsFilterInput", "endpointsFilterBtn");
  enableEnterKey("allLinksFilterInput", "allLinksFilterBtn");
