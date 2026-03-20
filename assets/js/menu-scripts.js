  import { Store } from './data-manager.js';

  let pizzas = [];
  let cart = JSON.parse(localStorage.getItem('only_pizza_cart') || '[]');

  function saveCart() {
    localStorage.setItem('only_pizza_cart', JSON.stringify(cart));
  }

  async function initMenu() {
    const container = document.getElementById('menu-sections-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Cargando nuestra carta...</div>';

    try {
      pizzas = await Store.getPizzas();
      container.innerHTML = '';

      if (pizzas.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:5rem; font-family:var(--font-mono); opacity:0.5;">// NO HAY PIZZAS DISPONIBLES AÚN</div>';
        return;
      }

      // Group by category
      const categories = ['Clásicas', 'Especiales', 'Veggie'];
      const grouped = categories.reduce((acc, cat) => {
        acc[cat] = pizzas.filter(p => p.category === cat);
        return acc;
      }, {});

      // Render each category
      Object.entries(grouped).forEach(([catName, items]) => {
        if (items.length === 0) return;

        const section = document.createElement('section');
        section.className = 'category-section';
        const sectionId = catName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        section.id = sectionId;
        section.innerHTML = `
          <h2 class="category-title reveal">${catName.toUpperCase()}</h2>
          <div class="pro-menu-grid">
            ${items.map(pizza => renderProItem(pizza)).join('')}
          </div>
        `;
        container.appendChild(section);
      });

      // Initialize animations
      initAnimations();
      updateMenuCartUI();
      setupItemEvents();

    } catch (err) {
      console.error("Error loading pro menu:", err);
      container.innerHTML = '<div style="color:var(--it-red); text-align:center;">ERROR AL CARGAR EL MENÚ</div>';
    }
  }

  function renderProItem(pizza) {
    const count = cart.filter(p => p.id === pizza.id).length;
    return `
      <div class="pro-item reveal" data-id="${pizza.id}">
        <div class="pro-item-visual">
          ${pizza.image 
            ? `<img src="${pizza.image}" alt="${pizza.name}">` 
            : `<img src="Pizza_800x800.png" alt="Fallback" style="opacity:0.3">`}
        </div>
        <div class="pro-item-info">
          ${pizza.badge ? `<span class="pro-item-badge">${pizza.badge}</span>` : ''}
          <h3 class="pro-item-name">${pizza.name}</h3>
          <p class="pro-item-desc">${pizza.ingredients ? pizza.ingredients.join(' · ') : 'Receta secreta del maestro pizzero.'}</p>
          
          <div class="pro-item-controls">
            <div class="pro-item-price">$${(pizza.price || 0).toLocaleString('es-CL')} <span>CLP</span></div>
            
            <div class="quantity-control ${count > 0 ? 'active' : ''}" data-id="${pizza.id}">
              <button class="qty-btn pro-minus" data-id="${pizza.id}">-</button>
              <span class="qty-num">${count}</span>
              <button class="qty-btn pro-plus" data-id="${pizza.id}">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function setupItemEvents() {
    document.querySelectorAll('.pro-plus').forEach(btn => {
      btn.onclick = () => addToCart(btn.dataset.id);
    });
    document.querySelectorAll('.pro-minus').forEach(btn => {
      btn.onclick = () => removeFromCart(btn.dataset.id);
    });
  }

  function addToCart(id) {
    const pizza = pizzas.find(p => p.id === id);
    if (!pizza) return;
    cart.push(pizza);
    saveCart();
    updateMenuCartUI();
    updateItemQty(id);
  }

  function removeFromCart(id) {
    const index = cart.findLastIndex(p => p.id === id);
    if (index !== -1) {
      cart.splice(index, 1);
      saveCart();
      updateMenuCartUI();
      updateItemQty(id);
    }
  }

  function updateItemQty(id) {
    const count = cart.filter(p => p.id === id).length;
    const controls = document.querySelectorAll(`.quantity-control[data-id="${id}"]`);
    controls.forEach(ctrl => {
      const num = ctrl.querySelector('.qty-num');
      if (num) num.textContent = count;
      if (count > 0) ctrl.classList.add('active');
      else ctrl.classList.remove('active');
    });
  }

  function updateMenuCartUI() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const cartStatus = document.getElementById('header-cart-total');
    if (cartStatus) {
      cartStatus.textContent = `$${total.toLocaleString('es-CL')}`;
      const countLabel = document.getElementById('header-cart-count');
      if (countLabel) countLabel.textContent = `(${cart.length})`;
    }
  }

  function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    btn.onclick = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // Init on load
  document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    initBackToTop();
  });
