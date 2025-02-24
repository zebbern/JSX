chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getJSFiles") {
      findJavaScriptFiles().then(jsFiles => sendResponse({ jsFiles }));
      return true; // Keep message channel open for async
    }
  });
  
  async function findJavaScriptFiles() {
    let jsLinks = new Set();
  
    // 1) From <script> tags
    document.querySelectorAll("script[src]").forEach(script => {
      jsLinks.add(script.src);
    });
  
    // 2) From Performance API
    performance.getEntriesByType("resource").forEach(entry => {
      if (entry.name.endsWith(".js")) {
        jsLinks.add(entry.name);
      }
    });
  
    // 3) From inline scripts
    document.querySelectorAll("script:not([src])").forEach(script => {
      const matches = script.innerHTML.match(/https?:\/\/[^"'\s]+\.js/g);
      if (matches) {
        matches.forEach(url => jsLinks.add(url));
      }
    });
  
    // 4) Possibly dynamic detection
    await getNetworkJSFiles(jsLinks);
  
    return Array.from(jsLinks);
  }
  
  // Example: hooking into network requests or DOM changes
  async function getNetworkJSFiles(jsLinks) {
    if (window.performance && window.performance.getEntriesByType) {
      let resources = performance.getEntriesByType("resource");
      resources.forEach(entry => {
        if (entry.name.endsWith(".js")) {
          jsLinks.add(entry.name);
        }
      });
    }
  
    // Observe new script insertions in the DOM
    let observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.tagName === "SCRIPT" && node.src) {
            jsLinks.add(node.src);
          }
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  
    return jsLinks;
  }
  