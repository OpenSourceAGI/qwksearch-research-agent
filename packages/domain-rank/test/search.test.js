const express = require('express');
const Fuse = require('fuse.js');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Your domain data
const domainData = {
  "facebook.com": [1, "Facebook"],
  "google.com": [2, "Google"],
  "instagram.com": [3, "Instagram"],
  "youtube.com": [4, "YouTube"],
  "twitter.com": [5, "Twitter"],
  "linkedin.com": [6, "Linkedin"],
  "cloudflare.com": [7, "Cloudflare"],
  "pinterest.com": [8, "Pinterest"],
  "apple.com": [9, "Apple"],
  "wikipedia.org": [10, "Wikipedia"],
  "microsoft.com": [11, "Microsoft"],
  "vimeo.com": [12, "Vimeo"],
  "jquery.com": [13, "jQuery"],
  "wordpress.com": [14, "Word Press"],
  "whatsapp.com": [15, "Whatsapp"],
  "amazon.com": [16, "Amazon.com"],
  "tiktok.com": [17, "Tiktok"],
  "europa.eu": [18, "Europa"],
  "mozilla.org": [19, "Mozilla"],
  "github.com": [20, "Github"],
  "blogspot.com": [21, "Blog Spot"],
  "bit.ly": [22, "BIT"],
  "fontawesome.com": [23, "Font Awesome"],
  "adobe.com": [24, "Adobe"],
  "reddit.com": [25, "reddit"],
  "spotify.com": [26, "Spotify"],
  "shopify.com": [27, "Shopify"],
  "w3.org": [28, "W3C"],
  "medium.com": [29, "Medium"],
  "tumblr.com": [30, "Tumblr"],
  "flickr.com": [31, "Flickr"],
  "vk.com": [32, "Welcome!"],
  "qq.com": [33, "腾讯网"],
  "paypal.com": [34, "Paypal"],
  "who.int": [35, "WHO"],
  "nih.gov": [36, "NIH"],
  "yahoo.com": [37, "Yahoo"],
  "nytimes.com": [38, "NY Times"],
  "archive.org": [39, "Archive"],
  "creativecommons.org": [40, "Creative Commons"],
  "weebly.com": [41, "Weebly"],
  "soundcloud.com": [42, "Soundcloud"],
  "mit.edu": [43, "MIT"],
  "forbes.com": [44, "Forbes"],
  "researchgate.net": [45, "Researchgate"],
  "ibm.com": [46, "IBM"],
  "live.com": [47, "Outlook"],
  "opera.com": [48, "Opera"],
  "yandex.ru": [49, "Yandex"],
  "t.co": [50, "T"],
  "apache.org": [51, "Apache"],
  "stripe.com": [52, "Stripe"]
};

// Transform domain data into searchable format
const domains = Object.entries(domainData).map(([domain, data]) => ({
  domain: domain,
  id: data[0],
  name: data[1]
}));

// Initialize Fuse.js
const fuseOptions = {
  keys: ['domain', 'name'], // Search in both domain and name fields
  threshold: 0.3, // Fuzzy matching threshold (0 = exact match, 1 = match anything)
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 1,
  ignoreLocation: true
};

const fuse = new Fuse(domains, fuseOptions);

// API Routes

// GET /api/domains - Get all domains
app.get('/api/domains', (req, res) => {
  res.json({
    success: true,
    data: domains,
    total: domains.length
  });
});

// GET /api/domains/search - Search domains with query parameter
app.get('/api/domains/search', (req, res) => {
  const { q, limit = 50, threshold } = req.query;
  
  if (!q || q.trim() === '') {
    return res.json({
      success: true,
      data: domains.slice(0, parseInt(limit)),
      total: domains.length,
      query: q || ''
    });
  }
  
  // Update threshold if provided
  const searchOptions = { ...fuseOptions };
  if (threshold) {
    searchOptions.threshold = parseFloat(threshold);
  }
  
  const tempFuse = threshold ? new Fuse(domains, searchOptions) : fuse;
  const results = tempFuse.search(q.trim());
  
  const limitedResults = results.slice(0, parseInt(limit));
  
  res.json({
    success: true,
    data: limitedResults.map(result => ({
      ...result.item,
      score: result.score,
      matches: result.matches
    })),
    total: results.length,
    query: q,
    threshold: searchOptions.threshold
  });
});

