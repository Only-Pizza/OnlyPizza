import { Store } from './data-manager.js';

// ── WhatsApp Business Number ──────────────────────────────────────────────────
const WA_NUMBER = '56943892208'; // +56 9 4389 2208

let pizzas = [];
let cart = JSON.parse(localStorage.getItem('only_pizza_cart') || '[]');

function saveCart() {
  localStorage.setItem('only_pizza_cart', JSON.stringify(cart));
}

async function renderMenu(filter = 'Todas', limit = null) {
  const grid = document.querySelector('.pizza-grid');
  if (!grid) return;
  
  if (!limit) grid.innerHTML = '<div class="loading-spinner">Cargando menú...</div>';

  try {
    pizzas = await Store.getPizzas();
    grid.innerHTML = '';
    
    if (pizzas.length === 0) {
      grid.innerHTML = '<div style="color:var(--muted); font-family:var(--font-mono); grid-column:1/-1; text-align:center; padding:3rem;">// NO HAY PIZZAS DISPONIBLES EN EL MENÚ AÚN</div>';
      return;
    }

    const filteredTotal = filter === 'Todas' 
      ? pizzas 
      : pizzas.filter(p => p.category === filter);

    const pizzasToRender = limit ? filteredTotal.slice(0, limit) : filteredTotal;

    pizzasToRender.forEach((pizza) => {
      const card = document.createElement('div');
      card.className = 'pizza-card';
      const count = cart.filter(p => p.id === pizza.id).length;
      
      card.innerHTML = `
        <div class="card-img">
          <span class="card-num">${pizza.orderNum || '#'}</span>
          ${pizza.badge ? `<span class="card-badge">${pizza.badge}</span>` : ''}
          ${pizza.image ? `<img src="${pizza.image}" style="width:100%; height:100%; object-fit:cover;">` : `<img src="Pizza_800x800.png" style="width:100%; height:100%; object-fit:cover; opacity:0.7;">`}
        </div>
        <div class="card-body">
          <div class="card-name">${pizza.name}</div>
          <div class="card-ingr">${pizza.ingredients ? `// ${pizza.ingredients.join(' · ')}` : '// Receta secreta'}</div>
          <div class="card-footer">
            <div class="card-price">$${(pizza.price || 0).toLocaleString('es-CL')} <span>CLP</span></div>
            <div class="quantity-control ${count > 0 ? 'active' : ''}" data-id="${pizza.id}">
              <button class="qty-btn minus" data-id="${pizza.id}">-</button>
              <span class="qty-num">${count}</span>
              <button class="qty-btn plus" data-id="${pizza.id}">+</button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
      
      card.querySelector('.plus').addEventListener('click', function() {
        addToCart(this.dataset.id);
      });

      card.querySelector('.minus').addEventListener('click', function() {
        removeFromCart(this.dataset.id);
      });

      if (window.observer) {
        window.observer.observe(card);
      }
    });

    // Update "View All" button visibility
    const viewAllBox = document.getElementById('view-all-container');
    const viewAllBtn = document.getElementById('view-all-btn');
    
    if (viewAllBox && viewAllBtn) {
      if (limit && filteredTotal.length > limit) {
        viewAllBox.style.display = 'flex';
        viewAllBtn.onclick = () => { window.location.href = 'menu.html'; };
      } else {
        viewAllBox.style.display = 'none';
      }
    }

  } catch (err) {
    console.error("Error rendering menu:", err);
    grid.innerHTML = '<div style="color:var(--it-red)">ERROR CARGANDO EL MENÚ</div>';
  }
}

function addToCart(id) {
  const pizza = pizzas.find(p => p.id === id);
  if (!pizza) return;

  cart.push(pizza);
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  const index = cart.findLastIndex(p => p.id === id);
  if (index !== -1) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
  }
}

function updateCartUI() {
  const cta = document.querySelector('.nav-cta');
  const mobileCart = document.getElementById('mobile-cart-btn');
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  // Desktop Navbar CTA — opens modal
  if (cta) {
    if (cart.length > 0) {
      cta.textContent = `Pedir (${cart.length}) - $${total.toLocaleString('es-CL')}`;
      cta.href = '#';
      cta.onclick = (e) => { e.preventDefault(); window.openOrderModal && window.openOrderModal(); };
    } else {
      cta.textContent = 'Pedir Ahora';
      cta.href = '#';
      cta.onclick = null;
    }
  }

  // Mobile Floating Cart (now a <button>) — show/hide and open modal
  if (mobileCart) {
    if (cart.length > 0) {
      mobileCart.style.display = '';
      mobileCart.classList.add('active');
      mobileCart.onclick = () => { window.openOrderModal && window.openOrderModal(); };
      const countEl = mobileCart.querySelector('.mcf-count');
      const totalEl = mobileCart.querySelector('.mcf-total');
      if (countEl) countEl.textContent = cart.length;
      if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-CL')}`;
    } else {
      mobileCart.classList.remove('active');
      mobileCart.style.display = 'none';
      mobileCart.onclick = null;
    }
  }

  // Update card quantities
  document.querySelectorAll('.quantity-control').forEach(ctrl => {
    const id = ctrl.dataset.id;
    const count = cart.filter(p => p.id === id).length;
    const numEl = ctrl.querySelector('.qty-num');
    if (numEl) numEl.textContent = count;
    if (count > 0) ctrl.classList.add('active');
    else ctrl.classList.remove('active');
  });

  // Refresh modal if active
  const omOverlay = document.getElementById('order-modal');
  if (omOverlay && omOverlay.classList.contains('active')) {
    window.renderModalSummary && window.renderModalSummary();
  }
}


