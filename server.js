require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY;
const REPLIERS_BASE_URL = process.env.REPLIERS_BASE_URL || 'https://api.repliers.io';

// ─── Handlebars setup ─────────────────────────────────
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    formatPrice: (price) => {
      if (!price) return 'Price on Request';
      const num = parseFloat(price);
      if (isNaN(num)) return 'Price on Request';
      if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M';
      if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
      return '$' + num.toLocaleString();
    },
    firstImage: (images) => {
      if (images && images.length > 0) return `https://cdn.repliers.io/${images[0]}`;
      return '/images/placeholder.jpg';
    },
    truncate: (str, len) => {
      if (!str) return '';
      return str.length > len ? str.substring(0, len) + '...' : str;
    },
    eq: (a, b) => a === b,
    or: (a, b) => a || b,
    add: (a, b) => parseInt(a) + parseInt(b),
    range: (n) => Array.from({ length: n }, (_, i) => i + 1),
    json: (obj) => JSON.stringify(obj || []),
    statusBadge: (status) => ({ 'A': 'active', 'U': 'sold', 'P': 'pending' }[status] || 'active'),
    statusLabel: (status) => ({ 'A': 'Active', 'U': 'Sold', 'P': 'Pending' }[status] || (status || 'Active')),
    gt: (a, b) => parseInt(a) > parseInt(b),
    lt: (a, b) => parseInt(a) < parseInt(b),
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── HTTP helper (replaces axios) ─────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Repliers API helper ──────────────────────────────
async function fetchListings(params = {}) {
  try {
    const defaults = { status: 'A', resultsPerPage: 9, pageNum: 1, sortBy: 'createdOnDesc' };
    const merged = { ...defaults, ...params };
    const qs = new URLSearchParams(merged).toString();
    const url = `${REPLIERS_BASE_URL}/listings?${qs}`;
    const data = await fetchJSON(url, {
      'REPLIERS-API-KEY': REPLIERS_API_KEY,
      'Content-Type': 'application/json',
    });
    return data;
  } catch (err) {
    console.error('Repliers API error:', err.message);
    return { listings: [], numPages: 0, count: 0 };
  }
}

async function fetchSingleListing(mlsNumber) {
  try {
    const url = `${REPLIERS_BASE_URL}/listings/${mlsNumber}`;
    return await fetchJSON(url, {
      'REPLIERS-API-KEY': REPLIERS_API_KEY,
      'Content-Type': 'application/json',
    });
  } catch (err) {
    console.error('Single listing error:', err.message);
    return null;
  }
}

// ─── Routes ───────────────────────────────────────────

// HOME
app.get('/', async (req, res) => {
  const [featuredData, soldData] = await Promise.all([
    fetchListings({ resultsPerPage: 6, status: 'A', sortBy: 'createdOnDesc' }),
    fetchListings({ resultsPerPage: 3, status: 'U', sortBy: 'updatedOnDesc' }),
  ]);
  res.render('pages/home', {
    title: 'Toronto Homes | Real Estate Services in Canada',
    description: 'Discover Luxury Living with Toronto Homes, your trusted Real Estate Professional.',
    featuredListings: featuredData.listings || [],
    soldListings: soldData.listings || [],
    page: 'home',
  });
});

// LISTINGS / BUY
app.get('/listings', async (req, res) => {
  const { page = 1, minPrice, maxPrice, beds, baths, type, search, status = 'A', sort = 'createdOnDesc' } = req.query;
  const params = { pageNum: parseInt(page), resultsPerPage: 9, status, sortBy: sort };
  if (minPrice) params.minPrice = minPrice;
  if (maxPrice) params.maxPrice = maxPrice;
  if (beds) params.minBeds = beds;
  if (baths) params.minBaths = baths;
  if (type) params.type = type;
  if (search) params.search = search;

  const data = await fetchListings(params);
  res.render('pages/listings', {
    title: 'Buy a Home |Toronto Homes Real Estate',
    description: 'Browse available homes for sale across Toronto.',
    listings: data.listings || [],
    numPages: data.numPages || 0,
    count: data.count || 0,
    currentPage: parseInt(page),
    filters: req.query,
    page: 'listings',
  });
});

