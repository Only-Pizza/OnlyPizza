        import { Store } from './data-manager.js';

        const statuses = ['Recibido', 'Preparaci\u00f3n', 'Al Horno', 'En Despacho'];

        // --- PREMIUM NOTIFICATIONS ---
        const Notify = {
            show(msg, type = 'info') {
                const container = document.getElementById('notyf-container');
                const toast = document.createElement('div');
                toast.className = `notyf ${type}`;
                
                const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-times-circle' : 'fa-info-circle');
                
                toast.innerHTML = `
                    <i class="fas ${icon} notyf-icon"></i>
                    <span>${msg}</span>
                `;
                
                container.appendChild(toast);
                
                setTimeout(() => {
                    toast.classList.add('notyf-out');
                    setTimeout(() => toast.remove(), 400);
                }, 3500);
            },
            success(msg) { this.show(msg, 'success'); },
            error(msg) { this.show(msg, 'error'); },
            info(msg) { this.show(msg, 'info'); }
        };

        // --- CUSTOM MODAL ---
        window.confirmAction = function(title, desc, onConfirm, confirmText = 'CONFIRMAR') {
            const modal = document.getElementById('custom-modal');
            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');
            
            document.querySelector('.modal-title').textContent = title;
            document.getElementById('modal-desc').textContent = desc;
            confirmBtn.textContent = confirmText;
            
            modal.style.display = 'flex';
            
            const close = () => modal.style.display = 'none';
            
            confirmBtn.onclick = () => { close(); onConfirm(); };
            cancelBtn.onclick = close;
        };

        // --- PRICE FORMATTING (Chilean Style) ---
        window.formatCLPInput = function(input) {
            let val = input.value.replace(/\D/g, ''); // Solo n├║meros
            if (val === '') {
                input.value = '';
                return;
            }
            input.value = parseInt(val).toLocaleString('es-CL');
        };

        // --- TAB SWITCHING ---
        window.switchTab = function(tab) {
            document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
            
            const targetView = document.getElementById('view-' + tab);
            const targetNav = document.getElementById('nav-' + tab);
            
            if (targetView) targetView.classList.add('active');
            if (targetNav) targetNav.classList.add('active');
            
            if (tab === 'dashboard') renderOrders();
            if (tab === 'content') renderAdminMenu();
            if (tab === 'reports') renderReports();
            
            // Auto-close sidebar and CLEAR BLUR on mobile after selection
            if (window.innerWidth <= 900) {
                document.getElementById('sidebar').classList.remove('open');
                const overlay = document.getElementById('sidebar-overlay');
                if (overlay) overlay.remove();
            }
        };

        // --- DASHBOARD: ORDERS ---
        async function renderOrders() {
            const container = document.getElementById('order-history');
            const incomingContainer = document.getElementById('incoming-orders-list');
            const incomingSection = document.getElementById('section-incoming');
            
            if (!container) return;
            let orders = await Store.getOrders();

            // Separate Incoming (Web) from Recent (Accepted/Manual)
            const incomingOrders = orders.filter(o => o.isNew === true);
            const activeOrders = orders.filter(o => o.isNew !== true);

            // Show/Hide Incoming Section
            if (incomingSection) {
                if (incomingOrders.length > 0) {
                    incomingSection.style.display = 'block';
                    renderIncomingOrdersList(incomingOrders, incomingContainer);
                } else {
                    incomingSection.style.display = 'none';
                }
            }

            // Special Sorting for Recent: "Entregada" orders go to the bottom
            activeOrders.sort((a, b) => {
                if (a.status === 'Entregada' && b.status !== 'Entregada') return 1;
                if (a.status !== 'Entregada' && b.status === 'Entregada') return -1;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            container.innerHTML = '';

            const countPending = document.getElementById('count-pending');
            const countOven = document.getElementById('count-oven');
            const countToday = document.getElementById('count-today');

            if (countPending) countPending.textContent = orders.filter(o => (o.status === 'Recibido' || o.status === 'Preparación') && o.isNew !== true).length;
            if (countOven) countOven.textContent = orders.filter(o => o.status === 'Al Horno').length;
            if (countToday) countToday.textContent = orders.filter(o => o.status !== 'Entregada').length;

            activeOrders.forEach(order => {
                const div = document.createElement('div');
                div.className = 'order-row';
                div.innerHTML = `
                    <div class="order-header">
                        <div class="order-meta">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                                <span style="font-family: var(--font-mono); font-size: 0.75rem;">
                                    ID: <span style="color:var(--it-green)">${order.orderNumber || 'S/N'}</span>
                                </span>
                                <span style="font-size:0.75rem; color:var(--muted)">[${Store.formatTime(order.timestamp)}]</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <span class="order-customer" style="margin-top:0">${order.customer}</span>
                                <span style="color:var(--it-white); font-weight:700; font-family:var(--font-mono); font-size:1.2rem;">$${(order.total || 0).toLocaleString()}</span>
                            </div>
                            <div style="color:rgba(255,255,255,0.7); margin-top: 5px; font-size: 0.9rem;">${order.details}</div>
                            ${order.notes ? `<div style="color:var(--it-green); margin-top: 5px; font-size: 0.8rem; font-family:var(--font-mono); border-left: 2px solid var(--it-green); padding-left: 8px;">📝 NOTAS: ${order.notes}</div>` : ''}
                            
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.8rem; font-family: var(--font-mono);">
                                <div title="Tipo de Entrega"><i class="fas fa-${order.type === 'Retiro' ? 'store' : 'truck'}"></i> ${order.type || 'N/A'}</div>
                                <div title="Medio de Pago" style="text-align:right"><i class="fas fa-credit-card"></i> ${order.payment || 'N/A'}</div>
                                ${order.address ? `<div style="grid-column: span 2; color: var(--muted);"><i class="fas fa-map-marker-alt"></i> ${order.address}</div>` : ''}
                            </div>
                        </div>
                        <span class="status-badge status-${order.status.replace(' ', '_')}">${order.status}</span>
                    </div>
                        <div class="status-footer" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap;">
                            <div class="status-buttons" style="flex: 1; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${statuses.map(s => `
                                    <button class="status-btn ${order.status === s ? 'active' : ''}" 
                                            data-id="${order.id}" data-status="${s}">${s}</button>
                                `).join('')}
                            </div>
                            
                            <div style="display:flex; gap:0.5rem;">
                                <button class="status-btn" style="border-color: #25D366; color: #25D366;" 
                                        onclick="window.shareTracking('${order.orderNumber}', '${order.customer}', '${order.customerWhatsapp || ''}')">
                                    <i class="fab fa-whatsapp"></i> COMPARTIR
                                </button>

                                ${order.status === 'En Despacho' || order.status === 'Entregada' ? `
                                    <button class="status-btn ${order.status === 'Entregada' ? 'active' : ''}" 
                                            style="${order.status === 'Entregada' ? 'background: #27ae60;' : 'border-color: #27ae60; color: #27ae60;'}"
                                            data-id="${order.id}" data-status="Entregada">
                                        <i class="fas fa-check-double"></i> ENTREGADA
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                `;
                container.appendChild(div);
            });

            // Re-bind ONLY buttons for status updates (those with data-status)
            container.querySelectorAll('.status-btn[data-status]').forEach(btn => {
                btn.onclick = async () => { await updateStatus(btn.dataset.id, btn.dataset.status); };
            });
        }

        async function updateStatus(id, newStatus) {
            try {
                await Store.updateOrderStatus(id, newStatus);
                Notify.success(`Pedido actualizado a: ${newStatus}`);
                renderOrders();
            } catch (err) {
                Notify.error("Error al actualizar el pedido.");
            }
        }

        function renderIncomingOrdersList(orders, container) {
            if (!container) return;
            container.innerHTML = '';
            
            orders.forEach(order => {
                const div = document.createElement('div');
                div.className = 'order-row';
                div.style.background = 'rgba(0, 140, 69, 0.05)';
                div.style.borderLeft = '4px solid var(--it-green)';
                div.innerHTML = `
                    <div class="order-header" style="flex-direction: row; align-items: center;">
                        <div class="order-meta" style="flex: 1;">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 0.3rem;">
                                <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--it-green); font-weight:700;">[ NUEVO PEDIDO WEB ]</span>
                                <span style="font-size:0.75rem; color:var(--muted)">${Store.formatTime(order.timestamp)}</span>
                            </div>
                            <span class="order-customer" style="font-size: 1.3rem;">${order.customer}</span>
                            <div style="color:var(--it-white); margin-top: 5px; font-size: 1rem; border-left: 2px solid var(--it-green); padding-left: 10px; background: rgba(0,0,0,0.2); padding: 0.5rem;">${order.details}</div>
                            ${order.notes ? `<div style="color:var(--it-green); font-size:0.85rem; margin-top:5px; font-family:var(--font-mono)">${String.fromCodePoint(0x1F4DD)} NOTAS: ${order.notes}</div>` : ''}
                            <div style="margin-top: 8px; font-weight:700; color:var(--it-white); font-family:var(--font-mono); font-size: 1.2rem;">TOTAL: $${(order.total || 0).toLocaleString()}</div>
                        </div>
                        <div style="margin-left: 2rem;">
                            <button class="admin-btn" style="margin:0; padding: 1rem 1.5rem; background: var(--it-green); border:none; box-shadow: 0 4px 15px rgba(0,140,69,0.3);" onclick="window.acceptOrder('${order.id}')">
                                <i class="fas fa-check"></i> ACEPTAR PEDIDO
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        }

        window.acceptOrder = async function(id) {
            try {
                // 1. Mark as not new using the Store method
                await Store.acceptOrder(id);
                
                // Get fresh data to get order details for WhatsApp
                const orders = await Store.getOrders();
                const order = orders.find(o => o.id === id);
                if (!order) return;

                Notify.success("Pedido aceptado exitosamente.");
                
                // 2. Offer WhatsApp Tracking Link
                const cleanPhone = (order.customerWhatsapp || '').replace(/\D/g, '');
                
                confirmAction(
                    `${String.fromCodePoint(0x1F4F2)} \u00bfENVIAR SEGUIMIENTO?`,
                    `\u00bfDeseas enviar el link de Radar de Seguimiento al cliente ${order.customer}?`,
                    async () => {
                        const settings = await Store.getSettings();
                        const storeName = (settings.store && settings.store.name) || "Only Pizza";
                        const trackingUrl = `https://only-pizza.github.io/OnlyPizza/tracking.html?track=${order.orderNumber}`;
                        const pizza = String.fromCodePoint(0x1F355);
                        const text = encodeURIComponent(`*\u00a1Hola ${order.customer}!* ${pizza} Tu pedido *${order.orderNumber}* en *${storeName}* ha sido aceptado.\n\n*Sigue tu pedido en vivo aqui:*\n${trackingUrl}`);
                        window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                    },
                    "ENVIAR WHATSAPP"
                );

                renderOrders();
            } catch (err) {
                console.error(err);
                Notify.error("Error al aceptar el pedido.");
            }
        };

        document.getElementById('order-form').addEventListener('submit', async e => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'REGISTRANDO...';

            try {
                const orderData = {
                    customer: document.getElementById('customer-name').value,
                    details: document.getElementById('order-details').value,
                    total: parseFloat(document.getElementById('order-total').value.replace(/\D/g, '')),
                    type: document.getElementById('order-type').value,
                    payment: document.getElementById('order-payment').value,
                    address: document.getElementById('customer-address').value || '',
                    customerWhatsapp: document.getElementById('customer-whatsapp').value
                };

                const savedOrder = await Store.addOrder({ ...orderData, isNew: false });
                Notify.success(`Pedido ${savedOrder.orderNumber} registrado.`);
                
                // WhatsApp Automation
                if (orderData.customerWhatsapp) {
                    const cleanPhone = orderData.customerWhatsapp.replace(/\D/g, '');
                    if (cleanPhone) {
                        confirmAction(
                            "­ƒô▓ ┬┐ENVIAR WHATSAPP?",
                            `┬┐Deseas enviar el link de seguimiento al cliente ${orderData.customer} por WhatsApp?`,
                            async () => {
                                const settings = await Store.getSettings();
                                const storeName = (settings.store && settings.store.name) || "Only Pizza";
                                const trackingUrl = `https://only-pizza.github.io/OnlyPizza/tracking.html?track=${savedOrder.orderNumber}`;
                                const text = encodeURIComponent(`*\u00a1Hola ${orderData.customer}!* Tu pedido *${savedOrder.orderNumber}* en *${storeName}* ha sido registrado.\n\n*Tipo:* ${orderData.type}\n*Total:* $${orderData.total.toLocaleString()} CLP\n\n*Sigue tu pedido aqui:*\n${trackingUrl}`);
                                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                            },
                            "ENVIAR WHATSAPP"
                        );
                    }
                }

                e.target.reset();
                document.getElementById('customer-whatsapp').value = '+56';
                toggleAddressField(); // Reset field visibility
                renderOrders();
            } catch (err) {
                Notify.error("Error al registrar el pedido.");
            } finally {
                btn.disabled = false;
                btn.textContent = 'REGISTRAR EN SISTEMA';
            }
        });

        // Toggle address field based on order type
        const typeSelect = document.getElementById('order-type');
        const addressGroup = document.getElementById('address-group');
        
        function toggleAddressField() {
            if (typeSelect.value === 'Retiro') {
                addressGroup.style.display = 'none';
                document.getElementById('customer-address').value = '';
            } else {
                addressGroup.style.display = 'block';
            }
        }
        
        typeSelect.addEventListener('change', toggleAddressField);
        // Run once on init
        toggleAddressField();

        // --- CONTENT: PIZZA EDITOR ---
        let currentPhotoFile = null;

        document.getElementById('pizza-photo').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            currentPhotoFile = file;

            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('photo-preview');
                preview.src = event.target.result;
                preview.style.display = 'block';
                document.getElementById('upload-label').style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        async function renderAdminMenu() {
            const container = document.getElementById('admin-menu-grid');
            const pizzas = await Store.getPizzas();
            
            if (pizzas.length === 0) {
                container.innerHTML = '<div style="color:var(--muted); padding:2rem; grid-column:1/-1; text-align:center;">// NO HAY PIZZAS EN EL MEN\u00da</div>';
                return;
            }

            container.innerHTML = pizzas.map(p => `
                <div class="admin-menu-item" onclick='openEditModal(${JSON.stringify(p).replace(/'/g, "&apos;")})'>
                    ${p.image ? `<img src="${p.image}" class="admin-menu-img" style="object-fit:cover;">` : `<div style="width:60px; height:60px; display:flex; align-items:center; justify-content:center; background:#111;">­ƒìò</div>`}
                    <div class="admin-menu-info">
                        <div style="font-weight:700; color:#fff">${p.name}</div>
                        <div style="color:var(--muted); font-size:0.6rem">$${(p.price || 0).toLocaleString()}</div>
                    </div>
                    <button class="delete-btn" data-id="${p.id}" data-name="${p.name}" onclick="event.stopPropagation()"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');

            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const name = btn.dataset.name;
                    confirmAction(
                        "ELIMINAR PIZZA", 
                        `\u00bfEst\u00e1s seguro de que quieres eliminar la pizza "${name}"? Esta acci\u00f3n ser\u00e1 inmediata.`,
                        async () => {
                            const success = await Store.deletePizza(id);
                            if (success) {
                                Notify.success("Pizza eliminada con \u00e9xito.");
                                renderAdminMenu();
                            } else {
                                Notify.error("Error al eliminar la pizza.");
                            }
                        },
                        "ELIMINAR PRODUCTO"
                    );
                };
            });
        }

        // --- EDIT PIZZA LOGIC ---
        let editPhotoFile = null;

        window.openEditModal = function(pizza) {
            const modal = document.getElementById('edit-pizza-modal');
            editPhotoFile = null;
            
            document.getElementById('edit-pizza-id').value = pizza.id;
            document.getElementById('edit-pizza-name').value = pizza.name;
            document.getElementById('edit-pizza-ingredients').value = (pizza.ingredients || []).join(', ');
            document.getElementById('edit-pizza-price').value = (pizza.price || 0).toLocaleString('es-CL');
            document.getElementById('edit-pizza-category').value = pizza.category || 'Cl├ísicas';
            
            const preview = document.getElementById('edit-photo-preview');
            const label = document.getElementById('edit-upload-label');
            
            if (pizza.image) {
                preview.src = pizza.image;
                preview.style.display = 'block';
                label.style.display = 'none';
            } else {
                preview.style.display = 'none';
                label.style.display = 'block';
            }
            
            modal.style.display = 'flex';
        };

        window.closeEditModal = function() {
            document.getElementById('edit-pizza-modal').style.display = 'none';
        };

        document.getElementById('edit-pizza-photo').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            editPhotoFile = file;

            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('edit-photo-preview');
                preview.src = event.target.result;
                preview.style.display = 'block';
                document.getElementById('edit-upload-label').style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('edit-pizza-form').addEventListener('submit', async e => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'ACTUALIZANDO...';

            const id = document.getElementById('edit-pizza-id').value;
            const data = {
                name: document.getElementById('edit-pizza-name').value.toUpperCase(),
                ingredients: document.getElementById('edit-pizza-ingredients').value.split(',').map(i => i.trim()),
                price: parseInt(document.getElementById('edit-pizza-price').value.replace(/\D/g, '')),
                category: document.getElementById('edit-pizza-category').value,
                image: document.getElementById('edit-photo-preview').src // Keep old if not changed
            };

            try {
                const success = await Store.updatePizza(id, data, editPhotoFile);
                if (success) {
                    Notify.success("Pizza actualizada con \u00e9xito.");
                    closeEditModal();
                    renderAdminMenu();
                } else {
                    Notify.error("Error al actualizar la pizza.");
                }
            } catch (err) {
                Notify.error("Error al guardar cambios.");
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });

        document.getElementById('pizza-form').addEventListener('submit', async e => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'SUBIENDO...';

            try {
                await Store.addPizza({
                    name: document.getElementById('pizza-name').value.toUpperCase(),
                    ingredients: document.getElementById('pizza-ingredients').value.split(',').map(i => i.trim()),
                    price: parseInt(document.getElementById('pizza-price').value.replace(/\D/g, '')),
                    category: document.getElementById('pizza-category').value
                }, currentPhotoFile);
                
                Notify.success("Pizza guardada en el men├║.");
                e.target.reset();
                currentPhotoFile = null;
                document.getElementById('photo-preview').style.display = 'none';
                document.getElementById('upload-label').style.display = 'block';
                renderAdminMenu();
            } catch (err) {
                Notify.error("Error al guardar la pizza.");
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });

        // --- AUTH ---
        window.handleLogin = async function() {
            const email = document.getElementById('login-user').value;
            const p = document.getElementById('login-pass').value;
            const btn = document.querySelector('.login-btn');
            const originalText = btn.textContent;
            
            btn.disabled = true;
            btn.textContent = 'AUTENTICANDO...';

            const success = await Store.auth.login(email, p);
            if (success) {
                Notify.success("Acceso concedido.");
            } else {
                Notify.error("Correo o contrase\u00f1a incorrectos.");
                document.getElementById('login-error').style.display = 'block';
                btn.disabled = false;
                btn.textContent = originalText;
            }
        };

        window.toggleSidebar = function() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
            
            // Add overlay if it doesn't exist
            let overlay = document.getElementById('sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1999; backdrop-filter:blur(4px);';
                overlay.onclick = toggleSidebar;
                document.body.appendChild(overlay);
            } else {
                overlay.remove();
            }
        }
;

        window.shareTracking = async function(orderNumber, customer, whatsapp) {
            const cleanPhone = whatsapp.replace(/\D/g, '');
            const settings = await Store.getSettings();
            const storeName = (settings.store && settings.store.name) || "Only Pizza";
            const trackingUrl = `https://only-pizza.github.io/OnlyPizza/tracking.html?track=${orderNumber}`;
            
            const pizza = String.fromCodePoint(0x1F355);
            const text = encodeURIComponent(`*\u00a1Hola ${customer}!* ${pizza} Tu pedido *${orderNumber}* en *${storeName}* ya est\u00e1 registrado.\n\n*Sigue tu pedido en vivo aqu\u00ed:*\n${trackingUrl}`);
            
            if (cleanPhone) {
                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
            } else {
                window.open(`https://wa.me/?text=${text}`, '_blank');
            }
        };

        // --- SIDEBAR IMPROVEMENTS ---
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.querySelector('.mobile-toggle');
            
            // Close if clicking outside and it's open
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });



        // --- OFFERS MANAGEMENT ---
        async function renderOffersAdmin() {
            const container = document.getElementById('offers-admin-grid');
            const offers = await Store.getOffers();
            const settings = await Store.getSettings();
            
            // Toggle visibility
            const toggle = document.getElementById('toggle-offers');
            toggle.checked = settings.landing?.offersEnabled !== false;

            container.innerHTML = offers.map((off, i) => `
                <div class="offer-edit-card" data-index="${i}" data-id="${off.id}">
                    <h4>TARJETA DE OFERTA #${i+1}</h4>
                    <div class="admin-form">
                        <div class="field-group">
                            <label>Descuento / Badge (Ej: 2X1, 30%, GRATIS)</label>
                            <input type="text" class="off-discount" value="${off.discount || ''}">
                        </div>
                        <div class="field-group">
                            <label>T├¡tulo de la Oferta</label>
                            <input type="text" class="off-title" value="${off.title || ''}">
                        </div>
                        <div class="field-group">
                            <label>Descripci├│n</label>
                            <textarea class="off-desc" style="height:60px">${off.desc || ''}</textarea>
                        </div>
                        <div class="field-group">
                            <label>Etiqueta de Validez (Ej: TODO EL MES, FINES DE SEMANA)</label>
                            <input type="text" class="off-tag" value="${off.tag || ''}">
                        </div>
                        <div style="display:flex; gap:1rem; align-items:center">
                            <label style="font-family:var(--font-mono); font-size:0.7rem; color:var(--muted)">DESESTACAR</label>
                            <input type="checkbox" class="off-featured" ${off.featured ? 'checked' : ''}>
                            <label style="font-family:var(--font-mono); font-size:0.7rem; color:var(--muted)">DESTACADA (GLOW)</label>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('save-offers-btn').addEventListener('click', async () => {
            const btn = document.getElementById('save-offers-btn');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'GUARDANDO...';

            try {
                // 1. Update Settings
                const offersEnabled = document.getElementById('toggle-offers').checked;
                await Store.updateSetting('landing', { offersEnabled });

                // 2. Update Offers
                const cards = document.querySelectorAll('.offer-edit-card');
                for (const card of cards) {
                    const id = card.dataset.id;
                    const data = {
                        discount: card.querySelector('.off-discount').value,
                        title: card.querySelector('.off-title').value,
                        desc: card.querySelector('.off-desc').value,
                        tag: card.querySelector('.off-tag').value,
                        featured: card.querySelector('.off-featured').checked,
                        // Maintain original layout properties
                        order: parseInt(card.dataset.index) + 1
                    };
                    await Store.updateOffer(id, data);
                }

                Notify.success("Ofertas y configuraci\u00f3n actualizadas.");
            } catch (err) {
                console.error(err);
                Notify.error("Error al guardar las ofertas.");
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });

        // --- REPORTS: ANALYTICS & CHARTS ---
        let salesChart = null;
        let rankingChart = null;

        async function renderReports() {
            const historyList = document.getElementById('daily-history-list');
            const revenueHistoric = document.getElementById('total-revenue-historic');
            const totalDaysElem = document.getElementById('total-days-closed');
            const summaryTable = document.getElementById('monthly-summary-table');
            
            if (!historyList) return;

            const history = await Store.getDailyHistory();
            historyList.innerHTML = '';
            
            if (history.length === 0) {
                historyList.innerHTML = '<div style="color:var(--muted); font-family:var(--font-mono); text-align:center; padding:2rem;">// NO HAY HISTORIAL DE CIERRES A\u00daN</div>';
                revenueHistoric.textContent = '$0';
                totalDaysElem.textContent = '0';
                return;
            }

            // 1. Process Data for Charts & Summary
            let totalRevenue = 0;
            const monthlyData = {}; // { "2026-03": revenue }
            const globalProductRanking = {}; // { "PEPPERONI": totalQty }
            
            history.forEach(day => {
                totalRevenue += (day.totalSales || 0);
                
                // History List (Daily)
                const div = document.createElement('div');
                div.className = 'order-row';
                div.style.borderLeft = '4px solid var(--it-green)';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="order-meta">
                            <span style="color:var(--it-green); font-size:1rem; font-weight:700;">CIERRE: ${Store.formatDate(day.date).split(',')[0]}</span>
                            <div style="color:var(--muted); font-size:0.7rem; margin-top:3px;">${day.orderCount} pedidos entregados</div>
                        </div>
                        <div style="font-size:1.4rem; color:var(--it-white); font-family:var(--font-display)">$${(day.totalSales || 0).toLocaleString()}</div>
                    </div>
                `;
                historyList.appendChild(div);

                // Monthly Aggregation
                const date = new Date(day.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (day.totalSales || 0);

                // Product Aggregation
                if (day.productRanking) {
                    Object.entries(day.productRanking).forEach(([name, qty]) => {
                        globalProductRanking[name] = (globalProductRanking[name] || 0) + qty;
                    });
                }
            });

            revenueHistoric.textContent = `$${totalRevenue.toLocaleString()}`;
            totalDaysElem.textContent = history.length;

            // 2. Render Monthly Summary Table
            const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            const sortedMonths = Object.keys(monthlyData).sort().reverse();
            
            summaryTable.innerHTML = sortedMonths.map(key => {
                const [year, month] = key.split('-');
                return `
                    <div style="display:flex; justify-content:space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05)">
                        <span style="color:var(--muted)">${monthNames[parseInt(month)-1]} ${year}</span>
                        <span style="color:var(--it-green); font-weight:700">$${monthlyData[key].toLocaleString()}</span>
                    </div>
                `;
            }).join('');

            // 3. Render Charts
            renderSalesChart(monthlyData);
            renderRankingChart(globalProductRanking);
        }

        function renderSalesChart(monthlyData) {
            const ctx = document.getElementById('chart-monthly-sales').getContext('2d');
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            
            const labels = Object.keys(monthlyData).sort();
            const values = labels.map(key => monthlyData[key]);
            const displayLabels = labels.map(key => {
                const [y, m] = key.split('-');
                return `${monthNames[parseInt(m)-1]} ${y.slice(-2)}`;
            });

            if (salesChart) salesChart.destroy();
            salesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: displayLabels,
                    datasets: [{
                        label: 'Ventas Mensuales',
                        data: values,
                        backgroundColor: 'rgba(0, 140, 69, 0.4)',
                        borderColor: '#008c45',
                        borderWidth: 2,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa', callback: v => '$' + v.toLocaleString() } },
                        x: { grid: { display: false }, ticks: { color: '#aaa' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        function renderRankingChart(ranking) {
            const ctx = document.getElementById('chart-product-ranking').getContext('2d');
            
            // Sort by sales quantity and take top 5
            const sortedItems = Object.entries(ranking)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            if (rankingChart) rankingChart.destroy();
            
            if (sortedItems.length === 0) {
                // No data yet
                return;
            }

            rankingChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: sortedItems.map(i => i[0]),
                    datasets: [{
                        data: sortedItems.map(i => i[1]),
                        backgroundColor: [
                            '#008c45', // Green
                            '#cd212a', // Red
                            '#f4f5f0', // White-ish
                            '#00592d', // Dark Green
                            '#8b151c'  // Dark Red
                        ],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#aaa', font: { family: 'Space Mono', size: 10 } }
                        }
                    }
                }
            });
        }

        // --- ACTION: CLOSE DAY ---
        const btnCloseDay = document.getElementById('btn-close-day');
        if (btnCloseDay) {
            btnCloseDay.onclick = () => {
                const deliveredCount = document.querySelectorAll('.status-badge.status-Entregada').length;
                if (deliveredCount === 0) {
                    Notify.info("No hay pedidos entregados para cerrar el d\u00eda.");
                    return;
                }

                confirmAction(
                    "\u00bfFINALIZAR D\u00cdA DE VENTAS?",
                    `Esto archivar\u00e1 los ${deliveredCount} pedidos entregados y generar\u00e1 un reporte de ventas. Esta acci\u00f3n no se puede deshacer.`,
                    async () => {
                        try {
                            const result = await Store.closeDaySales();
                            if (result.success) {
                                Notify.success(`D\u00eda cerrado: $${result.total.toLocaleString()} (${result.count} pedidos)`);
                                renderOrders();
                                renderReports();
                            } else {
                                Notify.info(result.message);
                            }
                        } catch (err) {
                            Notify.error("Error al cerrar el d\u00eda.");
                        }
                    },
                    "FINALIZAR D\u00cdA"
                );
            };
        }

        // --- SYSTEM: SETTINGS & STORE INFO ---
        async function renderSystemSettings() {
            const settings = await Store.getSettings();
            const store = settings.store || {};
            
            document.getElementById('set-store-name').value = store.name || '';
            document.getElementById('set-store-whatsapp').value = store.whatsapp || '';
            document.getElementById('set-store-address').value = store.address || '';
        }

        document.getElementById('btn-save-store').addEventListener('click', async () => {
            const btn = document.getElementById('btn-save-store');
            btn.disabled = true;
            
            const data = {
                name: document.getElementById('set-store-name').value.toUpperCase(),
                whatsapp: document.getElementById('set-store-whatsapp').value,
                address: document.getElementById('set-store-address').value.toUpperCase()
            };

            try {
                await Store.updateSetting('store', data);
                Notify.success("Datos del local actualizados.");
            } catch (err) {
                Notify.error("Error al guardar ajustes.");
            } finally {
                btn.disabled = false;
            }
        });

        document.getElementById('btn-save-pass').addEventListener('click', async () => {
            const newPass = document.getElementById('set-admin-pass').value;
            if (!newPass || newPass.length < 6) {
                Notify.error("La contrase\u00f1a debe tener al menos 6 caracteres.");
                return;
            }

            const btn = document.getElementById('btn-save-pass');
            btn.disabled = true;

            try {
                const { updatePassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
                await updatePassword(auth.currentUser, newPass);
                Notify.success("Contrase├▒a actualizada correctamente.");
                document.getElementById('set-admin-pass').value = '';
            } catch (err) {
                console.error(err);
                Notify.error("Error al actualizar contrase├▒a. Re-inicia sesi├│n e intenta de nuevo.");
            } finally {
                btn.disabled = false;
            }
        });

        // --- INITIALIZATION & AUTH STATE ---
        let activeOrdersListener = null;

        Store.auth.onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('login-overlay').style.display = 'none';
                
                // Real-time listen instead of single calls
                if (activeOrdersListener) activeOrdersListener(); // Unsubscribe if exists
                activeOrdersListener = Store.listenToActiveOrders((orders) => {
                    // Inject orders into a custom call or reuse renderOrders
                    // We need to modify renderOrders to accept data or just call it
                    renderOrders(); 
                });

                renderAdminMenu();
                renderOffersAdmin();
                renderReports();
                renderSystemSettings();
            } else {
                if (activeOrdersListener) activeOrdersListener();
                activeOrdersListener = null;
                document.getElementById('login-overlay').style.display = 'flex';
            }
        });
