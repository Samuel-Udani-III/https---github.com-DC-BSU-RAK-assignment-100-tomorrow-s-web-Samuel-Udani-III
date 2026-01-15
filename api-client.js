// API Client for P.R.G. Backend
// Replaces localStorage functionality with HTTP API calls

const DEFAULT_LOCAL_API = 'http://localhost:3001/api';

function normalizeBase(url) {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

function detectApiBase() {
  if (typeof window !== 'undefined') {
    if (window.__GAMERATE_API_BASE__) {
      return normalizeBase(String(window.__GAMERATE_API_BASE__));
    }

    const origin = window.location && window.location.origin ? window.location.origin : '';
    const protocol = window.location && window.location.protocol ? window.location.protocol : '';

    if (!origin || origin === 'null' || protocol === 'file:') {
      return normalizeBase(DEFAULT_LOCAL_API);
    }

    if (/localhost|127\.0\.0\.1/i.test(origin)) {
      // If served by Nginx on port 8080, use relative API path
      if (window.location.port === '8080') {
        return '/api';
      }
      return normalizeBase(DEFAULT_LOCAL_API);
    }

    return normalizeBase(`${origin}/api`);
  }

  return normalizeBase(DEFAULT_LOCAL_API);
}

class PRGAPI {
  constructor(baseURL) {
    this.baseURL = normalizeBase(baseURL) || detectApiBase();
    this.token = localStorage.getItem('prg_token');
  }

  setBaseURL(baseURL) {
    this.baseURL = normalizeBase(baseURL) || this.baseURL;
  }

  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authorization header if token exists
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async signUp(email, password) {
    const response = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.token = response.token;
    localStorage.setItem('prg_token', this.token);
    return response.user;
  }

  async logIn(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.token = response.token;
    localStorage.setItem('prg_token', this.token);
    return response.user;
  }

  async logOut() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore logout errors
    }
    
    this.token = null;
    localStorage.removeItem('prg_token');
  }

  async getCurrentUser() {
    if (!this.token) return null;
    
    try {
      const response = await this.request('/auth/me');
      return response.user;
    } catch (error) {
      // Token might be invalid, clear it
      this.logOut();
      return null;
    }
  }

  async updateAccount(email, currentPassword, newPassword) {
    const response = await this.request('/auth/account', {
      method: 'PUT',
      body: JSON.stringify({ email, currentPassword, newPassword })
    });
    return response.user;
  }

  // Game methods
  async listGames() {
    const response = await this.request('/games');
    return response.games;
  }

  // Site-level methods
  async getSite() {
    const response = await this.request('/site');
    return response;
  }


  async getGame(id) {
    const response = await this.request(`/games/${id}`);
    return response.game;
  }

  async addGame(title, genre, imageFile, description) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('genre', genre);
    formData.append('description', description || '');
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const response = await fetch(`${this.baseURL}/games`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.game;
  }

  async uploadBanner(file) {
    if (!file) {
      throw new Error('No banner file provided');
    }
    const formData = new FormData();
    formData.append('banner', file);
    const response = await fetch(`${this.baseURL}/site/banner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  async updateGame(id, title, genre, imageFile, description) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('genre', genre);
    formData.append('description', description || '');
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const response = await fetch(`${this.baseURL}/games/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.game;
  }

  async deleteGame(id) {
    await this.request(`/games/${id}`, { method: 'DELETE' });
    return true;
  }

  async searchGames(query) {
    const response = await this.request(`/games/search/${encodeURIComponent(query)}`);
    return response.games;
  }

  // Review methods
  async listReviews(gameId) {
    const response = await this.request(`/reviews/game/${gameId}`);
    return response.reviews;
  }

  async addReview(gameId, rating, text) {
    const response = await this.request(`/reviews/game/${gameId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, text })
    });
    return response.review;
  }

  async updateReview(reviewId, rating, text) {
    const response = await this.request(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify({ rating, text })
    });
    return response.review;
  }

  async deleteReview(reviewId) {
    await this.request(`/reviews/${reviewId}`, { method: 'DELETE' });
    return true;
  }

  async addReply(reviewId, text) {
    const response = await this.request(`/reviews/${reviewId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    return response.reply;
  }

  async updateReply(replyId, text) {
    const response = await this.request(`/reviews/replies/${replyId}`, {
      method: 'PUT',
      body: JSON.stringify({ text })
    });
    return response.reply;
  }

  async deleteReply(replyId) {
    await this.request(`/reviews/replies/${replyId}`, { method: 'DELETE' });
    return true;
  }

  async getUserReviews(userId) {
    const response = await this.request(`/reviews/user/${userId}`);
    return response.reviews;
  }

  // Utility methods
  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }
}

// Create global API instance
window.GameRateAPI = new GameRateAPI();