// SINGLE LISTING
app.get('/listings/:mls', async (req, res) => {
  const listing = await fetchSingleListing(req.params.mls);
  if (!listing || listing.error) {
    return res.status(404).render('pages/404', { title: 'Listing Not Found', page: '404' });
  }
  const similar = await fetchListings({ resultsPerPage: 3, status: 'A', sortBy: 'createdOnDesc' });
  res.render('pages/listing-detail', {
    title: `${listing.address?.streetNumber || ''} ${listing.address?.streetName || ''} | Toronto Homes`,
    listing,
    similarListings: similar.listings || [],
    page: 'listings',
  });
});

// FEATURED
app.get('/featured', async (req, res) => {
  const { minPrice, maxPrice, beds, baths, type, page = 1 } = req.query;
  const params = { status: 'A', pageNum: parseInt(page), resultsPerPage: 12, sortBy: 'createdOnDesc' };
  if (minPrice) params.minPrice = minPrice;
  if (maxPrice) params.maxPrice = maxPrice;
  if (beds) params.minBeds = beds;
  if (baths) params.minBaths = baths;
  if (type) params.type = type;

  const data = await fetchListings(params);
  res.render('pages/featured', {
    title: 'Featured Properties | Toronto Homes Real Estate',
    listings: data.listings || [],
    numPages: data.numPages || 0,
    count: data.count || 0,
    currentPage: parseInt(page),
    filters: req.query,
    page: 'featured',
  });
});

