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
});
