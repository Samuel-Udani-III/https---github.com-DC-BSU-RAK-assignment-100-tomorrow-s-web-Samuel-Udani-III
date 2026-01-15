// Simple client-side data layer using localStorage
// Users schema: { id, email, passwordHash, role: 'user' | 'admin', createdAt }
// Session schema: { userId }
// Games schema: { id, title, genre, imageDataUrl, description }

(function(){
  const STORAGE_KEYS = {
    USERS: 'gr_users',
    SESSION: 'gr_session',
    GAMES: 'gr_games',
    REVIEWS: 'gr_reviews'
  };

  function getItem(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (fallback ?? null);
    } catch (_) {
      return fallback ?? null;
    }
  }

  function setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // Very light hash substitute for demo only (NOT secure)
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  }

  function bootstrap() {
    const users = getItem(STORAGE_KEYS.USERS, []);
    const games = getItem(STORAGE_KEYS.GAMES, null);
    const reviews = getItem(STORAGE_KEYS.REVIEWS, null);
    if (!users.find(u => u.role === 'admin')) {
      users.push({ id: uid(), email: 'admin@example.com', passwordHash: hash('admin123'), role: 'admin', createdAt: Date.now() });
      setItem(STORAGE_KEYS.USERS, users);
    }
    if (!Array.isArray(games)) {
      setItem(STORAGE_KEYS.GAMES, []);
    }
    if (!Array.isArray(reviews)) {
      setItem(STORAGE_KEYS.REVIEWS, []);
    }
  }

  function getCurrentUser() {
    const session = getItem(STORAGE_KEYS.SESSION, null);
    if (!session) return null;
    const users = getItem(STORAGE_KEYS.USERS, []);
    return users.find(u => u.id === session.userId) || null;
  }

  function signUp(email, password) {
    const users = getItem(STORAGE_KEYS.USERS, []);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already in use');
    }
    const user = { id: uid(), email, passwordHash: hash(password), role: 'user', createdAt: Date.now() };
    users.push(user);
    setItem(STORAGE_KEYS.USERS, users);
    setItem(STORAGE_KEYS.SESSION, { userId: user.id });
    return user;
  }

  function logIn(email, password) {
    const users = getItem(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== hash(password)) {
      throw new Error('Invalid credentials');
    }
    setItem(STORAGE_KEYS.SESSION, { userId: user.id });
    return user;
  }

  function logOut() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  function listGames() {
    return getItem(STORAGE_KEYS.GAMES, []);
  }

  function addGame(title, genre, imageDataUrl, description) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Admin only');
    }
    const games = listGames();
    const game = { id: uid(), title, genre, imageDataUrl, description: description || '' };
    games.unshift(game);
    setItem(STORAGE_KEYS.GAMES, games);
    return game;
  }

  function deleteGame(gameId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Admin only');
    }
    const games = listGames();
    const next = games.filter(function(g){ return g.id !== gameId; });
    setItem(STORAGE_KEYS.GAMES, next);
    return true;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderHeaderAuthState() {
    const authCta = document.querySelector('[data-auth-cta]');
    const user = getCurrentUser();
    if (!authCta) return;
    if (user) {
      const isAdmin = user.role === 'admin';
      authCta.innerHTML = '' +
        '<span class="user-email">' + user.email + '</span>' +
        ' <a class="btn" href="account.html">Account</a>' +
        (isAdmin ? ' <a class="btn" href="admin.html">Admin</a>' : '') +
        ' <button type="button" class="btn" data-logout>Log out</button>';
      const btn = authCta.querySelector('[data-logout]');
      if (btn) btn.addEventListener('click', function(){ logOut(); location.reload(); });
    } else {
      authCta.innerHTML = '<a class="btn" href="login.html">Log in</a> <a class="btn" href="signup.html">Sign up</a>';
    }
  }

  function renderGamesGrid() {
    const grid = document.querySelector('[data-game-grid]');
    if (!grid) return;
    const games = listGames();
    const user = getCurrentUser();
    const isAdmin = !!user && user.role === 'admin';
    grid.innerHTML = games.map(function(g) {
      const safeTitle = g.title.replace(/</g, '&lt;');
      const safeGenre = g.genre.replace(/</g, '&lt;');
      const name = g.id;
      // Average rating from reviews
      var revs = listReviews(g.id);
      var avg = revs.length ? (revs.reduce(function(a,r){ return a + (Number(r.rating)||0); }, 0) / revs.length) : 0;
      var reviewText = revs.length ? (avg.toFixed(1) + ' / 5 • ' + revs.length + ' review' + (revs.length>1?'s':'')) : 'No reviews yet';
      return (
        '<article class="game-card">' +
          '<a class="card-link" href="game.html?id=' + encodeURIComponent(g.id) + '">' +
            '<img src="' + g.imageDataUrl + '" alt="Cover for ' + safeTitle + '" />' +
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
  }

  // Reviews API
  function listReviews(gameId) {
    const all = getItem(STORAGE_KEYS.REVIEWS, []);
    return all.filter(function(r){ return r.gameId === gameId; }).sort(function(a,b){ return b.createdAt - a.createdAt; });
  }

  function addReview(gameId, rating, text) {
    const user = getCurrentUser();
    if (!user) throw new Error('Log in to review');
    const all = getItem(STORAGE_KEYS.REVIEWS, []);
    const review = {
      id: uid(),
      gameId: gameId,
      userId: user.id,
      userEmail: user.email,
      rating: Math.max(1, Math.min(5, Number(rating) || 0)),
      text: String(text || '').slice(0, 2000),
      createdAt: Date.now(),
      replies: []
    };
    all.push(review);
    setItem(STORAGE_KEYS.REVIEWS, all);
    return review;
  }

  function addReply(reviewId, text) {
    const user = getCurrentUser();
    if (!user) throw new Error('Log in to reply');
    const all = getItem(STORAGE_KEYS.REVIEWS, []);
    const idx = all.findIndex(function(r){ return r.id === reviewId; });
    if (idx === -1) throw new Error('Review not found');
    const reply = {
      id: uid(),
      userId: user.id,
      userEmail: user.email,
      text: String(text || '').slice(0, 2000),
      createdAt: Date.now()
    };
    all[idx].replies.push(reply);
    setItem(STORAGE_KEYS.REVIEWS, all);
    return reply;
  }

  function canManageReview(user, review) {
    if (!user) return false;
    return user.role === 'admin' || review.userId === user.id;
  }

  function canManageReply(user, review, reply) {
    if (!user) return false;
    return user.role === 'admin' || reply.userId === user.id;
  }

  function deleteReview(reviewId) {
    const user = getCurrentUser();
    const all = getItem(STORAGE_KEYS.REVIEWS, []);
    const review = all.find(function(r){ return r.id === reviewId; });
    if (!review) return false;
    if (!canManageReview(user, review)) throw new Error('Not allowed');
    const next = all.filter(function(r){ return r.id !== reviewId; });
    setItem(STORAGE_KEYS.REVIEWS, next);
    window.__GR_LAST_DELETED__ = { kind: 'review', payload: review };
    return true;
  }

  function deleteReply(reviewId, replyId) {
    const user = getCurrentUser();
    const all = getItem(STORAGE_KEYS.REVIEWS, []);
    const idx = all.findIndex(function(r){ return r.id === reviewId; });
    if (idx === -1) return false;
    const review = all[idx];
    const rep = (review.replies || []).find(function(x){ return x.id === replyId; });
    if (!rep) return false;
    if (!canManageReply(user, review, rep)) throw new Error('Not allowed');
    review.replies = (review.replies || []).filter(function(x){ return x.id !== replyId; });
    setItem(STORAGE_KEYS.REVIEWS, all);
    window.__GR_LAST_DELETED__ = { kind: 'reply', payload: { reviewId: reviewId, reply: rep } };
    return true;
  }

  function getGameById(id) {
    return listGames().find(function(g){ return g.id === id; }) || null;
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function renderGameDetail() {
    const container = document.querySelector('[data-game-detail]');
    if (!container) return;
    const gameId = getQueryParam('id');
    const game = getGameById(gameId || '');
    if (!game) {
      container.innerHTML = '<p>Game not found.</p>';
      return;
    }
    const reviews = listReviews(game.id);
    const avg = reviews.length ? (reviews.reduce(function(a,r){ return a + (Number(r.rating)||0); }, 0) / reviews.length) : 0;
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

    renderReviewList(game.id);

    // Wire review form
    const reviewForm = document.querySelector('[data-review-form]');
    if (reviewForm) {
      reviewForm.addEventListener('submit', function(e){
        e.preventDefault();
        var checked = reviewForm.querySelector('input[name="rating"]:checked');
        const rating = checked ? checked.value : '5';
        const text = reviewForm.querySelector('[name="text"]').value;
        try {
          addReview(game.id, rating, text);
          reviewForm.reset();
          renderReviewList(game.id);
          renderGameDetailHeaderOnly(game.id); // update average quickly
        } catch (err) {
          const fe = reviewForm.querySelector('[data-form-error]');
          if (fe) { fe.style.display='block'; fe.textContent = err.message; }
        }
      });
    }
  }

  function renderReviewList(gameId) {
    const list = document.querySelector('[data-review-list]');
    if (!list) return;
    const revs = listReviews(gameId);
    const currentUser = getCurrentUser();
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
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const rid = form.getAttribute('data-review-id');
        const text = form.querySelector('input[name="text"]').value;
        try {
          addReply(rid, text);
          renderReviewList(gameId);
        } catch (err) {
          alert(err.message || 'Failed to reply');
        }
      });
    });

    // Admin delete handlers
    list.querySelectorAll('[data-del-review]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-review-id');
        if (!confirm('Delete this review?')) return;
        try { 
          deleteReview(id); 
          renderReviewList(gameId);
          showUndo(function(){
            // Undo restore
            var last = window.__GR_LAST_DELETED__;
            if (!last || last.kind !== 'review') return false;
            const all = getItem(STORAGE_KEYS.REVIEWS, []);
            all.push(last.payload);
            setItem(STORAGE_KEYS.REVIEWS, all);
            renderReviewList(gameId);
            return true;
          });
        } catch(err) { alert(err.message||'Failed'); }
      });
    });
    list.querySelectorAll('[data-del-reply]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var rid = btn.getAttribute('data-review-id');
        var repid = btn.getAttribute('data-reply-id');
        if (!confirm('Delete this reply?')) return;
        try { 
          deleteReply(rid, repid); 
          renderReviewList(gameId);
          showUndo(function(){
            var last = window.__GR_LAST_DELETED__;
            if (!last || last.kind !== 'reply') return false;
            const all = getItem(STORAGE_KEYS.REVIEWS, []);
            const idx = all.findIndex(function(r){ return r.id === last.payload.reviewId; });
            if (idx === -1) return false;
            all[idx].replies = all[idx].replies || [];
            all[idx].replies.push(last.payload.reply);
            setItem(STORAGE_KEYS.REVIEWS, all);
            renderReviewList(gameId);
            return true;
          });
        } catch(err) { alert(err.message||'Failed'); }
      });
    });
  }

  function renderGameDetailHeaderOnly(gameId) {
    // Minimal recalc of average by re-calling renderGameDetail, but fast path skipped
    // Kept for potential optimization; currently re-render handled by renderGameDetail
  }

  // Account page
  function renderAccount() {
    const root = document.querySelector('[data-account]');
    if (!root) return;
    const user = getCurrentUser();
    if (!user) { window.location.href = 'login.html'; return; }
    const allReviews = listReviewsForUser(user.id);
    const allReplies = listRepliesForUser(user.id);
    const gamesById = listGames().reduce(function(acc, g){ acc[g.id] = g; return acc; }, {});
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
      '</section>' +
      '<section class="review-list" style="margin-top:16px">' +
        '<h3 style="margin:0 0 8px">Your replies</h3>' +
        (allReplies.length ? allReplies.map(function(item){
          var g = gamesById[item.gameId];
          var title = g ? g.title : 'Unknown game';
          return (
            '<article class="review-card">' +
              '<div class="review-meta">On <a href="game.html?id=' + encodeURIComponent(item.gameId) + '"><strong>' + title.replace(/</g,'&lt;') + '</strong></a> • ' + new Date(item.reply.createdAt).toLocaleString() + '</div>' +
              '<div class="review-text">' + (item.reply.text||'').replace(/</g,'&lt;') + '</div>' +
            '</article>'
          );
        }).join('') : '<p class="muted">No replies yet.</p>') +
      '</section>';

    // Wire account form
    const accountForm = root.querySelector('[data-account-form]');
    if (accountForm) {
      accountForm.addEventListener('submit', function(e){
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
          updateAccount(user.id, { email: email, currentPassword: current, newPassword: newpass });
          renderHeaderAuthState();
          renderAccount();
          notice && (notice.textContent = 'Saved');
        } catch (err) {
          showErr(err.message || 'Failed to save');
        }
      });
    }
  }

  function listReviewsForUser(userId) {
    const all = getItem(STORAGE_KEYS.REVIEWS, []);
    return all.filter(function(r){ return r.userId === userId; }).sort(function(a,b){ return b.createdAt - a.createdAt; });
  }

  function listRepliesForUser(userId) {
    const all = getItem(STORAGE_KEYS.REVIEWS, []);
    const out = [];
    all.forEach(function(r){
      (r.replies || []).forEach(function(rep){ if (rep.userId === userId) out.push({ gameId: r.gameId, reviewId: r.id, reply: rep }); });
    });
    return out.sort(function(a,b){ return b.reply.createdAt - a.reply.createdAt; });
  }

  function updateAccount(userId, opts) {
    const users = getItem(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(function(u){ return u.id === userId; });
    if (idx === -1) throw new Error('User not found');
    const u = users[idx];
    // Email change
    const newEmail = (opts.email || '').trim();
    if (newEmail && newEmail.toLowerCase() !== u.email.toLowerCase()) {
      if (users.some(function(x){ return x.email.toLowerCase() === newEmail.toLowerCase(); })) {
        throw new Error('Email already in use');
      }
      u.email = newEmail;
    }
    // Password change
    if (opts.newPassword) {
      if (!opts.currentPassword || hash(opts.currentPassword) !== u.passwordHash) {
        throw new Error('Current password incorrect');
      }
      u.passwordHash = hash(opts.newPassword);
    }
    users[idx] = u;
    setItem(STORAGE_KEYS.USERS, users);

    // Propagate updated email to existing reviews/replies
    if (newEmail) {
      const revs = getItem(STORAGE_KEYS.REVIEWS, []);
      let touched = false;
      revs.forEach(function(r){
        if (r.userId === userId) { r.userEmail = newEmail; touched = true; }
        (r.replies||[]).forEach(function(rep){ if (rep.userId === userId) { rep.userEmail = newEmail; touched = true; } });
      });
      if (touched) setItem(STORAGE_KEYS.REVIEWS, revs);
    }
    return true;
  }

  // Page boot
  document.addEventListener('DOMContentLoaded', function(){
    bootstrap();
    renderHeaderAuthState();
    renderGamesGrid();
    renderGameDetail();
    renderAccount();

    // Wire login form
    const loginForm = document.querySelector('[data-login-form]');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e){
        e.preventDefault();
        const email = loginForm.querySelector('input[name="email"]').value.trim();
        const password = loginForm.querySelector('input[name="password"]').value;
        try {
          logIn(email, password);
          window.location.href = 'index.html';
        } catch (err) {
          showFormError(loginForm, err.message);
        }
      });
    }

    // Wire signup form
    const signupForm = document.querySelector('[data-signup-form]');
    if (signupForm) {
      signupForm.addEventListener('submit', function(e){
        e.preventDefault();
        const email = signupForm.querySelector('input[name="email"]').value.trim();
        const password = signupForm.querySelector('input[name="password"]').value;
        const confirm = signupForm.querySelector('input[name="confirm"]').value;
        if (password !== confirm) {
          showFormError(signupForm, 'Passwords do not match');
          return;
        }
        try {
          signUp(email, password);
          window.location.href = 'index.html';
        } catch (err) {
          showFormError(signupForm, err.message);
        }
      });
    }

    // Wire admin add-game form
    const addGameForm = document.querySelector('[data-add-game-form]');
    if (addGameForm) {
      const user = getCurrentUser();
      if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
      }
      addGameForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const title = addGameForm.querySelector('input[name="title"]').value.trim();
        const genre = addGameForm.querySelector('input[name="genre"]').value.trim();
        const fileInput = addGameForm.querySelector('input[name="image"]');
        let imageDataUrl = '';
        if (fileInput.files && fileInput.files[0]) {
          imageDataUrl = await readFileAsDataUrl(fileInput.files[0]);
        } else {
          imageDataUrl = 'https://picsum.photos/seed/' + encodeURIComponent(title || 'game') + '/640/360';
        }
        try {
          const description = addGameForm.querySelector('textarea[name="description"]').value.trim();
          addGame(title, genre, imageDataUrl, description);
          addGameForm.reset();
          const notice = addGameForm.querySelector('[data-form-notice]');
          if (notice) { notice.textContent = 'Game added!'; setTimeout(function(){ notice.textContent=''; }, 2000); }
          renderGamesGrid();
        } catch (err) {
          showFormError(addGameForm, err.message);
        }
      });
    }

    // Wire delete buttons via event delegation
    document.body.addEventListener('click', function(e){
      const btn = e.target && e.target.closest('[data-delete-game]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Delete this game?')) return;
      try {
        deleteGame(id);
        renderGamesGrid();
      } catch (err) {
        alert(err.message || 'Failed to delete');
      }
    });
  });

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

  // Expose minimal API for debugging (optional)
  window.GameRate = {
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



