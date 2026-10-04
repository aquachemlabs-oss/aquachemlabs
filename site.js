document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const productsDropdown = document.getElementById('productsDropdown');

  // Mobile Hamburger Menu Toggle
  if (menuToggle && navMenu) {
    menuToggle.setAttribute('aria-controls', 'navMenu');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const closeMenu = (restoreFocus = true) => {
      navMenu.classList.remove('active');
      document.body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open navigation');
      menuToggle.textContent = '☰';
      if (restoreFocus) menuToggle.focus();
    };
    const openMenu = () => {
      navMenu.classList.add('active');
      document.body.classList.add('menu-open');
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Close navigation');
      menuToggle.textContent = '✕';
      navMenu.querySelector(focusableSelector)?.focus();
    };
    menuToggle.addEventListener('click', () => {
      navMenu.classList.contains('active') ? closeMenu() : openMenu();
    });
    navMenu.addEventListener('click', (event) => {
      if (event.target.closest('a') && window.innerWidth <= 1024) closeMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (!navMenu.classList.contains('active')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [menuToggle, ...navMenu.querySelectorAll(focusableSelector)].filter((el) => el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && navMenu.classList.contains('active')) closeMenu(false);
    });
  }

  // Dropdown Logic (Click for mobile / fallback for desktop)
  if (productsDropdown) {
    const ddLabel = productsDropdown.querySelector('.dd-label');
    ddLabel.setAttribute('aria-expanded', 'false');

    ddLabel.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = productsDropdown.classList.toggle('active');
      ddLabel.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', (e) => {
      if (!productsDropdown.contains(e.target)) {
        productsDropdown.classList.remove('active');
        ddLabel.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Footer year
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Submit quote enquiries to Netlify Forms; email notifications route them to ACL.
  const quoteForm = document.getElementById('qf');
  if (quoteForm) {
    const formStatus = quoteForm.querySelector('[data-form-status]');
    const submitButton = quoteForm.querySelector('button[type="submit"]');
    quoteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!quoteForm.reportValidity()) return;
      const analysisInput = quoteForm.querySelector('input[type="file"]');
      if (analysisInput?.files?.length) { quoteForm.submit(); return; }
      submitButton.disabled = true;
      if (formStatus) { formStatus.className = 'note form-status'; formStatus.textContent = 'Sending your quote request…'; }
      try {
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(quoteForm)).toString(),
        });
        if (!response.ok) throw new Error('Submission failed');
        quoteForm.reset();
        if (formStatus) {
          formStatus.className = 'note form-status is-ok';
          formStatus.textContent = 'Thank you. Your quote request has been received by our technical team.';
        }
      } catch {
        if (formStatus) {
          formStatus.className = 'note form-status is-error';
          formStatus.innerHTML = 'The form could not connect. Please <a href="mailto:info@aquachemlabs.com?subject=Quote%20request">email info@aquachemlabs.com directly</a>.';
        }
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  // Route each common water problem to its matching treatment solution.
  const problemSelect = document.getElementById('prob');
  const problemResult = document.getElementById('res');
  if (problemSelect && problemResult) {
    const solutions = {
      hard: { title: 'Water Softener Plant', text: 'Ion-exchange softening removes hardness that causes scale in pipes, heaters and process equipment.', href: '/plant-care-guide#softener', link: 'View softener solution' },
      tds: { title: 'Industrial RO Plant', text: 'Reverse osmosis reduces dissolved salts and high TDS for process, utility and potable-water applications.', href: '/ro-plant', link: 'View RO plant solution' },
      pure: { title: 'DM / Mixed-Bed Plant', text: 'Demineralisation and mixed-bed polishing produce the low-conductivity water required by demanding industrial processes.', href: '/plant-care-guide#dm', link: 'View DM plant solution' },
      boiler: { title: 'Boiler Water Treatment', text: 'A combined chemical, blowdown and monitoring programme controls boiler scale, oxygen corrosion and deposits.', href: '/plant-care-guide#boiler', link: 'View boiler solution' },
      cool: { title: 'Cooling Tower Treatment', text: 'Scale inhibitors, corrosion control, biocides and cycle management protect cooling-water performance.', href: '/plant-care-guide#cooling', link: 'View cooling tower solution' },
      etp: { title: 'Effluent Treatment Plant (ETP)', text: 'Physical, chemical and biological treatment reduces industrial COD, BOD, solids and pollutants before reuse or discharge.', href: '/plant-care-guide#etp', link: 'View ETP solution' },
      stp: { title: 'Sewage Treatment Plant (STP)', text: 'Screening, biological treatment, clarification and disinfection control sewage odour, BOD and suspended solids.', href: '/plant-care-guide#stp', link: 'View STP solution' },
      turb: { title: 'Filtration & Clarification System', text: 'Media filtration, clarification and cartridge or bag filtration remove turbidity and suspended particles.', href: '/about-us#plant-functions', link: 'View filtration solution' },
    };
    const renderSolution = () => {
      const solution = solutions[problemSelect.value];
      if (!solution) {
        problemResult.className = 'result';
        problemResult.textContent = 'Pick a problem and our diagnostic guide will suggest where to start.';
        return;
      }
      problemResult.className = 'result result--solution';
      problemResult.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = solution.title;
      const description = document.createElement('span');
      description.textContent = solution.text;
      const actions = document.createElement('span');
      actions.className = 'result__actions';
      const solutionLink = document.createElement('a');
      solutionLink.href = solution.href;
      solutionLink.textContent = solution.link;
      const quoteLink = document.createElement('a');
      quoteLink.href = `/contact#qf`;
      quoteLink.textContent = 'Request a quote';
      actions.append(solutionLink, quoteLink);
      problemResult.append(title, description, actions);
    };
    problemSelect.addEventListener('change', renderSolution);
    renderSolution();
  }

  // Large PDFs load only after a visitor explicitly requests them.
  document.querySelectorAll('[data-pdf]').forEach((placeholder) => {
    placeholder.querySelector('button')?.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.className = 'brochure-frame';
      frame.src = placeholder.dataset.pdf;
      frame.title = 'Aqua Chem Labs brochure ACL 2025';
      placeholder.replaceWith(frame);
    }, { once: true });
  });

  // Service manuals: each card now has a real static PDF link, so opening the guide
  // does not depend on JavaScript. Expanding the card also loads an inline preview.
  document.querySelectorAll('.service-guide[data-document]').forEach((guide) => {
    const documentUrl = guide.dataset.document;
    const title = guide.querySelector('summary strong')?.textContent || 'service';
    const content = guide.querySelector('.service-guide__content');

    guide.addEventListener('toggle', () => {
      if (!guide.open || guide.dataset.loaded === 'true') return;

      const viewer = document.createElement('iframe');
      viewer.src = documentUrl + '#view=FitH';
      viewer.title = title + ' technical guide PDF preview';
      viewer.loading = 'lazy';

      const fallback = document.createElement('p');
      fallback.className = 'service-guide__fallback';
      fallback.append('Embedded PDF preview may vary by browser. Use ');
      const link = document.createElement('a');
      link.href = documentUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open PDF in new tab';
      fallback.append(link, ' if the preview does not load.');

      content.append(viewer, fallback);
      guide.dataset.loaded = 'true';
    });
  });

  // Water-treatment plant photo behind every page (varies by page).
  const backgrounds = ['plant-ro-skid', 'plant-dm-vessels', 'plant-uf', 'plant-stp', 'plant-cooling-tower', 'plant-etp', 'plant-process-water', 'plant-recycling'];
  const page = location.pathname.split('/').pop() || 'index.html';
  const bgIndex = [...page].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % backgrounds.length;
  document.body.style.setProperty('--page-bg', `url('images/web/${backgrounds[bgIndex]}.jpg')`);

  // Product image previews: hover, focus or tap an item in a [data-preview-list].
  const productImages = [
    ['membrane wall', 'plant-boiler'], ['gauge glass', 'plant-boiler'],
    ['membrane housing', 'plant-ro-skid'], ['housing', 'plant-ro-skid'], ['end cap', 'plant-ro-skid'], ['coupler', 'plant-ro-skid'], ['connector', 'plant-ro-skid'],
    ['membrane', 'spare-membrane'], ['fins', 'spare-fill'], ['fill', 'spare-fill'], ['coupon', 'spare-coupon'],
    ['dosing', 'spare-dosing-pump'], ['cartridge', 'spare-cartridge'], ['bag filter', 'spare-bag-filter'], ['woven filter', 'spare-bag-filter'],
    ['testing kit', 'spare-test-kit'], ['test kit', 'spare-test-kit'], ['diffuser', 'spare-diffuser'],
    ['rotameter', 'spare-rotameter'], ['flow meter', 'spare-rotameter'], ['tube settler', 'spare-tube-settler'], ['filter press', 'spare-filter-press'],
    ['strainer', 'spare-strainer'], ['control panel', 'spare-panel'], ['electrical', 'spare-panel'],
    ['boiler sand', 'plant-boiler'], ['bed material', 'plant-boiler'],
    ['carbon media', 'plant-carbon-filter'], ['carbon filter', 'plant-carbon-filter'], ['filter media', 'spare-media'], ['media', 'spare-media'], ['sand filter', 'spare-media'],
    ['frp', 'plant-softener'], ['pressure vessel', 'plant-softener'], ['multiport', 'plant-softener'], ['resin', 'spare-resin'],
    ['mechanical seal', 'spare-seal'], ['gland', 'spare-seal'], ['butterfly', 'spare-butterfly-valve'], ['ball valve', 'spare-ball-valve'],
    ['gate valve', 'spare-gate-valve'], ['globe', 'spare-globe-valve'], ['diaphragm', 'spare-diaphragm-valve'],
    ['gauge', 'spare-gauge'], ['pump', 'spare-pump'], ['valve', 'spare-ball-valve'],
    ['tds', 'spare-tds-meter'], ['ph meter', 'spare-ph-meter'], ['ph sensor', 'spare-ph-meter'], ['orp', 'spare-ph-meter'],
    ['ec meter', 'spare-conductivity'], ['conductivity', 'spare-conductivity'], ['instrument', 'spare-conductivity'],
    ['consumable', 'spare-cartridge'], ['filters', 'spare-cartridge'],
  ];
  const previewLists = document.querySelectorAll('[data-preview-list]');
  if (previewLists.length) {
    const preview = document.createElement('figure');
    preview.className = 'product-preview';
    preview.hidden = true;
    preview.innerHTML = '<button type="button" class="product-preview__close" aria-label="Close image">✕</button><img alt=""><figcaption><strong></strong><span></span></figcaption>';
    document.body.append(preview);
    const previewImg = preview.querySelector('img');
    const previewTitle = preview.querySelector('strong');
    const previewContext = preview.querySelector('figcaption span');
    let activeItem = null;
    let pinned = false;

    const place = (item) => {
      if (window.innerWidth < 720) { preview.classList.add('product-preview--sheet'); preview.style.left = preview.style.top = ''; return; }
      preview.classList.remove('product-preview--sheet');
      const rect = item.getBoundingClientRect();
      const width = preview.offsetWidth;
      const height = preview.offsetHeight;
      let left = rect.right + 14;
      if (left + width > window.innerWidth - 12) left = rect.left - width - 14;
      if (left < 12) left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      const top = Math.min(Math.max(12, rect.top + rect.height / 2 - height / 2), window.innerHeight - height - 12);
      preview.style.left = `${left}px`;
      preview.style.top = `${top}px`;
    };
    const show = (item) => {
      activeItem?.classList.remove('is-previewing');
      activeItem = item;
      item.classList.add('is-previewing');
      previewImg.src = item.dataset.img;
      previewImg.alt = item.textContent.trim();
      previewTitle.textContent = item.textContent.trim();
      previewContext.textContent = item.dataset.context || '';
      preview.hidden = false;
      place(item);
    };
    const hide = () => {
      preview.hidden = true;
      pinned = false;
      activeItem?.classList.remove('is-previewing');
      activeItem = null;
    };
    previewImg.addEventListener('load', () => activeItem && place(activeItem));

    previewLists.forEach((list) => {
      list.querySelectorAll('li').forEach((item) => {
        const name = item.textContent.toLowerCase();
        const match = list.hasAttribute('data-preview-fixed') ? null : productImages.find(([keyword]) => name.includes(keyword));
        const image = match ? match[1] : list.dataset.img;
        if (!image) return;
        item.dataset.img = `images/web/${image}.jpg`;
        if (list.dataset.context) item.dataset.context = list.dataset.context;
        item.classList.add('has-preview');
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.addEventListener('mouseenter', () => { if (!pinned) show(item); });
        item.addEventListener('mouseleave', () => { if (!pinned) hide(); });
        item.addEventListener('focus', () => { if (!pinned) show(item); });
        item.addEventListener('blur', () => { if (!pinned) hide(); });
        item.addEventListener('click', () => {
          if (pinned && activeItem === item) { hide(); return; }
          show(item);
          pinned = true;
        });
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
          if (e.key === 'Escape') hide();
        });
      });
    });
    preview.querySelector('.product-preview__close').addEventListener('click', hide);
    document.addEventListener('click', (e) => {
      if (pinned && !preview.contains(e.target) && !e.target.closest('.has-preview')) hide();
    });
    window.addEventListener('scroll', () => { if (activeItem && !preview.hidden) place(activeItem); }, { passive: true });
  }
});

