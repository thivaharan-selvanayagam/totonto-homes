/* ═══════════════════════════════════════════════════════
   MARCO ESQUIVEL REAL ESTATE — MAIN JS
═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Header scroll behavior ────────────────────────
  const header = document.getElementById('site-header');
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }, { passive: true });

  // ─── Mobile menu ──────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
    const spans = menuToggle.querySelectorAll('span');
    if (navLinks?.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!menuToggle?.contains(e.target) && !navLinks?.contains(e.target)) {
      navLinks?.classList.remove('open');
      menuToggle?.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // ─── Hero search autocomplete ─────────────────────
const heroSearch = document.getElementById('heroSearch');
const heroAutocomplete = document.getElementById('heroAutocomplete');
let debounceTimer;

// Dynamic placeholder updater (Optional helper to make sure your input matches perfectly)
if (heroSearch) {
  heroSearch.setAttribute('placeholder', 'Search by Area, City, Postal Code or MLS® number...');
}

heroSearch?.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  const q = e.target.value.trim();
  
  if (q.length < 2) {
    heroAutocomplete?.classList.remove('open');
    return;
  }
  
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      
      if (!data || data.length === 0) {
        heroAutocomplete?.classList.remove('open');
        return;
      }
      
      heroAutocomplete.innerHTML = data.map(item => {
        let matchIcon = 'fa-home';
        let matchLabel = 'Property';
        const queryLower = q.toLowerCase();

        // 1. Detect MLS® Number Match
        // If the item's MLS matches the query closely, label it as an MLS match
        if (item.mls.toLowerCase().includes(queryLower)) {
          matchIcon = 'fa-fingerprint';
          matchLabel = 'MLS® #';
        } 
        // 2. Detect City / Area Match
        else if (item.city && item.city.toLowerCase().includes(queryLower)) {
          matchIcon = 'fa-map-marker-alt';
          matchLabel = 'City / Area';
        }
        
        // Sold status tag from our previous update
        const isSold = item.status === 'U' ? ' <span style="color: var(--gold); font-size: 0.75rem; font-weight: 600;">(Sold)</span>' : '';
        
        return `
          <div class="autocomplete-item" onclick="window.location='/listings/${item.mls}'" style="display: flex; align-items: Left; justify-content: space-between; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="display: flex; flex-direction: column;">
                <span class="autocomplete-address" style="font-weight: 500;">${item.address}${isSold}</span>
                <span class="autocomplete-sub">${item.city || ''}</span>
              </div>
            </div>
            <span style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; background: var(--light-gray); color: var(--text-light); padding: 2px 8px; border-radius: 4px; font-weight: 600; font-family: 'Manrope', sans-serif;">
              ${matchLabel}
            </span>
          </div>
        `;
      }).join('');
      
      heroAutocomplete?.classList.add('open');
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  }, 300);
});

// Click outside handler (Fixed close bug)
document.addEventListener('click', (e) => {
  const clickedInsideSearch = heroSearch?.contains(e.target);
  const clickedInsideResults = heroAutocomplete?.contains(e.target);
  
  if (!clickedInsideSearch && !clickedInsideResults) {
    heroAutocomplete?.classList.remove('open');
  }
});

  // ─── Testimonial slider ───────────────────────────
  window.changeTestimonial = function(dir) {
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.t-dot');
    if (!slides.length) return;
    let current = [...slides].findIndex(s => s.classList.contains('active'));
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (current + dir + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  };

  // Auto-rotate testimonials
  const tSlider = document.getElementById('testimonialSlider');
  if (tSlider) {
    setInterval(() => changeTestimonial(1), 5000);
  }

  // ─── Portfolio AJAX filter (home page) ────────────
  const portfolioGrid = document.getElementById('portfolioGrid');
  const portfolioSearch = document.getElementById('portfolioSearch');
  const portfolioSort = document.getElementById('portfolioSort');
  const portfolioBeds = document.getElementById('portfolioBeds');
  const portfolioMinPrice = document.getElementById('portfolioMinPrice');
  const portfolioMaxPrice = document.getElementById('portfolioMaxPrice');
  const portfolioStatus = document.getElementById('portfolioStatus');

  function buildListingCard(l) {
    const price = formatPrice(l.listPrice);
    const img = l.images && l.images.length > 0
      ? `https://cdn.repliers.io/${l.images[0]}`
      : '/images/placeholder.jpg';
    const statusClass = l.status === 'A' ? 'active' : l.status === 'U' ? 'sold' : 'pending';
    const statusLabel = l.status === 'A' ? 'Active' : l.status === 'U' ? 'Sold' : 'Pending';
    const beds = l.details?.numBedrooms
      ? `<span><i class="fas fa-bed"></i> ${l.details.numBedrooms}${l.details.numBedroomsPlus ? '+' + l.details.numBedroomsPlus : ''} Beds</span>` : '';
    const baths = l.details?.numBathrooms
      ? `<span><i class="fas fa-bath"></i> ${l.details.numBathrooms}${l.details.numBathroomsPlus ? '+' + l.details.numBathroomsPlus : ''} Baths</span>` : '';
    const sqft = l.details?.sqft
      ? `<span><i class="fas fa-ruler-combined"></i> ${l.details.sqft} sqft</span>` : '';
    const addr = l.address;
    const fullAddr = [addr?.streetNumber, addr?.streetName, addr?.streetSuffix].filter(Boolean).join(' ');
    const city = [addr?.city, addr?.state, addr?.zip].filter(Boolean).join(', ');

    return `
      <article class="listing-card">
        <a href="/listings/${l.mlsNumber}" class="card-image-wrap">
          <div class="card-image" style="background-image:url('${img}')">
            <div class="card-badges">
              <span class="badge badge-${statusClass}">${statusLabel}</span>
            </div>
            <div class="card-overlay"><span class="view-btn">View Details</span></div>
          </div>
        </a>
        <div class="card-body">
          <div class="card-price">${price}</div>
          <h3 class="card-address"><a href="/listings/${l.mlsNumber}">${fullAddr || 'Address on request'}</a></h3>
          <p class="card-location"><i class="fas fa-map-marker-alt"></i> ${city}</p>
          <div class="card-features">${beds}${baths}${sqft}</div>
          ${l.details?.propertyType ? `<div class="card-type-row"><span class="card-type">${l.details.propertyType}</span><span class="card-mls">MLS# ${l.mlsNumber}</span></div>` : ''}
        </div>
      </article>
    `;
  }

  async function fetchPortfolioListings() {
    if (!portfolioGrid) return;
    const params = new URLSearchParams({
      resultsPerPage: 6,
      sortBy: portfolioSort?.value || 'createdOnDesc',
      status: portfolioStatus?.value || 'A',
    });
    if (portfolioSearch?.value) params.set('search', portfolioSearch.value);
    if (portfolioBeds?.value) params.set('minBeds', portfolioBeds.value);
    if (portfolioMinPrice?.value) params.set('minPrice', portfolioMinPrice.value);
    if (portfolioMaxPrice?.value) params.set('maxPrice', portfolioMaxPrice.value);

    portfolioGrid.innerHTML = '<div class="no-listings"><i class="fas fa-spinner fa-spin"></i><p>Loading listings...</p></div>';
    try {
      const res = await fetch(`/api/listings?${params}`);
      const data = await res.json();
      if (!data.listings || data.listings.length === 0) {
        portfolioGrid.innerHTML = '<div class="no-listings"><i class="fas fa-home"></i><p>No listings found. <a href="/listings">View all listings</a></p></div>';
        return;
      }
      portfolioGrid.innerHTML = data.listings.map(buildListingCard).join('');
    } catch (e) {
      portfolioGrid.innerHTML = '<div class="no-listings"><i class="fas fa-exclamation-circle"></i><p>Could not load listings. Please try again.</p></div>';
    }
  }

  if (portfolioGrid) {
    // Attach events to portfolio filters
    [portfolioSort, portfolioBeds, portfolioMinPrice, portfolioMaxPrice, portfolioStatus].forEach(el => {
      el?.addEventListener('change', fetchPortfolioListings);
    });

    let portfolioDebounce;
    portfolioSearch?.addEventListener('input', () => {
      clearTimeout(portfolioDebounce);
      portfolioDebounce = setTimeout(fetchPortfolioListings, 400);
    });

    // Initial load
    fetchPortfolioListings();
  }

  // ─── Listings page view toggle ─────────────────────
  const viewBtns = document.querySelectorAll('.view-btn[data-view]');
  const listingsGrid = document.getElementById('listingsGrid');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (listingsGrid) {
        if (btn.dataset.view === 'list') {
          listingsGrid.classList.add('list-view');
        } else {
          listingsGrid.classList.remove('list-view');
        }
      }
    });
  });

  // ─── Scroll animations ────────────────────────────
  const animateEls = document.querySelectorAll(
    '.listing-card, .neighborhood-card, .neighborhood-full-card, .blog-card, .value-card, .cta-card, .process-step, .testimonial-card'
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, (idx % 4) * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    animateEls.forEach(el => {
      el.classList.add('animate-in');
      observer.observe(el);
    });
  }

  // ─── Utility: Format price ────────────────────────
  function formatPrice(price) {
    if (!price) return 'Price on Request';
    const num = parseFloat(price);
    if (isNaN(num)) return 'Price on Request';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
    return '$' + num.toLocaleString();
  }

  // ─── Smooth scroll for anchor links ───────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── Image lazy loading fallback ──────────────────
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    img.addEventListener('error', () => {
      img.src = '/images/placeholder.jpg';
    });
  });

  // ─── Counter animation on hero stats ──────────────
  const statEls = document.querySelectorAll('.hero-stats .stat strong');
  let statsAnimated = false;

  function animateCounter(el, target, suffix) {
    let start = 0;
    const duration = 1800;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (statEls.length) {
    const statsObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !statsAnimated) {
        statsAnimated = true;
        animateCounter(statEls[0], 500, '+');
        animateCounter(statEls[1], 20, '+');
        if (statEls[2]) statEls[2].textContent = '$250M+';
        if (statEls[3]) {
          setTimeout(() => animateCounter(statEls[3], 98, '%'), 400);
        }
      }
    }, { threshold: 0.5 });
    statsObserver.observe(statEls[0]);
  }

  // ─── Search tab toggle (hero) ─────────────────────
  const searchTabs = document.querySelectorAll('.search-tab');
  searchTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      searchTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Update form action based on tab
      const form = tab.closest('.hero-search')?.querySelector('form');
      if (form) {
        if (tab.dataset.tab === 'sell') {
          form.action = '/sell';
        } else {
          form.action = '/listings';
        }
      }
    });
  });

  console.log('%c🏠 Marco Esquivel Real Estate', 'color:#1a3a5c;font-size:18px;font-weight:bold;');
  console.log('%cBuilt with Node.js + Repliers API', 'color:#c9a96e;font-size:12px;');
});

// ─── Scroll to top button ─────────────────────────────
const scrollTopBtn = document.createElement('button');
scrollTopBtn.className = 'scroll-top';
scrollTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
scrollTopBtn.setAttribute('aria-label', 'Scroll to top');
document.body.appendChild(scrollTopBtn);

scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// ─── Toast helper ─────────────────────────────────────
window.showToast = function(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// ─── Lightbox body lock ───────────────────────────────
const openLightboxOrig = window.openLightbox;
window.openLightbox = function() {
  document.body.classList.add('lightbox-open');
  if (openLightboxOrig) openLightboxOrig();
};
const closeLightboxOrig = window.closeLightbox;
window.closeLightbox = function() {
  document.body.classList.remove('lightbox-open');
  if (closeLightboxOrig) closeLightboxOrig();
};

// ─── Mortgage calculator (sell page) ─────────────────
const calcForm = document.getElementById('mortgageCalc');
if (calcForm) {
  calcForm.addEventListener('input', () => {
    const price = parseFloat(document.getElementById('calcPrice')?.value) || 0;
    const down = parseFloat(document.getElementById('calcDown')?.value) || 0;
    const rate = parseFloat(document.getElementById('calcRate')?.value) || 0;
    const term = parseInt(document.getElementById('calcTerm')?.value) || 30;
    const principal = price - (price * down / 100);
    const monthly = rate > 0
      ? (principal * (rate/1200) * Math.pow(1 + rate/1200, term*12)) / (Math.pow(1 + rate/1200, term*12) - 1)
      : principal / (term * 12);
    const el = document.getElementById('calcResult');
    if (el && price > 0) {
      el.innerHTML = `<div class="monthly">$${monthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo</div><div class="monthly-label">Estimated Monthly Payment</div>`;
    }
  });
}

// ─── Listings filter form — preserve page scroll ──────
const filterForm = document.getElementById('listingsFilterForm');
filterForm?.addEventListener('submit', () => {
  sessionStorage.setItem('listingsScrollY', 0);
});

// ─── Image gallery keyboard nav (listing detail) ──────
document.addEventListener('keydown', (e) => {
  const lb = document.getElementById('lightbox');
  if (lb?.classList.contains('active')) {
    if (e.key === 'ArrowRight') window.lightboxNav(1);
    if (e.key === 'ArrowLeft') window.lightboxNav(-1);
    if (e.key === 'Escape') window.closeLightbox();
  }
});