// POST /api/domains/search - Search domains with request body
app.post('/api/domains/search', (req, res) => {
  const { query, options = {} } = req.body;
  
  if (!query || query.trim() === '') {
    return res.json({
      success: true,
      data: domains,
      total: domains.length,
      query: query || ''
    });
  }
  
  // Merge custom options with defaults
  const searchOptions = { ...fuseOptions, ...options };
  const tempFuse = new Fuse(domains, searchOptions);
  const results = tempFuse.search(query.trim());
  
  res.json({
    success: true,
    data: results.map(result => ({
      ...result.item,
      score: result.score,
      matches: result.matches
    })),
    total: results.length,
    query: query,
    options: searchOptions
  });
});

// GET /api/domains/:id - Get domain by ID
app.get('/api/domains/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const domain = domains.find(d => d.id === id);
  
  if (!domain) {
    return res.status(404).json({
      success: false,
      error: 'Domain not found'
    });
  }
  
  res.json({
    success: true,
    data: domain
  });
});

// GET /api/stats - Get statistics about the domain data
app.get('/api/stats', (req, res) => {
  const stats = {
    totalDomains: domains.length,
    domainTypes: {
      com: domains.filter(d => d.domain.endsWith('.com')).length,
      org: domains.filter(d => d.domain.endsWith('.org')).length,
      net: domains.filter(d => d.domain.endsWith('.net')).length,
      edu: domains.filter(d => d.domain.endsWith('.edu')).length,
      gov: domains.filter(d => d.domain.endsWith('.gov')).length,
      other: domains.filter(d => !d.domain.match(/\.(com|org|net|edu|gov)$/)).length
    },
    searchableFields: fuseOptions.keys,
    fuseConfiguration: fuseOptions
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// Demo endpoint - shows example searches
app.get('/api/demo', (req, res) => {
  const demoSearches = [
    { query: 'social', description: 'Find social media platforms' },
    { query: 'google', description: 'Find Google-related domains' },
    { query: 'music', description: 'Find music streaming services' },
    { query: 'shop', description: 'Find shopping platforms' },
    { query: 'news', description: 'Find news websites' }
  ];
  
  const results = demoSearches.map(demo => {
    const searchResults = fuse.search(demo.query);
    return {
      ...demo,
      results: searchResults.slice(0, 5).map(result => ({
        ...result.item,
        score: result.score
      }))
    };
  });
  
  res.json({
    success: true,
    data: results
  });
});

// Serve a simple HTML demo page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fuse.js Domain Search API Demo</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        .endpoint { 
            background: #f4f4f4; 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 5px; 
            font-family: monospace;
        }
        .result { 
            background: #e8f5e8; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px; 
            white-space: pre-wrap;
        }
        input { 
            width: 100%; 
            padding: 10px; 
            margin: 10px 0; 
            border: 1px solid #ddd; 
            border-radius: 5px;
        }
        button { 
            background: #007bff; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
        }
        button:hover { 
            background: #0056b3; 
        }
    </style>
</head>
<body>
    <h1>Fuse.js Domain Search API Demo</h1>
    
    <h2>Available Endpoints:</h2>
    <div class="endpoint">GET /api/domains - Get all domains</div>
    <div class="endpoint">GET /api/domains/search?q=query - Search domains</div>
    <div class="endpoint">POST /api/domains/search - Advanced search</div>
    <div class="endpoint">GET /api/domains/:id - Get domain by ID</div>
    <div class="endpoint">GET /api/stats - Get statistics</div>
    <div class="endpoint">GET /api/demo - See demo searches</div>
    
    <h2>Try it out:</h2>
    <input type="text" id="searchInput" placeholder="Enter search query (e.g., 'social', 'google', 'music')">
    <button onclick="search()">Search</button>
    
    <div id="results"></div>
    
    <script>
        async function search() {
            const query = document.getElementById('searchInput').value;
            const resultsDiv = document.getElementById('results');
            
            if (!query.trim()) {
                resultsDiv.innerHTML = '<div class="result">Please enter a search query</div>';
                return;
            }
            
            try {
                const response = await fetch(\`/api/domains/search?q=\${encodeURIComponent(query)}\`);
                const data = await response.json();
                
                resultsDiv.innerHTML = \`<div class="result">\${JSON.stringify(data, null, 2)}</div>\`;
            } catch (error) {
                resultsDiv.innerHTML = \`<div class="result">Error: \${error.message}</div>\`;
            }
        }
        
        // Allow search on Enter key
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                search();
            }
        });
    </script>
</body>
</html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Fuse.js Domain Search API running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation available at http://localhost:${PORT}`);
  console.log(`🔍 Try searching: http://localhost:${PORT}/api/domains/search?q=social`);
});

// Export for testing
module.exports = app;