// Hero slideshows (home & About Us): advance to the next plant photo every 5 seconds
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-hero-slides]').forEach((root) => {
    const slides = [...root.querySelectorAll('.hero-slide')];
    const dots = [...root.querySelectorAll('.hero-slides__dots button')];
    const label = root.querySelector('.hero-slides__label');
    let current = 0;
    let timer;
    let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pauseButton = document.createElement('button');
    pauseButton.type = 'button';
    pauseButton.className = 'hero-slides__pause';
    pauseButton.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pauseButton.textContent = paused ? 'Play' : 'Pause';
    root.querySelector('.hero-slides__ui')?.append(pauseButton);

    const show = (next) => {
      if (next === current) return;
      slides.forEach((s) => s.classList.remove('is-prev'));
      slides[current].classList.replace('is-active', 'is-prev');
      slides[next].classList.add('is-active');
      dots.forEach((d, i) => d.setAttribute('aria-current', i === next ? 'true' : 'false'));
      label.textContent = slides[next].dataset.label;
      current = next;
    };
    const start = () => {
      clearInterval(timer);
      if (!paused && !document.hidden) timer = setInterval(() => show((current + 1) % slides.length), 5000);
    };

    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); start(); }));
    pauseButton.addEventListener('click', () => {
      paused = !paused;
      pauseButton.textContent = paused ? 'Play' : 'Pause';
      pauseButton.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      start();
    });
    document.addEventListener('visibilitychange', start);
    start();
  });

  // Add consistent Organization / WebSite structured data where page-level schema is absent.
  if (!document.querySelector('script[data-acl-site-schema]')) {
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': 'https://aquachemlabs.com/#organization',
          name: 'Aqua Chem Labs',
          url: 'https://aquachemlabs.com/',
          logo: 'https://aquachemlabs.com/logo.png',
          telephone: '+91 79749 99929',
          email: 'info@aquachemlabs.com',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Raisen',
            addressRegion: 'Madhya Pradesh',
            addressCountry: 'IN'
          },
          sameAs: ['https://www.google.com/maps?cid=10116669877027612464']
        },
        {
          '@type': 'WebSite',
          '@id': 'https://aquachemlabs.com/#website',
          url: 'https://aquachemlabs.com/',
          name: 'Aqua Chem Labs',
          publisher: { '@id': 'https://aquachemlabs.com/#organization' },
          inLanguage: 'en-IN'
        }
      ]
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.aclSiteSchema = 'true';
    script.textContent = JSON.stringify(schema);
    document.head.append(script);
  }

  // Add social metadata for legacy pages that do not yet have Open Graph tags.
  const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href.split('#')[0];
  const title = document.title;
  const description = document.querySelector('meta[name="description"]')?.content || '';
  const ensureMeta = (property, content) => {
    let node = document.querySelector(`meta[property="${property}"]`);
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute('property', property);
      document.head.append(node);
    }
    node.content = content;
  };
  ensureMeta('og:title', title);
  ensureMeta('og:description', description);
  ensureMeta('og:url', canonical);
  ensureMeta('og:type', 'website');
  ensureMeta('og:image', 'https://aquachemlabs.com/logo.png');

});

