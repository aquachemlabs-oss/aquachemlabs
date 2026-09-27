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
});
