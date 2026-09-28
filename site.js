document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const productsDropdown = document.getElementById('productsDropdown');

  // Mobile Hamburger Menu Toggle
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isActive = navMenu.classList.toggle('active');
      document.body.classList.toggle('menu-open', isActive);
      menuToggle.setAttribute('aria-expanded', isActive);
      menuToggle.textContent = isActive ? '✕' : '☰';
    });
  }

  // Dropdown Logic (Click for mobile / fallback for desktop)
  if (productsDropdown) {
    const ddLabel = productsDropdown.querySelector('.dd-label');

    ddLabel.addEventListener('click', (e) => {
      e.stopPropagation();
      productsDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!productsDropdown.contains(e.target)) {
        productsDropdown.classList.remove('active');
      }
    });
  }

  // Footer year
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Service manuals load only when their matching service is opened.
  document.querySelectorAll('.service-guide[data-document]').forEach((guide) => {
    guide.addEventListener('toggle', () => {
      if (!guide.open || guide.dataset.loaded === 'true') return;

      const documentUrl = guide.dataset.document;
      const content = guide.querySelector('.service-guide__content');
      const title = guide.querySelector('summary strong')?.textContent || 'service';
      const viewer = document.createElement('iframe');
      viewer.src = `${documentUrl}#view=FitH`;
      viewer.title = `${title} technical guide`;
      viewer.loading = 'lazy';

      const fallback = document.createElement('p');
      fallback.className = 'service-guide__fallback';
      fallback.append('If the guide does not display in your browser, ');
      const link = document.createElement('a');
      link.href = documentUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'open or download the PDF';
      fallback.append(link, '.');

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