// Gallery category filters
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-gallery-filter]').forEach((group) => {
    const grid = document.getElementById(group.dataset.galleryFilter);
    const buttons = [...group.querySelectorAll('button')];
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      grid.querySelectorAll('figure').forEach((fig) => { fig.hidden = cat !== 'all' && fig.dataset.cat !== cat; });
    }));
  });
});


// Site-wide accessibility, navigation and conversion enhancements.
document.addEventListener('DOMContentLoaded', () => {
  const normalizePath = (value) => {
    const path = new URL(value, window.location.origin).pathname.replace(/\.html$/i, '').replace(/\/+$/,'');
    return path || '/';
  };

  const currentPath = normalizePath(window.location.href);

  // Keep the active navigation state accurate on every page.
  document.querySelectorAll('.nav-menu a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
    if (normalizePath(href) === currentPath) link.setAttribute('aria-current', 'page');
  });

  // Secure all new-tab links consistently.
  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    const rel = new Set((link.getAttribute('rel') || '').split(/\\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', [...rel].join(' '));
  });

  // Image performance: preserve the first viewport hero while lazy-loading the rest.
  const heroImage = document.querySelector('.hero img');
  document.querySelectorAll('main img').forEach((img) => {
    if (img === heroImage) {
      img.loading = 'eager';
      img.decoding = 'async';
      img.setAttribute('fetchpriority', 'high');
    } else {
      if (!img.getAttribute('loading')) img.loading = 'lazy';
      if (!img.getAttribute('decoding')) img.decoding = 'async';
    }

    if (!img.hasAttribute('alt')) {
      const figure = img.closest('figure');
      const caption = figure?.querySelector('figcaption')?.textContent?.trim();
      const filename = img.currentSrc || img.src || '';
      const name = filename.split('/').pop()?.replace(/[-_]+/g, ' ').replace(/\\.[a-z0-9]+$/i, '').trim();
      img.alt = caption || name || 'Aqua Chem Labs water treatment equipment';
    }
  });

  // Add lightweight breadcrumbs to internal pages for users and search engines.
  if (currentPath !== '/' && document.querySelector('main') && !document.querySelector('.site-breadcrumbs')) {
    const main = document.querySelector('main');
    const h1 = main.querySelector('h1');
    const label = h1?.textContent?.replace(/\\s+/g, ' ').trim() || document.title.split('|')[0].trim();
    const nav = document.createElement('nav');
    nav.className = 'site-breadcrumbs wrap';
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.innerHTML = '<a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page"></span>';
    nav.querySelector('[aria-current="page"]').textContent = label;
    main.prepend(nav);

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aquachemlabs.com/' },
        { '@type': 'ListItem', position: 2, name: label, item: window.location.href.split('#')[0] }
      ]
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbJsonLd);
    document.head.append(script);
  }

  // Add a compact technical enquiry bar to high-intent pages.
  const highIntent = /\\/(services|products|ro-plant|chemicals|plant-spares|ibr-valves|strainers-kits|boiler-spares|etp-plant|stp-plant|dm-plant|softener-plant|filtration-systems|boiler-water-treatment|cooling-tower-water-treatment|zld-plant)(?:\\/)?$/i.test(currentPath);
  if (highIntent && !document.querySelector('.technical-cta-bar')) {
    const bar = document.createElement('aside');
    bar.className = 'technical-cta-bar';
    bar.setAttribute('aria-label', 'Technical enquiry');
    bar.innerHTML = '<div><strong>Need the right system or chemical programme?</strong><span>Share your water analysis and operating requirement with our technical team.</span></div><div class="technical-cta-bar__actions"><a href="/contact#qf" class="btn">Request a technical quote</a><a href="https://wa.me/917974999929?text=Hello%20Aqua%20Chem%20Labs%2C%20I%20need%20technical%20advice." target="_blank" rel="noopener noreferrer" class="btn ghost">WhatsApp</a></div>';
    document.body.append(bar);
  }
});