function generateWhatsAppLink(orderData = {}) {
  if (cart.length === 0) return '#';
  
  const grouped = cart.reduce((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + 1;
    return acc;
  }, {});

  const { name = '', deliveryType = 'Despacho', address = '', payment = 'Transferencia', notes = '' } = orderData;

  const pizza = String.fromCodePoint(0x1F355);
  const userIcon = String.fromCodePoint(0x1F464);
  const money = String.fromCodePoint(0x1F4B0);
  const truck = String.fromCodePoint(0x1F69A);
  const pin = String.fromCodePoint(0x1F4CD);
  const card = String.fromCodePoint(0x1F4B3);
  const notesIcon = String.fromCodePoint(0x1F4DD);
  const pray = String.fromCodePoint(0x1F64F);

  let message = "\u00A1Hola! Quiero realizar un pedido " + pizza + "\n";
  if (name) message += userIcon + " *" + name.toUpperCase() + "*\n";
  message += "\n";

  for (const [pizzaName, qty] of Object.entries(grouped)) {
    message += "\u2022 " + qty + "x " + pizzaName.toUpperCase() + "\n";
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  message += "\n" + money + " *Total: $" + total.toLocaleString('es-CL') + " CLP*";
  message += "\n" + truck + " *Entrega: " + deliveryType + "*";
  if (deliveryType === 'Despacho' && address) message += "\n" + pin + " *Direcci\u00f3n: " + address + "*";
  message += "\n" + card + " *Pago: " + payment + "*";
  if (notes) message += "\n\n" + notesIcon + " *Notas: " + notes + "*";
  message += "\n\n\u00bfMe confirman el tiempo de entrega? " + pray;

  return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message);
}

