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
        // Remove 'active' from all buttons and contents
        tabButtons.forEach(b => b.classList.remove("active"));
        tabContents.forEach(tc => tc.classList.remove("active"));
  
        // Add 'active' to the clicked button
        btn.classList.add("active");
  
        // Show corresponding content
        const targetId = btn.getAttribute("data-target");
        document.getElementById(targetId).classList.add("active");
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
  
      // 2) Endpoints
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
  
    // Filter JS
    document.getElementById("jsFilterBtn").addEventListener("click", () => {
      const filterValue = document.getElementById("jsFilterInput").value.toLowerCase();
      const filtered = jsFiles.filter(url => url.toLowerCase().includes(filterValue));
      displayJSFiles(filtered);
    });
  
    // Copy JS
    document.getElementById("copyJsBtn").addEventListener("click", () => {
      if (!jsFiles.length) return alert("No JS files to copy!");
      const textToCopy = jsFiles.join("\n");
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Copied JS file URLs to clipboard!");
      });
    });
  

        // Download Endpoints
        document.getElementById("downloadJsBtn").addEventListener("click", () => {
          if (!jsFiles.length) return alert("No jsFiles to download!");
          downloadTextFile("jsFiles.txt", jsFiles.join("\n"));
          alert("jsFiles download started.");
        });
  
  
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
  
    // Filter Endpoints
    document.getElementById("endpointsFilterBtn").addEventListener("click", () => {
      const filterValue = document.getElementById("endpointsFilterInput").value.toLowerCase();
      const filtered = endpoints.filter(ep => ep.toLowerCase().includes(filterValue));
      displayEndpoints(filtered);
    });
  
    // Copy Endpoints
    document.getElementById("copyEndpointsBtn").addEventListener("click", () => {
      if (!endpoints.length) return alert("No endpoints to copy!");
      const textToCopy = endpoints.join("\n");
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Copied endpoints to clipboard!");
      });
    });
  
    // Download Endpoints
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
  
    // Filter All Links
    document.getElementById("allLinksFilterBtn").addEventListener("click", () => {
      const filterValue = document.getElementById("allLinksFilterInput").value.toLowerCase();
      const filtered = allLinks.filter(link => link.toLowerCase().includes(filterValue));
      displayAllLinks(filtered);
    });
  
    // Copy All Links
    document.getElementById("copyAllLinksBtn").addEventListener("click", () => {
      if (!allLinks.length) return alert("No links to copy!");
      const textToCopy = allLinks.join("\n");
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Copied links to clipboard!");
      });
    });
  
    // Download All Links
    document.getElementById("downloadAllLinksBtn").addEventListener("click", () => {
      if (!allLinks.length) return alert("No links to download!");
      downloadTextFile("all_links.txt", allLinks.join("\n"));
      alert("Links download started.");
    });
  
    // Helper to download text as a .txt file
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
    document.querySelectorAll("script[src]").forEach(script => {
      jsLinks.add(script.src);
    });
  
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
   * Collects all form endpoints from forms with an action attribute.
   */
  function findEndpoints() {
    const endpoints = [
      ...document.querySelectorAll("form[action]")
    ].map(form => form.action);
  
    // Remove duplicates, filter out empty
    return Array.from(new Set(endpoints)).filter(Boolean);
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