// NEIGHBORHOODS LIST
app.get('/neighborhoods', (req, res) => {
  const neighborhoods = [
    { name: 'Toronto', description: 'Canada\'s largest city offering vibrant urban living, diverse neighborhoods, and endless cultural hotspots.', image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&q=80', slug: 'toronto' },
    { name: 'Oakville', description: 'Prestigious lakeside town renowned for its historic downtown, upscale lifestyle, and top-ranked schools.', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', slug: 'oakville' },
    { name: 'Mississauga', description: 'A booming urban center with a beautiful waterfront, diverse communities, and excellent transit hubs.', image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80', slug: 'mississauga' },
    { name: 'Burlington', description: 'Highly-rated lakeside city perfectly balancing scenic nature, great schools, and modern family living.', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', slug: 'burlington' },
    { name: 'Markham', description: 'Canada\'s high-tech capital featuring highly sought-after schools, modern developments, and rich heritage.', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80', slug: 'markham' },
    { name: 'Vaughan', description: 'Rapidly growing city famous for premium master-planned communities, luxury homes, and fantastic amenities.', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80', slug: 'vaughan' },
    { name: 'Richmond Hill', description: 'An upscale, green-filled municipality known for its excellent schools, pristine parks, and estate homes.', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80', slug: 'richmond-hill' },
    { name: 'Hamilton', description: 'A vibrant, historic city blending a booming arts culture with stunning Niagara Escarpment nature.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', slug: 'hamilton' },
    { name: 'Brampton', description: 'One of Canada\'s fastest-growing, family-centric cities featuring diverse neighborhoods and great recreation.', image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80', slug: 'brampton' },
    { name: 'Pickering', description: 'A beautiful coastal community offering scenic waterfront trails and quick, easy transit access to Toronto.', image: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&q=80', slug: 'pickering' },
    { name: 'Barrie', description: 'A scenic lakeside city serving as the perfect gateway to outdoor recreation and cottage country.', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80', slug: 'barrie' },
  ];
  res.render('pages/neighborhoods', { title: 'Neighborhoods | Marco Esquivel Real Estate', neighborhoods, page: 'neighborhoods' });
});

// NEIGHBORHOOD DETAIL
app.get('/neighborhoods/:slug', async (req, res) => {
  const cityMap = {
    'toronto': 'Toronto', 
    'oakville': 'Oakville', 
    'mississauga': 'Mississauga',
    'burlington': 'Burlington', 
    'markham': 'Markham', 
    'vaughan': 'Vaughan',
    'richmond-hill': 'Richmond Hill', 
    'hamilton': 'Hamilton',
    'brampton': 'Brampton', 
    'pickering': 'Pickering', 
    'barrie': 'Barrie',
  };
  const city = cityMap[req.params.slug] || req.params.slug;
  const data = await fetchListings({ search: city, resultsPerPage: 6, status: 'A' });
  res.render('pages/neighborhood-detail', {
    title: `${city} Real Estate | Toronto Homes`,
    city, listings: data.listings || [], page: 'neighborhoods',
  });
});

// SELL
app.get('/sell', (req, res) => res.render('pages/sell', { title: 'Sell a Home | Toronto Homes', page: 'sell' }));

// ABOUT
app.get('/about', (req, res) => res.render('pages/about', { title: 'About Toronto Homes | Real Estate Professional', page: 'about' }));

// CONTACT
app.get('/contact', (req, res) => res.render('pages/contact', { title: "Let's Connect | Toronto Homes", page: 'contact' }));

// BLOG
app.get('/blog', (req, res) => {
  const posts = [
    { title: 'Top 5 Neighborhoods in Placer County for Families', slug: 'top-neighborhoods-placer-county', date: 'May 15, 2025', category: 'Neighborhoods', excerpt: 'Discover the best family-friendly communities with excellent schools, parks, and amenities in Placer County.', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', readTime: '5 min read' },
    { title: 'When Is the Best Time to Buy a Home in California?', slug: 'best-time-buy-california', date: 'April 28, 2025', category: 'Buying Tips', excerpt: 'Timing the market can save you thousands. Here\'s what the data says about the best seasons to purchase.', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80', readTime: '7 min read' },
    { title: 'How to Maximize Your Home\'s Value Before Selling', slug: 'maximize-home-value-before-selling', date: 'April 10, 2025', category: 'Selling Tips', excerpt: 'Simple upgrades and strategic staging can significantly boost your home\'s listing price.', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', readTime: '6 min read' },
    { title: 'Understanding the Mortgage Process in 2025', slug: 'mortgage-process-2025', date: 'March 22, 2025', category: 'Finance', excerpt: 'From pre-approval to closing, here\'s a complete guide to securing your home loan in today\'s market.', image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80', readTime: '8 min read' },
    { title: 'Sacramento vs. San Diego: Where Should You Move?', slug: 'sacramento-vs-san-diego', date: 'March 5, 2025', category: 'Market Insights', excerpt: 'Comparing two of California\'s hottest real estate markets to help you decide where to plant roots.', image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&q=80', readTime: '6 min read' },
    { title: "First-Time Buyer's Complete Guide to Auburn, CA", slug: 'first-time-buyers-guide-auburn', date: 'February 18, 2025', category: 'Buying Tips', excerpt: 'Everything you need to know about buying your first home in the Gold Rush foothills of Auburn.', image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80', readTime: '9 min read' },
  ];
  res.render('pages/blog', { title: 'Blog | Toronto Homes Real Estate', posts, page: 'blog' });
});

// TESTIMONIALS
app.get('/testimonials', (req, res) => res.render('pages/testimonials', { title: 'Client Testimonials | Toronto Homes', page: 'testimonials' }));


// BLOG POST DETAIL
app.get('/blog/:slug', (req, res) => {
  const allPosts = [
    { title: 'Top 5 Neighborhoods in Placer County for Families', slug: 'top-neighborhoods-placer-county', date: 'May 15, 2025', category: 'Neighborhoods', excerpt: 'Discover the best family-friendly communities with excellent schools, parks, and amenities in Placer County.', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80', readTime: '5 min read', content: `<p>Placer County is one of Northern California's most desirable places to raise a family. With its combination of stunning Sierra Nevada foothills scenery, top-rated schools, and a tight-knit community feel, it's no wonder families are flocking here from the Bay Area and beyond.</p><h2>1. Rocklin</h2><p>Consistently ranked among the best cities in California for families, Rocklin boasts Whitney High School — one of the top-ranked schools in the state. The city offers numerous parks, a thriving downtown, and new construction homes in master-planned communities.</p><h2>2. Roseville</h2><p>With a population of over 160,000, Roseville is the largest city in Placer County and offers the most amenities. From the Westfield Galleria to dozens of parks and the popular Maidu Regional Park, families love the lifestyle here.</p><h2>3. Lincoln</h2><p>If you want more space for your dollar, Lincoln delivers. This growing city features excellent schools, newer construction, and a small-town atmosphere that's increasingly rare in California.</p><h2>4. Auburn</h2><p>The county seat of Placer County, Auburn is a historic Gold Rush town that now offers a unique blend of outdoor recreation and small-town charm. The American River Canyon provides world-class hiking, mountain biking, and whitewater rafting.</p><h2>5. Loomis</h2><p>One of Placer County's hidden gems, Loomis is a small town known for its award-winning schools, large lot sizes, and agricultural roots. If you want acreage, horses, and a rural lifestyle within 30 minutes of Sacramento, Loomis is worth exploring.</p><p>Ready to find your dream home in one of these amazing Placer County communities? <a href="/contact">Contact Marco today</a> to get started.</p>` },
    { title: 'When Is the Best Time to Buy a Home in California?', slug: 'best-time-buy-california', date: 'April 28, 2025', category: 'Buying Tips', excerpt: 'Timing the market can save you thousands. Here\'s what the data says about the best seasons to purchase.', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80', readTime: '7 min read', content: `<p>One of the most common questions Marco gets from buyers is: "When should I buy?" The answer depends on several factors — your personal timeline, the local market conditions, and your financial readiness. But there are seasonal patterns worth understanding.</p><h2>Spring: High Inventory, High Competition</h2><p>Spring (March–May) is traditionally the busiest season in real estate. More homes come to market, but so do more buyers. This means you'll have more choices, but you'll also face more competition and likely higher prices.</p><h2>Summer: Hot Market, Motivated Sellers</h2><p>The summer months keep inventory high, especially in family-friendly neighborhoods where sellers want to close before the new school year. Expect continued competition, but some sellers may become more negotiable as the season progresses.</p><h2>Fall: Sweet Spot for Buyers</h2><p>September through November may be the best time to buy. Inventory is still decent, competition has cooled, and sellers who haven't sold yet are often more motivated to negotiate. You can frequently get better terms in the fall than any other season.</p><h2>Winter: Best Deals, Least Inventory</h2><p>December through February sees the fewest buyers and, often, the most motivated sellers — people relocating for work, going through life changes, or who need to sell. Prices can be meaningfully lower, but inventory is at its thinnest.</p><p>The bottom line: the best time to buy is when <em>you</em> are financially and personally ready. <a href="/contact">Talk to Marco</a> about your specific situation and he'll help you navigate the market at any time of year.</p>` },
    { title: 'How to Maximize Your Home\'s Value Before Selling', slug: 'maximize-home-value-before-selling', date: 'April 10, 2025', category: 'Selling Tips', excerpt: 'Simple upgrades and strategic staging can significantly boost your home\'s listing price.', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', readTime: '6 min read', content: `<p>Thinking about selling your home? The good news is that you don't need to spend a fortune to get a great return. Some of the highest-ROI improvements are surprisingly affordable. Here's what Marco recommends to his clients before listing.</p><h2>Fresh Paint — The Single Best ROI</h2><p>A fresh coat of neutral interior paint is consistently the #1 return-on-investment improvement for sellers. Choose warm whites and greige tones that appeal to the broadest buyer pool. Budget around $2,000–$5,000 for a typical home and expect to recoup it many times over.</p><h2>Curb Appeal</h2><p>Buyers form their opinion of your home in the first 7 seconds. Invest in landscaping, fresh mulch, a painted front door, and new house numbers. A well-maintained exterior signals to buyers that the interior is equally cared for.</p><h2>Kitchen and Bathroom Updates</h2><p>You don't need a full remodel. New cabinet hardware, updated light fixtures, and fresh caulk in bathrooms can transform these spaces for under $500. For kitchens, consider painting cabinets rather than replacing them.</p><h2>Deep Clean and Declutter</h2><p>This costs nothing but time. A spotlessly clean, decluttered home photographs better and shows better. Rent a storage unit if needed to remove excess furniture and personal items.</p><h2>Professional Staging</h2><p>Marco works with professional stagers who know exactly how to position your home for maximum appeal. Studies show staged homes sell faster and for more money than non-staged counterparts.</p><p>Ready to maximize your home's value? <a href="/sell">Get your free home valuation from Marco today.</a></p>` },
    { title: 'Understanding the Mortgage Process in 2025', slug: 'mortgage-process-2025', date: 'March 22, 2025', category: 'Finance', excerpt: 'From pre-approval to closing, a complete guide to securing your home loan.', image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80', readTime: '8 min read', content: `<p>The mortgage process can feel overwhelming for first-time buyers — and even experienced ones. Here's a straightforward breakdown of every step, from first inquiry to keys in hand.</p><h2>Step 1: Check Your Credit and Finances</h2><p>Before talking to a lender, check your credit score (aim for 700+), calculate your debt-to-income ratio (keep it under 43%), and save for a down payment (typically 3–20% depending on the loan type).</p><h2>Step 2: Get Pre-Approved</h2><p>Pre-approval is different from pre-qualification. Pre-approval involves a full credit check and document review. It gives you a firm loan amount and makes your offers much stronger in competitive markets.</p><h2>Step 3: Choose the Right Loan</h2><p>Common options include Conventional loans (good credit, 3–20% down), FHA loans (lower credit threshold, 3.5% down), VA loans (zero down for veterans), and Jumbo loans (for properties above conforming limits). Marco can connect you with trusted local lenders.</p><h2>Step 4: Rate Lock</h2><p>Once your offer is accepted, lock your interest rate to protect against market fluctuations during escrow. Locks typically last 30–60 days.</p><h2>Step 5: Underwriting and Appraisal</h2><p>Your lender's underwriter reviews all documents. An appraiser confirms the home's value supports the loan amount. This is the most paperwork-intensive phase — respond to requests quickly to avoid delays.</p><h2>Step 6: Clear to Close</h2><p>Once underwriting is complete, you'll receive a Closing Disclosure detailing all final costs. Review it carefully. Then it's time to do your final walkthrough and sign at closing!</p>` },
    { title: 'Sacramento vs. San Diego: Where Should You Move?', slug: 'sacramento-vs-san-diego', date: 'March 5, 2025', category: 'Market Insights', excerpt: 'Comparing two of California\'s hottest real estate markets.', image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=80', readTime: '6 min read', content: `<p>Two of California's most compelling real estate markets sit at opposite ends of the state: Sacramento in the north, San Diego in the south. Both have seen dramatic appreciation, strong job growth, and lifestyle appeal. But they offer very different experiences. Here's how they compare.</p><h2>Affordability</h2><p>Sacramento wins on price. Median home prices hover around $450,000–$550,000 in Sacramento and its suburbs, compared to $850,000–$1,000,000+ in San Diego County. If affordability is your top priority, Sacramento and Placer County offer far more purchasing power.</p><h2>Weather</h2><p>San Diego is famous for its near-perfect Mediterranean climate — rarely too hot, rarely too cold. Sacramento summers are brutal (110°F days are common in July and August), but winters are mild. If you love warmth year-round without the heat, San Diego wins.</p><h2>Job Market</h2><p>Both markets are strong. Sacramento's economy is driven by state government, healthcare, and a growing tech sector. San Diego benefits from defense, biotech, tourism, and its world-class university system. Both offer solid employment opportunities.</p><h2>Lifestyle</h2><p>Sacramento puts you close to Tahoe ski resorts, Gold Country wine regions, and Napa Valley. San Diego gives you beaches, surfing, world-class restaurants, and proximity to Mexico. It really depends on the lifestyle you're after.</p><p>Marco has deep expertise in both markets. <a href="/contact">Reach out today</a> to discuss which market is the right fit for your goals.</p>` },
    { title: "First-Time Buyer's Complete Guide to Auburn, CA", slug: 'first-time-buyers-guide-auburn', date: 'February 18, 2025', category: 'Buying Tips', excerpt: 'Everything you need to know about buying your first home in Auburn.', image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80', readTime: '9 min read', content: `<p>Auburn, California is one of the most charming places to buy your first home in the entire state. Nestled in the Sierra Nevada foothills, it combines historic Gold Rush character with modern amenities, outdoor adventure, and a surprisingly affordable housing market by California standards.</p><h2>Why Auburn?</h2><p>Auburn sits at the intersection of I-80 and Hwy 49, making it an easy commute to Sacramento (about 35 miles) while feeling like a world away. The American River Canyon, miles of hiking and biking trails, and the charming Old Town make it a highly livable community.</p><h2>What Does It Cost?</h2><p>Auburn's median home price sits around $500,000–$650,000 — affordable compared to the Bay Area but competitive enough to require strategic buying. Single-family homes on larger lots can be found in the $400,000s, while luxury properties with views or acreage push into the $800,000–$1.5M range.</p><h2>First-Time Buyer Programs</h2><p>California offers several first-time buyer assistance programs including CalHFA's MyHome Assistance Program (down payment and closing cost help), the CalHFA Zero Interest Program, and various USDA rural development loans that may apply to parts of Placer County.</p><h2>The Buying Process</h2><p>Start by getting pre-approved (local lenders who know the Placer County market are valuable), then work with Marco to identify neighborhoods that match your lifestyle and budget. Auburn's market moves quickly — having an experienced agent like Marco in your corner means you won't miss the right opportunity.</p><p>Ready to make Auburn your home? <a href="/contact">Contact Marco for a free buyer consultation.</a></p>` },
  ];

  const post = allPosts.find(p => p.slug === req.params.slug);
  if (!post) return res.status(404).render('pages/404', { title: 'Post Not Found', page: '404' });

  const recentPosts = allPosts.filter(p => p.slug !== post.slug).slice(0, 3);
  res.render('pages/blog-post', {
    title: post.title + ' | Toronto Homes Blog',
    post,
    recentPosts,
    page: 'blog',
  });
});

// API: search autocomplete
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const data = await fetchListings({ search: q, resultsPerPage: 5, status: 'A' });
    const results = (data.listings || []).map(l => ({
      mls: l.mlsNumber,
      address: `${l.address?.streetNumber || ''} ${l.address?.streetName || ''} ${l.address?.streetSuffix || ''}`.trim(),
      city: l.address?.city,
      price: l.listPrice,
    }));
    res.json(results);
  } catch { res.json([]); }
});

// API: listings JSON (AJAX)
app.get('/api/listings', async (req, res) => {
  const data = await fetchListings(req.query);
  res.json(data);
});

// 404
app.use((req, res) => res.status(404).render('pages/404', { title: '404 | Page Not Found', page: '404' }));

app.listen(PORT, () => {
  console.log(`\n🏠 Marco Esquivel Real Estate → http://localhost:${PORT}\n`);
  console.log('Pages:');
  console.log(`  Home        → http://localhost:${PORT}/`);
  console.log(`  Listings    → http://localhost:${PORT}/listings`);
  console.log(`  Featured    → http://localhost:${PORT}/featured`);
  console.log(`  Sell        → http://localhost:${PORT}/sell`);
  console.log(`  Neighborhoods → http://localhost:${PORT}/neighborhoods`);
  console.log(`  About       → http://localhost:${PORT}/about`);
  console.log(`  Blog        → http://localhost:${PORT}/blog`);
  console.log(`  Testimonials → http://localhost:${PORT}/testimonials`);
  console.log(`  Contact     → http://localhost:${PORT}/contact\n`);
});