async function renderOffers() {
  const container = document.getElementById('offers-dynamic-grid');
  const section = document.getElementById('offers');
  if (!container || !section) return;

  try {
    const settings = await Store.getSettings();
    const offersEnabled = settings.landing?.offersEnabled !== false;

    if (!offersEnabled) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const offers = await Store.getOffers();
    const activeOffers = offers.filter(off => off.active !== false);
    
    container.innerHTML = activeOffers.map(off => `
      <div class="offer-card ${off.featured ? 'featured' : ''} ${off.fullWidth ? 'full-width-layout' : ''}" 
           style="${off.fullWidth ? 'grid-column: span 2;' : ''} ${off.image ? `background-image: url('${off.image}')` : ''}">
        <div class="offer-content">
          ${off.fullWidth ? `
            <div style="display:flex; flex-direction:column; gap:0.5rem; flex:1;">
              <div class="offer-discount" style="font-size:3rem">${off.discount.replace('\n', '<br>')}</div>
              <div class="offer-title">${off.title}</div>
              <div class="offer-desc">${off.desc}</div>
              <div class="offer-tag">${off.tag}</div>
            </div>
            <div style="font-size:5rem; opacity:0.3" class="full-width-icon">🍕</div>
          ` : `
            <div class="offer-discount" style="${off.discount.length > 3 ? 'font-size:3.5rem' : ''}">${off.discount}</div>
            <div class="offer-title">${off.title}</div>
            <div class="offer-desc">${off.desc}</div>
            <div class="offer-tag">${off.tag}</div>
            ${off.featured ? '<div class="offer-glow"></div>' : ''}
          `}
        </div>
      </div>
    `).join('');

    // Re-observe animations
    document.querySelectorAll('.offer-card').forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 0.1 + 's';
      if (window.observer) window.observer.observe(el);
    });

  } catch (err) {
    console.error("Error rendering offers:", err);
    section.style.display = 'none';
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  window.observer = observer; // Share with dynamic cards

  document.querySelectorAll('.step').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 0.1 + 's';
    observer.observe(el);
  });

  renderOffers();

  const getInitialLimit = () => window.innerWidth < 900 ? 4 : 6;

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMenu(btn.textContent, getInitialLimit());
    });
  });

  // Parallax - Smooth for Desktop only
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking && window.innerWidth >= 900) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const heroContent = document.querySelector('.hero-content');
        const heroVisual = document.querySelector('.hero-visual');
        
        if (heroContent) heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
        if (heroVisual) heroVisual.style.transform = `translateY(calc(-50% + ${scrollY * 0.15}px))`;
        
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });

  renderMenu('Todas', getInitialLimit());
  renderOffers();

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-links a, .mobile-cta');

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // Hidden Admin Access: Ctrl + Shift + Z
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
      window.location.href = 'admin.html';
    }
  });

  // ── ORDER MODAL LOGIC ──────────────────────────────────────────────────────
  const omOverlay    = document.getElementById('order-modal');
  const omCloseBtn   = document.getElementById('om-close-btn');
  const omConfirmBtn = document.getElementById('om-confirm-btn');
  const omCartSummary = document.getElementById('om-cart-summary');
  const omAddressGroup = document.getElementById('om-address-group');
  const omNameInput  = document.getElementById('om-name');
  const omAddrInput  = document.getElementById('om-address');

  let omDeliveryType = 'Despacho';
  let omPayment = 'Transferencia';

  function renderModalSummary() {
    if (cart.length === 0) {
      closeOrderModal();
      return;
    }

    const grouped = cart.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = { qty: 0, id: item.id, price: item.price };
      }
      acc[item.name].qty++;
      return acc;
    }, {});
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    omCartSummary.innerHTML = Object.entries(grouped).map(([name, data]) => {
      return `
        <div class="om-summary-line">
          <div style="display:flex; align-items:center;">
             <div class="om-qty-actions">
               <button class="om-qty-btn modal-minus" data-id="${data.id}">-</button>
               <span class="om-qty-num">${data.qty}</span>
               <button class="om-qty-btn modal-plus" data-id="${data.id}">+</button>
             </div>
             <span>${name}</span>
          </div>
          <span>$${(data.price * data.qty).toLocaleString('es-CL')}</span>
        </div>`;
    }).join('') + `<div class="om-summary-line total"><span>TOTAL</span><span>$${total.toLocaleString('es-CL')} CLP</span></div>`;
  }

  function openOrderModal() {
    if (cart.length === 0) return;

    renderModalSummary();

    // Reset fields
    omNameInput.value = '';
    omAddrInput.value = '';
    omDeliveryType = 'Despacho';
    omPayment = 'Transferencia';
    setActiveToggle(document.getElementById('om-btn-despacho'), '.om-toggle-group:not(.om-pay-group) .om-toggle');
    setActiveToggle(omOverlay.querySelector('[data-pay="Transferencia"]'), '.om-pay-group .om-toggle');
    omAddressGroup.classList.remove('hidden');

    // Show modal
    omOverlay.setAttribute('aria-hidden', 'false');
    omOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => omNameInput.focus(), 350);
  }

  function closeOrderModal() {
    omOverlay.classList.remove('active');
    omOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function setActiveToggle(btn, selector) {
    omOverlay.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }


  // Payment toggles
  omOverlay.querySelectorAll('.om-pay-group .om-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      omPayment = btn.dataset.pay;
      setActiveToggle(btn, '.om-pay-group .om-toggle');
    });
  });

  // Close events
  omCloseBtn.addEventListener('click', closeOrderModal);
  omOverlay.addEventListener('click', (e) => { if (e.target === omOverlay) closeOrderModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOrderModal(); });

  // Modal quantity delegation
  omCartSummary.addEventListener('click', (e) => {
    const btn = e.target.closest('.om-qty-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('modal-plus')) addToCart(id);
    else if (btn.classList.contains('modal-minus')) removeFromCart(id);
  });

  // Confirm: build link and open WhatsApp
  omConfirmBtn.addEventListener('click', async () => {
    const originalText = omConfirmBtn.textContent;
    omConfirmBtn.disabled = true;
    omConfirmBtn.textContent = 'PROCESANDO...';

    const notesValue = document.getElementById('om-notes').value.trim();
    const orderData = {
      name: omNameInput.value.trim(),
      deliveryType: omDeliveryType,
      address: omAddrInput.value.trim(),
      payment: omPayment,
      notes: notesValue
    };

    try {
      // 1. Construct detailed string for Firebase (compatibility with admin panel)
      const grouped = cart.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + 1;
        return acc;
      }, {});
      const details = Object.entries(grouped).map(([n, q]) => `${q}x ${n}`).join(', ');
      const total = cart.reduce((sum, item) => sum + item.price, 0);

      // 2. Save to Firestore
      const savedOrder = await Store.addOrder({
        customer: orderData.name || 'CLIENTE WEB',
        details: details,
        total: total,
        type: orderData.deliveryType,
        payment: orderData.payment,
        address: orderData.address,
        notes: orderData.notes, // New field
        timestamp: new Date().toISOString()
      });

      // 3. Generate Link (maybe include order number)
      const link = generateWhatsAppLink(orderData);
      
      if (link !== '#') {
        // Clear cart and close modal
        cart = [];
        saveCart();
        updateCartUI();
        closeOrderModal();
        window.location.href = link;
      }
    } catch (err) {
      console.error("Error al registrar pedido:", err);
      alert("Hubo un error al procesar tu pedido. Por favor intenta de nuevo.");
    } finally {
      omConfirmBtn.disabled = false;
      omConfirmBtn.textContent = originalText;
    }
  });

  // Expose for other parts of the code
  window.openOrderModal = openOrderModal;
  window.renderModalSummary = renderModalSummary;
  // ── /ORDER MODAL LOGIC ─────────────────────────────────────────────────────
});

export { renderMenu, addToCart };
