document.addEventListener("DOMContentLoaded", () => {
  // Arrays to store the unfiltered data
  let jsFiles = [];
  let endpoints = [];
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

  // -- AUTO LOAD ALL THREE ON POPUP OPEN --
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    // 1) JS Files
    chrome.scripting.executeScript(
      {
        target: { tabId },
        function: findJavaScriptFiles
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          jsFiles = results[0].result;
          displayJSFiles(jsFiles);
        }
      }
    );

    // 2) Endpoints (includes snippet to discover paths in loaded .js or other resources)
    chrome.scripting.executeScript(
      {
        target: { tabId },
        function: findEndpoints
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          endpoints = results[0].result;
          displayEndpoints(endpoints);
        }
      }
    );

    // 3) All Links
    chrome.scripting.executeScript(
      {
        target: { tabId },
        function: findAllLinks
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          allLinks = results[0].result;
          displayAllLinks(allLinks);
        }
      }
    );
  });

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
});

/* 
  =============== 
  INJECTED METHODS 
  ===============
*/

/**
 * Collects all JS script URLs from the page.
 */
function findJavaScriptFiles() {
  const jsLinks = new Set();
  // 1) <script src="...">
  document.querySelectorAll("script[src]").forEach(script => jsLinks.add(script.src));
  // 2) Performance API
  performance.getEntriesByType("resource").forEach(entry => {
    if (entry.name.endsWith(".js")) {
      jsLinks.add(entry.name);
    }
  });
  // 3) Inline scripts with .js in the text
  document.querySelectorAll("script:not([src])").forEach(script => {
    const matches = script.innerHTML.match(/https?:\/\/[^"'\s]+\.js/g);
    if (matches) {
      matches.forEach(url => jsLinks.add(url));
    }
  });
  return Array.from(jsLinks);
}

/**
 * Collects form endpoints + discovered paths from loaded resources.
 * Returns a promise so we can await network fetches.
 */
async function findEndpoints() {
  // (A) Original form actions
  const formEndpoints = [
    ...document.querySelectorAll("form[action]")
  ]
    .map(f => f.action)
    .filter(Boolean);

  // (B) Discovered paths from the snippet
  const discoveredPaths = [];
  const visitedURLs = new Set();

  function isLikelyPath(str) {
    return (
      (str.startsWith("/") || str.startsWith("./") || str.startsWith("../")) &&
      !str.includes(" ") &&
      !/[^\x20-\x7E]/.test(str) &&
      str.length > 1 &&
      str.length < 200
    );
  }

  function extractPathsFromContent(content) {
    // Finds strings like '/api/endpoint' or './some/thing', etc
    // Single or double quotes, relative or absolute paths
    // We'll assume the user wants them if they appear in the text
    return [...content.matchAll(/['"]((?:\/|\.\.?\/)[^'"]+)['"]/g)]
      .map(m => m[1])
      .filter(isLikelyPath);
  }

  function toAbsolutePath(base, relativePath) {
    try {
      return new URL(relativePath, base).href;
    } catch {
      return relativePath;
    }
  }

  async function fetchResource(url) {
    try {
      const response = await fetch(url, {
        mode: "no-cors",
        credentials: "include"
      });
      return response.ok ? await response.text() : null;
    } catch {
      return null; // If blocked by CORS or any fetch error
    }
  }

  async function processResource(url) {
    if (visitedURLs.has(url)) return;
    visitedURLs.add(url);
    const content = await fetchResource(url);
    if (content) {
      const paths = extractPathsFromContent(content);
      for (let p of paths) {
        discoveredPaths.push(toAbsolutePath(url, p));
      }
    }
  }

  // Gather all resource URLs from the Performance API, including cross-domain
  const resourceURLs = performance.getEntriesByType("resource").map(r => r.name);
  await Promise.all(resourceURLs.map(processResource));

  // Combine, deduplicate
  const combined = [...formEndpoints, ...discoveredPaths];
  const unique = [...new Set(combined)];

  return unique;
}

/**
 * Collects all possible links from href, src, data-src, action, poster, formaction,
 * removing duplicates.
 */
function findAllLinks() {
  const links = [
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

  return Array.from(new Set(links));
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
