(function(){
  const api = window.PRGAPI;

  // Clear legacy localStorage keys from the old local-only client
  try {
    const legacyKeys = ['gr_reviews', 'gr_games'];
    let cleared = false;
    legacyKeys.forEach(k => {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
        cleared = true;
      }
    });
    if (cleared) console.info('Cleared legacy localStorage keys:', legacyKeys.join(', '));
    console.info('API frontend active');
  } catch (e) {
    console.warn('Failed to clear legacy localStorage keys:', e && e.message);
  }

  let gamesCache = null;
  let currentUserCache = null;

  async function bootstrap() {
    
    try {
      currentUserCache = await api.getCurrentUser();
    } catch (error) {
      console.log('No authenticated user');
      currentUserCache = null;
    }
    await renderSiteBanner();
    await renderSideBanners();
  }

  async function renderSiteBanner() {
    const container = document.getElementById('site-banner-container');
    if (!container) return;
    try {
      const site = await api.getSite();
      if (site && site.bannerUrl) {
        const bannerEl = document.createElement('div');
        bannerEl.className = 'site-banner';
        bannerEl.style.backgroundImage = `url("${site.bannerUrl}")`;
        container.innerHTML = '';
        container.appendChild(bannerEl);
      } else {
        container.innerHTML = '';
      }
    } catch (err) {
      console.warn('Failed to load site banner', err && err.message);
      container.innerHTML = '';
    }
  }

  async function renderSideBanners() {
    try {
      const site = await api.getSite();
      
      // Left banner
      const leftContainer = document.querySelector('.left-border');
      if (leftContainer && site && site.leftBannerUrl) {
        leftContainer.style.backgroundImage = `url("${site.leftBannerUrl}")`;
      }
      
      // Right banner
      const rightContainer = document.querySelector('.right-border');
      if (rightContainer && site && site.rightBannerUrl) {
        rightContainer.style.backgroundImage = `url("${site.rightBannerUrl}")`;
      }
    } catch (err) {
      console.warn('Failed to load side banners', err && err.message);
    }
  }

  async function getCurrentUser() {
    if (currentUserCache) return currentUserCache;
    try {
      currentUserCache = await api.getCurrentUser();
      return currentUserCache;
    } catch (error) {
      currentUserCache = null;
      return null;
    }
  }

  async function signUp(email, password) {
    try {
      const user = await api.signUp(email, password);
      currentUserCache = user;
      return user;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async function logIn(email, password) {
    try {
      const user = await api.logIn(email, password);
      currentUserCache = user;
      return user;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async function logOut() {
    try {
      await api.logOut();
      currentUserCache = null;
      gamesCache = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async function listGames() {
    try {
      gamesCache = await api.listGames();
      return gamesCache;
    } catch (error) {
      console.error('Failed to load games:', error);
      return [];
    }
  }

  async function addGame(title, genre, imageFile, description) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Admin only');
    }
    try {
      const game = await api.addGame(title, genre, imageFile, description);
      gamesCache = null; // Clear cache
      return game;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async function deleteGame(gameId) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Admin only');
    }
    try {
      await api.deleteGame(gameId);
      gamesCache = null; // Clear cache
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  function readFileAsDataUrl(file) {
    return api.readFileAsDataUrl(file);
  }

  async function renderHeaderAuthState() {
    const authCta = document.querySelector('[data-auth-cta]');
    const user = await getCurrentUser();
    if (!authCta) return;
    if (user) {
      const isAdmin = user.role === 'admin';
      authCta.innerHTML = '' +
        '<span class="user-email">' + user.email + '</span>' +
        ' <a class="btn" href="account.html">Account</a>' +
        (isAdmin ? ' <a class="btn" href="admin.html">Admin</a>' : '') +
        ' <button type="button" class="btn" data-logout>Log out</button>';
      const btn = authCta.querySelector('[data-logout]');
      if (btn) btn.addEventListener('click', async function(){ 
        await logOut(); 
        location.reload(); 
      });
    } else {
      authCta.innerHTML = '<a class="btn" href="login.html">Log in</a> <a class="btn" href="signup.html">Sign up</a>';
    }
  }

  async function renderGamesGrid() {
    const grid = document.querySelector('[data-game-grid]');
    if (!grid) return;
    
    try {
      const games = await listGames();
      const user = await getCurrentUser();
      const isAdmin = !!user && user.role === 'admin';
      
      grid.innerHTML = games.map(function(g) {
        const safeTitle = g.title.replace(/</g, '&lt;');
        const safeGenre = g.genre.replace(/</g, '&lt;');
        const avg = g.avgRating || 0;
        const reviewCount = g.reviewCount || 0;
        const reviewText = reviewCount ? (avg.toFixed(1) + ' / 5 • ' + reviewCount + ' review' + (reviewCount>1?'s':'')) : 'No reviews yet';
        
        // Debug logging
        console.log('Game:', g.title, 'Image URL:', g.imageDataUrl);
        
        return (
          '<article class="game-card">' +
            '<a class="card-link" href="game.html?id=' + encodeURIComponent(g.id) + '">' +
              '<img src="' + g.imageDataUrl + '" alt="Cover for ' + safeTitle + '" onerror="console.error(\'Image failed to load:\', this.src)" onload="console.log(\'Image loaded:\', this.src)" />' +
            '</a>' +
            '<div class="card-body">' +
              '<h3 class="game-title"><a href="game.html?id=' + encodeURIComponent(g.id) + '">' + safeTitle + '</a></h3>' +
              '<p class="game-genre">' + safeGenre + '</p>' +
              '<div class="stars-row">' +
                '<span class="stars-static" style="--value:' + avg.toFixed(2) + '" aria-label="Average rating ' + avg.toFixed(1) + ' out of 5"></span>' +
                '<span class="muted small" style="margin-left:8px">' + reviewText + '</span>' +
              '</div>' +
              (isAdmin ? '<div class="form-actions" style="justify-content:flex-start;margin-top:10px">' +
                '<button type="button" class="btn danger small" data-delete-game data-id="' + g.id + '">Delete</button>' +
                    '</div>' : '') +
            '</div>' +
          '</article>'
        );
      }).join('');
    } catch (error) {
      grid.innerHTML = '<p>Failed to load games. Please check if the backend server is running.</p>';
      console.error('Error rendering games:', error);
    }
  }

  // Reviews API
  async function listReviews(gameId) {
    try {
      return await api.listReviews(gameId);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      return [];
    }
  }

  async function addReview(gameId, rating, text) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Log in to review');
    try {
      return await api.addReview(gameId, rating, text);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async function addReply(reviewId, text) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Log in to reply');
    try {
      return await api.addReply(reviewId, text);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  function canManageReview(user, review) {
    if (!user) return false;
    return user.role === 'admin' || review.userId === user.id;
  }

  function canManageReply(user, review, reply) {
    if (!user) return false;
    return user.role === 'admin' || reply.userId === user.id;
  }

  async function deleteReview(reviewId) {
    // Call the server to delete the review. Server will enforce auth/authorization.
    try {
      const user = await getCurrentUser();
      // Attempt delete on server; let server validate permissions
      await api.deleteReview(reviewId);
      // Store minimal last-deleted info for potential undo UI (best-effort)
      window.__GR_LAST_DELETED__ = { kind: 'review', payload: { id: reviewId, userId: user ? user.id : null } };
      return true;
    } catch (error) {
      // Propagate error message for the caller to handle
      throw new Error(error.message || 'Failed to delete review');
    }
  }

  async function deleteReply(reviewId, replyId) {
    // Delegate deletion to server which will enforce permissions
    try {
      const user = await getCurrentUser();
      await api.deleteReply(replyId);
      window.__GR_LAST_DELETED__ = { kind: 'reply', payload: { reviewId: reviewId, replyId: replyId, userId: user ? user.id : null } };
      return true;
    } catch (error) {
      throw new Error(error.message || 'Failed to delete reply');
    }
  }

  async function getGameById(id) {
    try {
      return await api.getGame(id);
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  function getQueryParam(name) {
    return api.getQueryParam(name);
  }

  async function renderGameDetail() {
    const container = document.querySelector('[data-game-detail]');
    if (!container) return;
    const gameId = getQueryParam('id');
    const game = await getGameById(gameId || '');
    if (!game) {
      container.innerHTML = '<p>Game not found.</p>';
      return;
    }
    
    const reviews = await listReviews(game.id);
    const avg = game.avgRating || 0;
    const avgText = reviews.length ? avg.toFixed(1) + ' / 5 (' + reviews.length + ' reviews)' : 'No reviews yet';
    const safeTitle = game.title.replace(/</g, '&lt;');
    const safeGenre = game.genre.replace(/</g, '&lt;');
    const safeDescription = (game.description || '').replace(/</g, '&lt;');

    container.innerHTML = '' +
      '<div class="game-detail-card">' +
        '<img src="' + game.imageDataUrl + '" alt="Cover for ' + safeTitle + '" />' +
        '<div class="detail-body">' +
          '<h1>' + safeTitle + '</h1>' +
          '<p class="muted">' + safeGenre + '</p>' +
          (safeDescription ? '<div class="game-description"><p>' + safeDescription + '</p></div>' : '') +
          '<p><span class="stars-static" style="--value:' + (reviews.length ? avg.toFixed(2) : 0) + '"></span> <strong style="margin-left:8px">' + avgText + '</strong></p>' +
        '</div>' +
      '</div>' +
      '<section class="auth-card" style="margin-top:16px">' +
        '<form class="auth-form" data-review-form>' +
          '<label><span>Rating</span></label>' +
          '<div class="star-rating" data-review-stars aria-label="Your rating">' +
            '<input type="radio" id="rev-5" name="rating" value="5" />' +
            '<label for="rev-5" title="5 stars">★</label>' +
            '<input type="radio" id="rev-4" name="rating" value="4" />' +
            '<label for="rev-4" title="4 stars">★</label>' +
            '<input type="radio" id="rev-3" name="rating" value="3" />' +
            '<label for="rev-3" title="3 stars">★</label>' +
            '<input type="radio" id="rev-2" name="rating" value="2" />' +
            '<label for="rev-2" title="2 stars">★</label>' +
            '<input type="radio" id="rev-1" name="rating" value="1" />' +
            '<label for="rev-1" title="1 star">★</label>' +
          '</div>' +
          '<label><span>Review</span><textarea name="text" rows="3" placeholder="Share your thoughts..."></textarea></label>' +
          '<div class="form-actions"><button type="submit" class="btn primary">Post review</button></div>' +
          '<div class="form-error" data-form-error style="display:none"></div>' +
        '</form>' +
      '</section>' +
      '<section class="review-list" data-review-list></section>';

    await renderReviewList(game.id);

    // Wire review form
    const reviewForm = document.querySelector('[data-review-form]');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async function(e){
        e.preventDefault();
        var checked = reviewForm.querySelector('input[name="rating"]:checked');
        const rating = checked ? checked.value : '5';
        const text = reviewForm.querySelector('[name="text"]').value;
        try {
          await addReview(game.id, rating, text);
          reviewForm.reset();
          await renderReviewList(game.id);
          await renderGameDetail(); // Refresh the whole page
        } catch (err) {
          const fe = reviewForm.querySelector('[data-form-error]');
          if (fe) { fe.style.display='block'; fe.textContent = err.message; }
        }
      });
    }
  }

  async function renderReviewList(gameId) {
    const list = document.querySelector('[data-review-list]');
    if (!list) return;
    
    try {
      const revs = await listReviews(gameId);
      const currentUser = await getCurrentUser();
      const isAdmin = !!currentUser && currentUser.role === 'admin';
      
      list.innerHTML = revs.map(function(r){
        const date = new Date(r.createdAt).toLocaleString();
        const safeText = (r.text || '').replace(/</g, '&lt;');
        const repliesHtml = (r.replies || []).map(function(rep){
          const rdate = new Date(rep.createdAt).toLocaleString();
          const rtext = (rep.text || '').replace(/</g, '&lt;');
          const canDelReply = isAdmin || (currentUser && currentUser.id === rep.userId);
          return '<div class="reply">' +
            '<div class="reply-meta">' + rep.userEmail + ' • ' + rdate + (canDelReply ? ' • <button type="button" class="link danger" data-del-reply data-review-id="' + r.id + '" data-reply-id="' + rep.id + '">Delete</button>' : '') + '</div>' +
            '<div class="reply-text">' + rtext + '</div>' +
          '</div>';
        }).join('');
        const canDelReview = isAdmin || (currentUser && currentUser.id === r.userId);
        return (
          '<article class="review-card">' +
            '<div class="review-meta">' + r.userEmail + ' • ' + date + ' • ' + 'Rating: ' + r.rating + '/5' + (canDelReview ? ' • <button type="button" class="link danger" data-del-review data-review-id="' + r.id + '">Delete</button>' : '') + '</div>' +
            '<div class="review-text">' + safeText + '</div>' +
            '<form class="reply-form" data-reply-form data-review-id="' + r.id + '">' +
              '<label><span class="visually-hidden">Reply</span><input type="text" name="text" placeholder="Write a reply..." /></label>' +
              '<div class="form-actions" style="justify-content:flex-start"><button type="submit" class="btn">Reply</button></div>' +
            '</form>' +
            '<div class="replies">' + repliesHtml + '</div>' +
          '</article>'
        );
      }).join('');

      // Wire reply forms
      list.querySelectorAll('[data-reply-form]').forEach(function(form){
        form.addEventListener('submit', async function(e){
          e.preventDefault();
          const rid = form.getAttribute('data-review-id');
          const text = form.querySelector('input[name="text"]').value;
          try {
            await addReply(rid, text);
            await renderReviewList(gameId);
          } catch (err) {
            alert(err.message || 'Failed to reply');
          }
        });
      });

      // Admin delete handlers
      list.querySelectorAll('[data-del-review]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          var id = btn.getAttribute('data-review-id');
          if (!confirm('Delete this review?')) return;
          try { 
            await deleteReview(id); 
            await renderReviewList(gameId);
            showUndo(async function(){
              // Undo restore - simplified for API version
              alert('Undo not implemented in API version');
              return false;
            });
          } catch(err) { alert(err.message||'Failed'); }
        });
      });
      list.querySelectorAll('[data-del-reply]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          var rid = btn.getAttribute('data-review-id');
          var repid = btn.getAttribute('data-reply-id');
          if (!confirm('Delete this reply?')) return;
          try { 
            await deleteReply(rid, repid); 
            await renderReviewList(gameId);
            showUndo(async function(){
              // Undo restore - simplified for API version
              alert('Undo not implemented in API version');
              return false;
            });
          } catch(err) { alert(err.message||'Failed'); }
        });
      });
    } catch (error) {
      list.innerHTML = '<p>Failed to load reviews. Please check if the backend server is running.</p>';
      console.error('Error rendering reviews:', error);
    }
  }

  function renderGameDetailHeaderOnly(gameId) {
    // Minimal recalc of average by re-calling renderGameDetail, but fast path skipped
    // Kept for potential optimization; currently re-render handled by renderGameDetail
  }

  // Account page
  async function renderAccount() {
    const root = document.querySelector('[data-account]');
    if (!root) return;
    const user = await getCurrentUser();
    if (!user) { window.location.href = 'login.html'; return; }
    
    try {
      const allReviews = await api.getUserReviews(user.id);
      const gamesById = {};
      const games = await listGames();
      games.forEach(g => { gamesById[g.id] = g; });
      
      root.innerHTML = '' +
        '<section class="auth-card">' +
          '<h2 style="margin:0 0 8px">Your account</h2>' +
          '<p class="muted small">' + user.email + ' • Role: ' + user.role + '</p>' +
          '<form class="auth-form" data-account-form style="margin-top:10px">' +
            '<div class="form-error" data-form-error style="display:none"></div>' +
            '<label><span>Change email</span><input type="email" name="email" placeholder="you@example.com" value="' + user.email.replace(/\"/g,'&quot;') + '" /></label>' +
            '<label><span>Current password</span><input type="password" name="current" placeholder="Required to change password" /></label>' +
            '<label><span>New password</span><input type="password" name="newpass" placeholder="Leave blank to keep" /></label>' +
            '<label><span>Confirm new password</span><input type="password" name="confirm" placeholder="Re-enter new password" /></label>' +
            '<div class="form-actions"><button type="submit" class="btn">Save changes</button></div>' +
            '<div class="muted small" data-form-notice></div>' +
          '</form>' +
        '</section>' +
        '<section class="review-list" style="margin-top:16px">' +
          '<h3 style="margin:0 0 8px">Games you rated</h3>' +
          (allReviews.length ? allReviews.map(function(r){
            var g = gamesById[r.gameId];
            var title = g ? g.title : 'Unknown game';
            var img = g ? g.imageDataUrl : '';
            return (
              '<article class="review-card">' +
                (img ? '<a href="game.html?id=' + encodeURIComponent(r.gameId) + '"><img src="' + img + '" alt="" style="width:180px;border-radius:10px;float:right;margin-left:10px"/></a>' : '') +
                '<div class="review-meta">' +
                  '<a href="game.html?id=' + encodeURIComponent(r.gameId) + '"><strong>' + title.replace(/</g,'&lt;') + '</strong></a>' +
                  ' • Rating: ' + r.rating + '/5' +
                '</div>' +
                '<div class="review-text">' + (r.text||'').replace(/</g,'&lt;') + '</div>' +
              '</article>'
            );
          }).join('') : '<p class="muted">No ratings yet.</p>') +
        '</section>';

      // Wire account form
      const accountForm = root.querySelector('[data-account-form]');
      if (accountForm) {
        accountForm.addEventListener('submit', async function(e){
          e.preventDefault();
          const email = accountForm.querySelector('input[name="email"]').value.trim();
          const current = accountForm.querySelector('input[name="current"]').value;
          const newpass = accountForm.querySelector('input[name="newpass"]').value;
          const confirm = accountForm.querySelector('input[name="confirm"]').value;
          const notice = accountForm.querySelector('[data-form-notice]');
          const errEl = accountForm.querySelector('[data-form-error]');
          function showErr(msg){ if (errEl){errEl.style.display='block'; errEl.textContent=msg;} }
          errEl && (errEl.style.display='none');
          notice && (notice.textContent='');
          if (newpass || confirm) {
            if (!current) { showErr('Enter your current password to change password'); return; }
            if (newpass !== confirm) { showErr('New passwords do not match'); return; }
          }
          try {
            await api.updateAccount(email, current, newpass);
            currentUserCache = null; // Clear cache
            await renderHeaderAuthState();
            await renderAccount();
            notice && (notice.textContent = 'Saved');
          } catch (err) {
            showErr(err.message || 'Failed to save');
          }
        });
      }
    } catch (error) {
      root.innerHTML = '<p>Failed to load account data. Please check if the backend server is running.</p>';
      console.error('Error rendering account:', error);
    }
  }

  function showUndo(undoFn) {
    let bar = document.querySelector('.snackbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'snackbar';
      bar.innerHTML = '<span class="snackbar-msg">Deleted.</span> <button type="button" class="btn ghost small" data-undo>Undo</button>';
      document.body.appendChild(bar);
    }
    bar.classList.add('show');
    const undoBtn = bar.querySelector('[data-undo]');
    let done = false;
    function hide(){ bar.classList.remove('show'); }
    const t = setTimeout(function(){ if (!done) hide(); }, 5000);
    undoBtn.onclick = function(){
      done = true;
      try { undoFn && undoFn(); } catch(_) {}
      clearTimeout(t);
      hide();
    };
  }

  function showFormError(formEl, message) {
    let el = formEl.querySelector('[data-form-error]');
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('data-form-error', '');
      el.className = 'form-error';
      formEl.prepend(el);
    }
    el.textContent = message;
  }

  function wireBannerUploader() {
    const uploadBtn = document.getElementById('upload-banner-btn');
    if (!uploadBtn) return;
    uploadBtn.addEventListener('click', async function(){
      const form = document.getElementById('site-banner-form');
      if (!form) return;
      const input = form.querySelector('input[name="banner"]');
      if (!input || !input.files || !input.files[0]) { alert('Choose an image first'); return; }
      const file = input.files[0];
      try {
        await api.uploadBanner(file);
        form.reset();
        alert('Site banner uploaded!');
        await renderSiteBanner();
      } catch (err) {
        alert(err.message || 'Failed to upload banner');
      }
    });
  }

  function wireLeftBannerUploader() {
    const uploadBtn = document.getElementById('upload-left-banner-btn');
    if (!uploadBtn) return;
    uploadBtn.addEventListener('click', async function(){
      const form = document.getElementById('left-banner-form');
      if (!form) return;
      const input = form.querySelector('input[name="banner"]');
      if (!input || !input.files || !input.files[0]) { alert('Choose an image first'); return; }
      const file = input.files[0];
      try {
        await api.uploadLeftBanner(file);
        form.reset();
        alert('Left banner uploaded!');
        await renderSideBanners();
      } catch (err) {
        alert(err.message || 'Failed to upload banner');
      }
    });
  }

  function wireRightBannerUploader() {
    const uploadBtn = document.getElementById('upload-right-banner-btn');
    if (!uploadBtn) return;
    uploadBtn.addEventListener('click', async function(){
      const form = document.getElementById('right-banner-form');
      if (!form) return;
      const input = form.querySelector('input[name="banner"]');
      if (!input || !input.files || !input.files[0]) { alert('Choose an image first'); return; }
      const file = input.files[0];
      try {
        await api.uploadRightBanner(file);
        form.reset();
        alert('Right banner uploaded!');
        await renderSideBanners();
      } catch (err) {
        alert(err.message || 'Failed to upload banner');
      }
    });
  }

  // Page boot
  document.addEventListener('DOMContentLoaded', async function(){
    // play entrance animation
    document.body.classList.add('page-enter');
    // allow the browser a frame then trigger the active class for transition
    requestAnimationFrame(function(){
      document.body.classList.add('page-enter-active');
      document.body.classList.remove('page-enter');
    });

    await bootstrap();
    await renderHeaderAuthState();
    await renderGamesGrid();
    await renderGameDetail();
    await renderAccount();

    // Wire login form
    const loginForm = document.querySelector('[data-login-form]');
    if (loginForm) {
      loginForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const email = loginForm.querySelector('input[name="email"]').value.trim();
        const password = loginForm.querySelector('input[name="password"]').value;
        try {
          await logIn(email, password);
          window.location.href = 'index.html';
        } catch (err) {
          showFormError(loginForm, err.message);
        }
      });
    }

    // Wire signup form
    const signupForm = document.querySelector('[data-signup-form]');
    if (signupForm) {
      signupForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const email = signupForm.querySelector('input[name="email"]').value.trim();
        const password = signupForm.querySelector('input[name="password"]').value;
        const confirm = signupForm.querySelector('input[name="confirm"]').value;
        if (password !== confirm) {
          showFormError(signupForm, 'Passwords do not match');
          return;
        }
        try {
          await signUp(email, password);
          window.location.href = 'index.html';
        } catch (err) {
          showFormError(signupForm, err.message);
        }
      });
    }

    // Wire admin add-game form
    const addGameForm = document.querySelector('[data-add-game-form]');
    if (addGameForm) {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
      }
      addGameForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const title = addGameForm.querySelector('input[name="title"]').value.trim();
        const genre = addGameForm.querySelector('input[name="genre"]').value.trim();
        const fileInput = addGameForm.querySelector('input[name="image"]');
        let imageFile = null;
        if (fileInput.files && fileInput.files[0]) {
          imageFile = fileInput.files[0];
        }
        try {
          const description = addGameForm.querySelector('textarea[name="description"]').value.trim();
          await addGame(title, genre, imageFile, description);
          addGameForm.reset();
          const notice = addGameForm.querySelector('[data-form-notice]');
          if (notice) { notice.textContent = 'Game added!'; setTimeout(function(){ notice.textContent=''; }, 2000); }
          await renderGamesGrid();
        } catch (err) {
          showFormError(addGameForm, err.message);
        }
      });
    }

    // Wire delete buttons via event delegation
    document.body.addEventListener('click', async function(e){
      const btn = e.target && e.target.closest('[data-delete-game]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Delete this game?')) return;
      try {
        await deleteGame(id);
        await renderGamesGrid();
      } catch (err) {
        alert(err.message || 'Failed to delete');
      }
    });

    wireBannerUploader();
    wireLeftBannerUploader();
    wireRightBannerUploader();

    // Animated navigation for game cards: play exit animation, then navigate
    document.body.addEventListener('click', function(e){
      const a = e.target && e.target.closest('.card-link');
      if (!a) return;
      // If it's an anchor to a page we control, animate then navigate
      const href = a.getAttribute('href');
      if (!href || href.indexOf('http') === 0) return; // let external links behave normally
      e.preventDefault();
      // Add small scale effect to the clicked card image
      a.classList.add('animating');
      // Trigger exit animation on body
      document.body.classList.remove('page-enter-active');
      document.body.classList.add('page-exit-active');
      setTimeout(function(){ window.location.href = href; }, 320);
    });
  });

  // Expose minimal API for debugging (optional)
  window.PRG = {
    listGames,
    addGame,
    deleteGame,
    listReviews,
    addReview,
    addReply,
    deleteReview,
    deleteReply,
    getCurrentUser,
    logOut
  };
})();

