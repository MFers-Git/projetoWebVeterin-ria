// script.js
(function () {
  'use strict';

  function qs(sel, ctx = document) { return ctx.querySelector(sel); }
  function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function normalizeCPF(str) { return (str || '').toString().replace(/\D/g, ''); }


  async function sha256Hex(message) {
    try {
      const enc = new TextEncoder();
      const msgUint8 = enc.encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      // chamada para base64 se não aceito
      try { return btoa(message); } catch (_) { return message; }
    }
  }

  //armazenamento local
  function getClientes() {
    try { return JSON.parse(localStorage.getItem('clientes') || '[]'); }
    catch (e) { console.error('Erro parse clientes', e); return []; }
  }
  function saveClientes(list) {
    try { localStorage.setItem('clientes', JSON.stringify(list)); }
    catch (e) { console.error('Erro salvar clientes', e); }
  }
  function getLoggedClient() {
    try { return JSON.parse(localStorage.getItem('loggedClient') || 'null'); }
    catch (e) { console.error('Erro parse loggedClient', e); return null; }
  }
  function setLoggedClient(obj) {
    try {
      if (obj === null) localStorage.removeItem('loggedClient');
      else localStorage.setItem('loggedClient', JSON.stringify(obj));
    } catch (e) { console.error('Erro setLoggedClient', e); }
  }
  function getCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
    catch (e) { console.error('Erro parse cart', e); return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem('cart', JSON.stringify(cart)); }
    catch (e) { console.error('Erro salvar carrinho', e); }
  }

  // --- shearch ---
  function initSearch() {
    try {
      const input = qs('#search-input');
      const btn = qs('#search-button');
      const products = qsa('.product-card');

      if (!input || !btn || !products.length) {
        console.log('Busca: elementos não encontrados, pulando inicialização.');
        return;
      }

      function doSearch() {
        const q = input.value.trim().toLowerCase();
        let shown = 0;
        products.forEach(card => {
          const titleEl = qs('.product-title', card);
          const title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
          if (!q || title.includes(q)) {
            card.style.display = '';
            shown++;
          } else card.style.display = 'none';
        });
        // mostrar mensagem "no-products" se nenhum for mostrado
        let nodiv = qs('.no-products');
        if (shown === 0) {
          if (!nodiv) {
            nodiv = document.createElement('div');
            nodiv.className = 'no-products';
            nodiv.textContent = 'Nenhum produto encontrado.';
            const grid = qs('.products-grid');
            if (grid) grid.appendChild(nodiv);
          }
        } else {
          if (nodiv) nodiv.remove();
        }
      }

      btn.addEventListener('click', doSearch);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
      console.log('Busca inicializada.');
    } catch (e) { console.error('Erro initSearch', e); }
  }

  // --- Avaliações (estrelas, envioe persistência dos dados) ---
  function initReviews() {
    try {
      const stars = qsa('#rating-stars i');
      const ratingInput = qs('#rating');
      const reviewForm = qs('#review-form');
      const reviewsContainer = qs('.reviews-container');

      if (!stars.length || !ratingInput || !reviewForm) {
        console.log('Avaliações: elementos não encontrados, pulando.');
        return;
      }

      // definir visual com base no valor
      function renderStarsUI(value) {
        stars.forEach((s, idx) => {
          if (idx < value) {
            s.classList.remove('far'); s.classList.add('fas', 'active');
          } else {
            s.classList.remove('fas', 'active'); s.classList.add('far');
          }
        });
      }

      stars.forEach(star => {
        star.addEventListener('click', () => {
          const v = parseInt(star.getAttribute('data-value'), 10) || 0;
          ratingInput.value = v;
          renderStarsUI(v);
        });
        star.addEventListener('mouseover', () => {
          const v = parseInt(star.getAttribute('data-value'), 10) || 0;
          renderStarsUI(v);
        });
        star.addEventListener('mouseout', () => {
          const current = parseInt(ratingInput.value, 10) || 0;
          renderStarsUI(current);
        });
      });

      function renderStarsStatic(n) {
        let out = '';
        for (let i = 0; i < n; i++) out += '<i class="fas fa-star"></i>';
        for (let i = n; i < 5; i++) out += '<i class="far fa-star"></i>';
        return out;
      }

      function loadSavedReviews() {
        const saved = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
        if (!reviewsContainer) return;
        qsa('.avaliacao-item[data-dyn="1"]').forEach(el => el.remove());
        saved.slice().reverse().forEach(r => {
          const div = document.createElement('div');
          div.className = 'avaliacao-item'; div.setAttribute('data-dyn', '1');
          div.innerHTML = `
            <div class="review-header">
              <span class="reviewer-name">${escapeHtml(r.name)}</span>
              <div class="review-rating">${renderStarsStatic(r.rating)}</div>
            </div>
            <p>${escapeHtml(r.comment)}</p>
          `;
          if (reviewsContainer.firstChild) reviewsContainer.insertBefore(div, reviewsContainer.firstChild);
          else reviewsContainer.appendChild(div);
        });
      }

      reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (qs('#name') && qs('#name').value.trim()) || '';
        const rating = parseInt(ratingInput.value, 10) || 0;
        const comment = (qs('#comment') && qs('#comment').value.trim()) || '';
        if (!name || !comment || rating === 0) {
          alert('Por favor, preencha nome, comentário e selecione a nota (clique nas estrelas).');
          return;
        }
        const div = document.createElement('div');
        div.className = 'avaliacao-item'; div.setAttribute('data-dyn', '1');
        div.innerHTML = `
          <div class="review-header">
            <span class="reviewer-name">${escapeHtml(name)}</span>
            <div class="review-rating">${renderStarsStatic(rating)}</div>
          </div>
          <p>${escapeHtml(comment)}</p>
        `;
        const reviewsContainerEl = qs('.reviews-container');
        if (reviewsContainerEl) reviewsContainerEl.insertBefore(div, reviewsContainerEl.firstChild);

        const saved = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
        saved.push({ name, rating, comment, date: new Date().toISOString() });
        localStorage.setItem('avaliacoes', JSON.stringify(saved));

        reviewForm.reset();
        ratingInput.value = 0;
        renderStarsUI(0);
      });

      loadSavedReviews();
      console.log('Avaliações inicializadas.');
    } catch (e) { console.error('Erro initReviews', e); }
  }

  // --- Sidebar / Área do Cliente ---
  function initSidebar() {
    try {
      const userIcon = qs('#user-icon');
      const sidebar = qs('#user-sidebar');
      const sidebarOverlay = qs('#sidebar-overlay');
      const closeSidebarBtn = qs('#close-sidebar');
      const sidebarForm = qs('#sidebar-form'); // register
      const sidebarLoginForm = qs('#sidebar-login-form');
      const sidebarList = qs('#sidebar-clientes-list');
      const loginSection = qs('#login-section');
      const registerSection = qs('#register-section');
      const clientDashboard = qs('#client-dashboard');
      const clientNameDisplay = qs('#client-name-display');
      const clientCpfDisplay = qs('#client-cpf-display');
      const clientEndDisplay = qs('#client-end-display');
      const clientLogoutBtn = qs('#client-logout');

      if (!sidebar) { console.log('Sidebar não encontrada, pulando initSidebar.'); return; }

      function openSidebar() { sidebar.classList.add('open'); if (sidebarOverlay) sidebarOverlay.classList.add('active'); renderSidebarView(); }
      function closeSidebar() { sidebar.classList.remove('open'); if (sidebarOverlay) sidebarOverlay.classList.remove('active'); }

      if (userIcon) userIcon.addEventListener('click', (e) => { e.preventDefault(); openSidebar(); });
      if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
      if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

      //register/login
      const showRegister = qs('#show-register');
      const showLogin = qs('#show-login');
      if (showRegister) showRegister.addEventListener('click', (e) => { e.preventDefault(); if (loginSection) loginSection.style.display = 'none'; if (registerSection) registerSection.style.display = 'block'; });
      if (showLogin) showLogin.addEventListener('click', (e) => { e.preventDefault(); if (registerSection) registerSection.style.display = 'none'; if (loginSection) loginSection.style.display = 'block'; });

      async function tryLoginByCpfAndPassword(cpfRaw, passwordRaw) {
        const cpf = normalizeCPF(cpfRaw);
        if (!cpf) return { ok: false, msg: 'CPF inválido' };
        const clientes = getClientes();
        const found = clientes.find(c => normalizeCPF(c.cpf) === cpf);
        if (!found) return { ok: false, msg: 'Cliente não encontrado' };
        const hashedInput = await sha256Hex(passwordRaw);
        if (found.password === hashedInput || found.password === btoa(passwordRaw)) {
          return { ok: true, client: found };
        }
        return { ok: false, msg: 'Senha incorreta' };
      }

      if (sidebarLoginForm) {
        sidebarLoginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const cpf = (qs('#login-cpf') && qs('#login-cpf').value.trim()) || '';
          const pass = (qs('#login-password') && qs('#login-password').value) || '';
          if (!cpf || !pass) { alert('Informe CPF e senha.'); return; }
          const res = await tryLoginByCpfAndPassword(cpf, pass);
          if (res.ok) {
            setLoggedClient(res.client);
            renderSidebarView();
            alert('Login bem-sucedido.');
          } else {
            alert(res.msg || 'Erro ao tentar logar');
          }
        });
      }

      if (sidebarForm) {
        sidebarForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const nome = (qs('#sid-nome') && qs('#sid-nome').value.trim()) || '';
          const cpf = (qs('#sid-cpf') && qs('#sid-cpf').value.trim()) || '';
          const endereco = (qs('#sid-endereco') && qs('#sid-endereco').value.trim()) || '';
          const senha = (qs('#sid-password') && qs('#sid-password').value) || '';
          if (!nome || !cpf || !endereco || !senha) { alert('Preencha todos os campos.'); return; }
          const clientes = getClientes();
          const cpfNorm = normalizeCPF(cpf);
          if (clientes.find(c => normalizeCPF(c.cpf) === cpfNorm)) { alert('Já existe cliente com esse CPF. Faça login.'); return; }
          const hashed = await sha256Hex(senha);
          const novo = { nome, cpf, endereco, password: hashed, created: new Date().toISOString() };
          clientes.push(novo);
          saveClientes(clientes);
          setLoggedClient(novo);
          if (sidebarForm) sidebarForm.reset();
          renderSidebarView();
          alert('Cadastro realizado com sucesso e logado.');
        });
      }

      if (clientLogoutBtn) clientLogoutBtn.addEventListener('click', () => { setLoggedClient(null); renderSidebarView(); });

      async function carregarClientesSidebar() {
        const clientes = getClientes();
        if (!sidebarList) return;
        sidebarList.innerHTML = '';
        if (!clientes.length) {
          sidebarList.innerHTML = '<p>Nenhum cliente cadastrado.</p>'; return;
        }
        clientes.forEach((c, idx) => {
          const item = document.createElement('div');
          item.className = 'cliente-item';
          item.innerHTML = `
            <div class="cliente-info"><strong>${escapeHtml(c.nome)}</strong><br>CPF: ${escapeHtml(c.cpf)}<br>${escapeHtml(c.endereco)}</div>
            <div><button class="btn-remove-cliente" data-index="${idx}" title="Remover">Remover</button></div>
          `;
          sidebarList.appendChild(item);
        });

        qsa('.btn-remove-cliente', sidebarList).forEach(btn => {
          btn.addEventListener('click', (ev) => {
            const idx = parseInt(btn.getAttribute('data-index'), 10);
            removerCliente(idx);
          });
        });
      }

      function removerCliente(index) {
        const clientes = getClientes();
        if (index < 0 || index >= clientes.length) return;
        const removed = clientes.splice(index, 1)[0];
        saveClientes(clientes);
        const logged = getLoggedClient();
        if (logged && normalizeCPF(logged.cpf) === normalizeCPF(removed.cpf)) setLoggedClient(null);
        carregarClientesSidebar();
        renderSidebarView();
      }

      function renderSidebarView() {
        const logged = getLoggedClient();
        if (logged) {
          if (loginSection) loginSection.style.display = 'none';
          if (registerSection) registerSection.style.display = 'none';
          if (clientDashboard) clientDashboard.style.display = 'block';
          if (clientNameDisplay) clientNameDisplay.textContent = logged.nome || '(sem nome)';
          if (clientCpfDisplay) clientCpfDisplay.textContent = logged.cpf || '';
          if (clientEndDisplay) clientEndDisplay.textContent = logged.endereco || '';
          carregarClientesSidebar();
        } else {
          if (clientDashboard) clientDashboard.style.display = 'none';
          if (registerSection) registerSection.style.display = 'none';
          if (loginSection) loginSection.style.display = 'block';
          if (sidebarList) sidebarList.innerHTML = '';
        }
      }

      // initial render
      renderSidebarView();
      console.log('Sidebar inicializada.');
    } catch (e) { console.error('Erro initSidebar', e); }
  }

  //Carrinho de Compras
  function initCart() {
    try {
      const cartIcon = qs('#cart-icon');
      const cartSidebar = qs('#cart-sidebar');
      const cartOverlay = qs('#cart-overlay');
      const closeCartBtn = qs('#close-cart-sidebar');
      const cartItemsContainer = qs('.cart-items', cartSidebar);
      const cartTotalEl = qs('#cart-total');
      const cartCountEl = qs('.cart-count');
      const addToCartButtons = qsa('.add-to-cart');
      const checkoutBtn = qs('.checkout-btn', cartSidebar);

      if (!cartIcon || !cartSidebar) { console.log('Elementos do carrinho não encontrados, pulando initCart.'); return; }

      function openCartSidebar() { cartSidebar.classList.add('open'); if (cartOverlay) cartOverlay.classList.add('active'); }
      function closeCartSidebar() { cartSidebar.classList.remove('open'); if (cartOverlay) cartOverlay.classList.remove('active'); }

      cartIcon.addEventListener('click', (e) => { e.preventDefault(); openCartSidebar(); });
      if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartSidebar);
      if (cartOverlay) cartOverlay.addEventListener('click', closeCartSidebar);

      function updateCartCount() {
        const cart = getCart();
        const count = cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
        if (cartCountEl) cartCountEl.textContent = count;
      }

      function updateCartTotal() {
        const cart = getCart();
        const total = cart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
        if (cartTotalEl) cartTotalEl.textContent = total.toFixed(2).replace('.', ',');
      }

      function renderCartItems() {
        const cart = getCart();
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
          cartItemsContainer.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
          return;
        }
        cart.forEach((item, index) => {
          const itemEl = document.createElement('div');
          itemEl.className = 'cart-item';
          itemEl.innerHTML = `
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
            <div class="cart-item-details">
              <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
              <p class="cart-item-price">R$ ${item.price.toFixed(2).replace('.', ',')}</p>
              <div class="cart-item-controls">
                <button class="cart-item-decrease" data-index="${index}">-</button>
                <span class="cart-item-quantity">${item.quantity || 1}</span>
                <button class="cart-item-increase" data-index="${index}">+</button>
                <button class="remove-item" data-index="${index}"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          `;
          cartItemsContainer.appendChild(itemEl);
        });

        qsa('.cart-item-decrease', cartItemsContainer).forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'), 10);
            decreaseItemQuantity(index);
          });
        });

        qsa('.cart-item-increase', cartItemsContainer).forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'), 10);
            increaseItemQuantity(index);
          });
        });

        qsa('.remove-item', cartItemsContainer).forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'), 10);
            removeItemFromCart(index);
          });
        });
      }

      function addToCart(product) {
        const cart = getCart();
        const existingItemIndex = cart.findIndex(item => item.id === product.id);

        if (existingItemIndex !== -1) {
          cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + 1;
        } else {
          cart.push({ ...product, quantity: 1 });
        }

        saveCart(cart);
        updateCartCount();
        renderCartItems();
        updateCartTotal();
      }

      function removeItemFromCart(index) {
        const cart = getCart();
        cart.splice(index, 1);
        saveCart(cart);
        updateCartCount();
        renderCartItems();
        updateCartTotal();
      }

      function increaseItemQuantity(index) {
        const cart = getCart();
        if (cart[index]) {
          cart[index].quantity = (cart[index].quantity || 1) + 1;
          saveCart(cart);
          renderCartItems();
          updateCartTotal();
        }
      }

      function decreaseItemQuantity(index) {
        const cart = getCart();
        if (cart[index]) {
          if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
          } else {
            cart.splice(index, 1);
          }
          saveCart(cart);
          updateCartCount();
          renderCartItems();
          updateCartTotal();
        }
      }
      addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
          const product = {
            id: button.getAttribute('data-id'),
            name: button.getAttribute('data-name'),
            price: parseFloat(button.getAttribute('data-price')),
            image: button.getAttribute('data-image')
          };
          addToCart(product);
          openCartSidebar();
        });
      });


      if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
          const cart = getCart();
          if (cart.length === 0) {
            alert('Seu carrinho está vazio!');
            return;
          }

          const loggedClient = getLoggedClient();
          if (!loggedClient) {
            alert('Por favor, faça login antes de finalizar a compra.');
            if (cartSidebar) cartSidebar.classList.remove('open');
            if (qs('#user-icon')) qs('#user-icon').click();
            return;
          }

          alert(`Compra finalizada com sucesso para ${loggedClient.nome}! Total: R$ ${getCart().reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0).toFixed(2).replace('.', ',')}`);
          saveCart([]);
          updateCartCount();
          renderCartItems();
          updateCartTotal();
          closeCartSidebar();
        });
      }

      // inicia render
      updateCartCount();
      renderCartItems();
      updateCartTotal();
      console.log('Carrinho inicializado.');
    } catch (e) { console.error('Erro initCart', e); }
  }

  //Carrossel
  function initCarousel() {
    try {
      const track = qs('#carouselTrack');
      const slides = qsa('.carousel-slide', track);
      const btnPrev = qs('#btnPrev');
      const btnNext = qs('#btnNext');
      const dotsContainer = qs('#carouselDots');
      const carousel = qs('#carousel');
      if (!track || slides.length === 0 || !dotsContainer) return;

      let index = 0;
      let timer = null;
      const AUTOPLAY_DELAY = 4500;
      const TRANSITION_MS = 600;

      // cria dots
      function createDots() {
        dotsContainer.innerHTML = '';
        slides.forEach((_, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('aria-label', `Ir para slide ${i + 1}`);
          btn.setAttribute('role', 'tab');
          btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
          btn.addEventListener('click', () => {
            goTo(i);
            restartAutoplay();
          });
          dotsContainer.appendChild(btn);
        });
      }

      function updateTrack() {
        const offset = -index * 100;
        track.style.transform = `translateX(${offset}%)`;
        const dots = qsa('button', dotsContainer);
        dots.forEach((d, i) => d.setAttribute('aria-selected', i === index ? 'true' : 'false'));
      }

      function goTo(i) {
        if (i < 0) i = slides.length - 1;
        if (i >= slides.length) i = 0;
        index = i;
        updateTrack();
      }

      function next() { goTo(index + 1); }
      function prev() { goTo(index - 1); }

      function startAutoplay() { stopAutoplay(); timer = setInterval(next, AUTOPLAY_DELAY); }
      function stopAutoplay() { if (timer) { clearInterval(timer); timer = null; } }
      function restartAutoplay() { stopAutoplay(); startAutoplay(); }

      btnNext && btnNext.addEventListener('click', () => { next(); restartAutoplay(); });
      btnPrev && btnPrev.addEventListener('click', () => { prev(); restartAutoplay(); });

      if (carousel) {
        carousel.addEventListener('mouseover', stopAutoplay);
        carousel.addEventListener('mouseout', startAutoplay);
        carousel.addEventListener('focusin', stopAutoplay);
        carousel.addEventListener('focusout', startAutoplay);
      }

      // swipe support
      let touchStartX = 0;
      let touchEndX = 0;
      track.addEventListener('touchstart', (e) => { stopAutoplay(); touchStartX = e.changedTouches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        const dx = touchEndX - touchStartX;
        const threshold = 40;
        if (dx > threshold) prev();
        else if (dx < -threshold) next();
        restartAutoplay();
      });

      // keyboard arrows
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowLeft') { prev(); restartAutoplay(); }
        if (ev.key === 'ArrowRight') { next(); restartAutoplay(); }
      });

      // init
      createDots();
      track.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(.22,.9,.28,1)`;
      updateTrack();
      startAutoplay();
    } catch (e) { console.error('Erro initHorizontalCarousel', e); }
  }

  //Initialize
  function initAll() {
    try {
      console.log('Inicializando aplicação...');
      initSearch();
      initReviews();
      initSidebar();
      initCart();
      initCarousel();
      console.log('Aplicação inicializada.');
    } catch (e) { console.error('Erro na inicialização geral', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    setTimeout(initAll, 100);
  }

})();