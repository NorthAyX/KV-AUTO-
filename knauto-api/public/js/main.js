/* ========================================
   KNAUTO — Frontend connected to real API
   ======================================== */

(function () {
  'use strict';

  const API = '/api';
  let currentUser = null;
  let selectedCarForBuy = null;
  let authToken = localStorage.getItem('knauto_token') || null;

  // ---------- HELPERS ----------
  function formatPrice(n) {
    return new Intl.NumberFormat('fr-FR').format(n) + ' €';
  }

  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(() => el.classList.remove('show'), 2800);
  }

  async function api(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (authToken) opts.headers['Authorization'] = 'Bearer ' + authToken;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Erreur serveur');
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function showVerifyMessage(email, verifyUrl) {
    const box = document.createElement('div');
    box.className = 'verify-banner';
    box.innerHTML = `
      <div class="verify-banner-inner">
        <h3>Verifiez votre email</h3>
        <p>Un lien d'activation a ete envoye pour <strong>${email}</strong>.</p>
        <p class="verify-demo">Mode demo — cliquez pour activer :</p>
        <a href="${verifyUrl}" class="btn btn-primary" target="_blank">Activer mon compte</a>
        <button class="verify-close" type="button">Fermer</button>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('.verify-close').onclick = () => box.remove();
  }

  function requireAuth(callback) {
    if (!currentUser) {
      openModal('authModal');
      toast('Connectez-vous pour continuer', 'error');
      return;
    }
    callback();
  }

  // ---------- AUTH ----------
  async function loadSession() {
    if (!authToken) {
      currentUser = null;
      updateAuthUI();
      return;
    }
    try {
      currentUser = await api('GET', '/auth/me');
      updateAuthUI();
    } catch {
      authToken = null;
      localStorage.removeItem('knauto_token');
      currentUser = null;
      updateAuthUI();
    }
  }

  function updateAuthUI() {
    const btnLogin = document.getElementById('btnLogin');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const navPublish = document.getElementById('navPublish');
    const navAdmin = document.getElementById('navAdmin');
    const mobilePublish = document.getElementById('mobilePublish');
    const mobileAdmin = document.getElementById('mobileAdmin');
    const mobileLogin = document.getElementById('mobileLogin');

    if (currentUser) {
      btnLogin.style.display = 'none';
      userMenu.style.display = 'block';
      userName.textContent = currentUser.name.split(' ')[0];
      navPublish.style.display = 'inline';
      mobilePublish.style.display = 'block';
      if (currentUser.role === 'admin') {
        navAdmin.style.display = 'inline';
        mobileAdmin.style.display = 'block';
      } else {
        navAdmin.style.display = 'none';
        mobileAdmin.style.display = 'none';
      }
      if (mobileLogin) mobileLogin.style.display = 'none';
    } else {
      btnLogin.style.display = 'inline-flex';
      userMenu.style.display = 'none';
      navPublish.style.display = 'none';
      navAdmin.style.display = 'none';
      mobilePublish.style.display = 'none';
      mobileAdmin.style.display = 'none';
      if (mobileLogin) mobileLogin.style.display = 'inline-flex';
    }
  }

  // ---------- RENDER CARS ----------
  async function renderPublicCars() {
    try {
      const cars = await api('GET', '/cars');
      const featured = cars.slice(0, 3);
      const grid = document.getElementById('featuredGrid');
      const modelsGrid = document.getElementById('modelsGrid');
      const liveCount = document.getElementById('liveCarsCount');

      if (liveCount) liveCount.textContent = cars.length;

      if (grid) {
        grid.innerHTML = featured.map(c => `
          <article class="featured-card" data-id="${c.id}">
            <div class="card-image"><img src="${c.image}" alt="${c.name}" loading="lazy"></div>
            <div class="card-content">
              <span class="card-tag">${c.category}</span>
              <h3>${c.name}</h3>
              <p>${c.specs}</p>
              <div class="card-footer">
                <span class="price">${formatPrice(c.price)}</span>
                <button class="card-link buy-btn" data-id="${c.id}">Acheter / Essayer</button>
              </div>
            </div>
          </article>
        `).join('');
      }

      if (modelsGrid) {
        modelsGrid.innerHTML = cars.map(c => `
          <article class="model-card" data-category="${c.category}" data-id="${c.id}">
            <div class="model-img"><img src="${c.image}" alt="${c.name}" loading="lazy"></div>
            <div class="model-info">
              <h4>${c.name}</h4>
              <p class="model-specs">${c.specs}</p>
              <div class="model-bottom">
                <span class="model-price">${formatPrice(c.price)}</span>
                <button class="model-btn buy-btn" data-id="${c.id}">Acheter</button>
              </div>
            </div>
          </article>
        `).join('');
      }

      document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          try {
            const car = await api('GET', '/cars/' + id);
            requireAuth(() => {
              selectedCarForBuy = car;
              document.getElementById('buyCarName').textContent = car.name + ' — ' + formatPrice(car.price);
              if (currentUser) {
                document.getElementById('buyName').value = currentUser.name;
                document.getElementById('buyEmail').value = currentUser.email;
              }
              openModal('buyModal');
            });
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      console.error(err);
      toast('Impossible de charger les véhicules', 'error');
    }
  }

  // ---------- VIEWS ----------
  function showView(view) {
    document.getElementById('viewHome').style.display = view === 'home' ? 'block' : 'none';
    document.getElementById('viewUser').style.display = view === 'user' ? 'block' : 'none';
    document.getElementById('viewAdmin').style.display = view === 'admin' ? 'block' : 'none';
    document.getElementById('mainFooter').style.display = view === 'home' ? 'block' : 'none';
    window.scrollTo(0, 0);
    if (view === 'user') renderUserDashboard();
    if (view === 'admin') renderAdminDashboard();
  }

  // ---------- USER DASHBOARD ----------
  async function renderUserDashboard() {
    if (!currentUser) return;
    try {
      const allCars = await api('GET', '/cars');
      const cars = allCars.filter(c => c.ownerId === currentUser.id);
      const grid = document.getElementById('userCarsGrid');
      grid.innerHTML = cars.length ? cars.map(c => `
        <div class="dash-card">
          <img src="${c.image}" alt="${c.name}">
          <div class="dash-card-body">
            <h4>${c.name}</h4>
            <p>${formatPrice(c.price)} · ${c.category}</p>
            <div class="dash-card-actions">
              <button class="btn btn-danger btn-sm delete-my-car" data-id="${c.id}">Supprimer</button>
            </div>
          </div>
        </div>
      `).join('') : '<p style="color:var(--text-muted)">Vous n\'avez pas encore publié de véhicule.</p>';

      grid.querySelectorAll('.delete-my-car').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Supprimer cette annonce ?')) return;
          try {
            await api('DELETE', '/cars/' + btn.dataset.id);
            renderUserDashboard();
            renderPublicCars();
            toast('Annonce supprimée');
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      });

      const reqs = await api('GET', '/requests/me');
      const list = document.getElementById('userRequestsList');
      list.innerHTML = reqs.length ? reqs.map(r => `
        <div class="request-item">
          <strong>${r.carName}</strong> — ${r.type}<br>
          <small style="color:var(--text-muted)">${new Date(r.createdAt).toLocaleString('fr-FR')}</small>
        </div>
      `).join('') : '<p style="color:var(--text-muted)">Aucune demande pour le moment.</p>';
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ---------- ADMIN DASHBOARD ----------
  async function renderAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const [cars, users, stats] = await Promise.all([
        api('GET', '/cars'),
        api('GET', '/users'),
        api('GET', '/stats')
      ]);

      const tbody = document.querySelector('#adminCarsTable tbody');
      tbody.innerHTML = cars.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.category}</td>
          <td>${formatPrice(c.price)}</td>
          <td>${c.ownerName || '—'}</td>
          <td class="actions">
            <button class="btn btn-danger btn-sm admin-delete-car" data-id="${c.id}">Supprimer</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.admin-delete-car').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Supprimer définitivement ce véhicule ?')) return;
          try {
            await api('DELETE', '/cars/' + btn.dataset.id);
            renderAdminDashboard();
            renderPublicCars();
            toast('Véhicule supprimé');
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      });

      const utbody = document.querySelector('#adminUsersTable tbody');
      utbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td><span style="color:var(--periwinkle);font-weight:600">${u.role}</span></td>
          <td class="actions">
            ${u.role !== 'admin' ? `<button class="btn btn-danger btn-sm admin-delete-user" data-id="${u.id}">Supprimer</button>` : '—'}
          </td>
        </tr>
      `).join('');

      utbody.querySelectorAll('.admin-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Supprimer cet utilisateur ?')) return;
          try {
            await api('DELETE', '/users/' + btn.dataset.id);
            renderAdminDashboard();
            toast('Utilisateur supprimé');
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      });

      document.getElementById('statCars').textContent = stats.cars;
      document.getElementById('statUsers').textContent = stats.users;
      document.getElementById('statRequests').textContent = stats.requests;
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ---------- MODALS ----------
  function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
  }

  // ---------- INIT ----------
  document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader');
    setTimeout(() => loader.classList.add('hidden'), 2200);

    await loadSession();
    await renderPublicCars();

    // Stats counters
    document.querySelectorAll('.stat-number[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      let current = 0;
      const step = Math.ceil(target / 40);
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current;
      }, 40);
    });

    window.addEventListener('scroll', () => {
      document.getElementById('header').classList.toggle('scrolled', window.scrollY > 40);
    });

    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('mobileMenu').classList.toggle('open');
    });
    document.querySelectorAll('.mobile-link').forEach(l => {
      l.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open'));
    });

    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => closeModal(el.dataset.close));
    });

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm').classList.add('active');
      });
    });

    // Login
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      try {
        const data = await api('POST', '/auth/login', { email, password });
        authToken = data.token;
        localStorage.setItem('knauto_token', authToken);
        currentUser = data.user;
        updateAuthUI();
        closeModal('authModal');
        toast('Bienvenue ' + data.user.name.split(' ')[0] + ' !');
      } catch (err) {
        if (err.data && err.data.requiresVerification) {
          toast(err.message, 'error');
          try {
            const res = await api('POST', '/auth/resend-verification', { email });
            if (res.verifyUrl) showVerifyMessage(email, res.verifyUrl);
          } catch (_) {}
        } else {
          toast(err.message, 'error');
        }
      }
    });

    // Register
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      try {
        const data = await api('POST', '/auth/register', { name, email, password });
        closeModal('authModal');
        if (data.requiresVerification && data.verifyUrl) {
          toast('Compte cree — verification requise');
          showVerifyMessage(data.email || email, data.verifyUrl);
        } else if (data.token) {
          authToken = data.token;
          localStorage.setItem('knauto_token', authToken);
          currentUser = data.user;
          updateAuthUI();
          toast('Compte cree avec succes !');
        }
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    // Logout
    document.getElementById('linkLogout')?.addEventListener('click', (e) => {
      e.preventDefault();
      authToken = null;
      currentUser = null;
      localStorage.removeItem('knauto_token');
      updateAuthUI();
      showView('home');
      document.getElementById('userDropdown').classList.remove('open');
      toast('Déconnecté');
    });

    document.getElementById('userBtn')?.addEventListener('click', () => {
      document.getElementById('userDropdown').classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown')?.classList.remove('open');
      }
    });

    document.getElementById('btnLogin')?.addEventListener('click', () => openModal('authModal'));
    document.getElementById('mobileLogin')?.addEventListener('click', () => {
      document.getElementById('mobileMenu').classList.remove('open');
      openModal('authModal');
    });

    document.getElementById('linkDashboard')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('userDropdown').classList.remove('open');
      if (currentUser?.role === 'admin') showView('admin');
      else showView('user');
    });

    document.getElementById('navAdmin')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentUser?.role === 'admin') showView('admin');
    });
    document.getElementById('mobileAdmin')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('mobileMenu').classList.remove('open');
      if (currentUser?.role === 'admin') showView('admin');
    });

    document.getElementById('backToHome')?.addEventListener('click', () => showView('home'));
    document.getElementById('adminBackHome')?.addEventListener('click', () => showView('home'));
    document.getElementById('logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      showView('home');
    });

    // Publish
    const openPublish = () => requireAuth(() => openModal('publishModal'));
    document.getElementById('heroPublishBtn')?.addEventListener('click', openPublish);
    document.getElementById('ctaPublishBtn')?.addEventListener('click', openPublish);
    document.getElementById('navPublish')?.addEventListener('click', (e) => { e.preventDefault(); openPublish(); });
    document.getElementById('mobilePublish')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('mobileMenu').classList.remove('open');
      openPublish();
    });

    document.getElementById('publishForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('POST', '/cars', {
          name: document.getElementById('pubName').value.trim(),
          price: parseInt(document.getElementById('pubPrice').value, 10),
          category: document.getElementById('pubCategory').value,
          specs: document.getElementById('pubSpecs').value.trim(),
          image: document.getElementById('pubImage').value.trim(),
          desc: document.getElementById('pubDesc').value.trim()
        });
        closeModal('publishModal');
        document.getElementById('publishForm').reset();
        renderPublicCars();
        toast('Annonce publiée avec succès !');
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    document.getElementById('userPublishForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('POST', '/cars', {
          name: document.getElementById('upName').value.trim(),
          price: parseInt(document.getElementById('upPrice').value, 10),
          category: document.getElementById('upCategory').value,
          specs: document.getElementById('upSpecs').value.trim(),
          image: document.getElementById('upImage').value.trim(),
          desc: document.getElementById('upDesc').value.trim()
        });
        document.getElementById('userPublishForm').reset();
        renderUserDashboard();
        renderPublicCars();
        toast('Annonce publiée !');
        document.querySelectorAll('#viewUser .dash-link').forEach(l => l.classList.remove('active'));
        document.querySelector('#viewUser .dash-link[data-panel="userListings"]').classList.add('active');
        document.querySelectorAll('#viewUser .dash-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('userListings').classList.add('active');
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    document.getElementById('adminAddForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('POST', '/cars', {
          name: document.getElementById('adName').value.trim(),
          price: parseInt(document.getElementById('adPrice').value, 10),
          category: document.getElementById('adCategory').value,
          specs: document.getElementById('adSpecs').value.trim(),
          image: document.getElementById('adImage').value.trim(),
          desc: document.getElementById('adDesc').value.trim()
        });
        document.getElementById('adminAddForm').reset();
        renderAdminDashboard();
        renderPublicCars();
        toast('Véhicule ajouté');
        document.querySelectorAll('#viewAdmin .dash-link').forEach(l => l.classList.remove('active'));
        document.querySelector('#viewAdmin .dash-link[data-panel="adminCars"]').classList.add('active');
        document.querySelectorAll('#viewAdmin .dash-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('adminCars').classList.add('active');
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    document.getElementById('adminAddBtn')?.addEventListener('click', () => {
      document.querySelectorAll('#viewAdmin .dash-link').forEach(l => l.classList.remove('active'));
      document.querySelector('#viewAdmin .dash-link[data-panel="adminAdd"]').classList.add('active');
      document.querySelectorAll('#viewAdmin .dash-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('adminAdd').classList.add('active');
    });

    document.getElementById('buyForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedCarForBuy) return;
      try {
        await api('POST', '/requests', {
          carId: selectedCarForBuy.id,
          carName: selectedCarForBuy.name,
          type: document.getElementById('buyType').value,
          phone: document.getElementById('buyPhone').value.trim(),
          message: document.getElementById('buyMessage').value.trim()
        });
        closeModal('buyModal');
        document.getElementById('buyForm').reset();
        toast('Demande envoyée ! Un conseiller vous recontactera.');
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    document.querySelectorAll('.dash-link').forEach(link => {
      link.addEventListener('click', () => {
        const panel = link.dataset.panel;
        const view = link.closest('.dashboard-view');
        view.querySelectorAll('.dash-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        view.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panel)?.classList.add('active');
      });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.model-card').forEach(card => {
          if (filter === 'all' || card.dataset.category === filter) card.classList.remove('hidden');
          else card.classList.add('hidden');
        });
      });
    });
  });
})();
