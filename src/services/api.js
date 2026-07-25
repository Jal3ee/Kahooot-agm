import axios from 'axios';

// Replace this with the URL you get after deploying your Google Apps Script
const GAS_URL = import.meta.env.VITE_GAS_URL || 'YOUR_GAS_WEB_APP_URL_HERE';

export const api = {
  getUsers: async () => {
    const cached = sessionStorage.getItem('cachedUsers');
    if (cached) return JSON.parse(cached);

    const res = await axios.get(`${GAS_URL}?action=getUsers`);
    sessionStorage.setItem('cachedUsers', JSON.stringify(res.data));
    return res.data;
  },
  
  getQuestions: async (sessionId = '') => {
    let data;
    const cacheKey = `cachedQuestions_${sessionId || 'all'}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      data = JSON.parse(cached);
    } else {
      const res = await axios.get(`${GAS_URL}?action=getQuestions`);
      data = res.data;
      // We could cache the full list, but here we just cache whatever we fetched for this session
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }
    if (sessionId) {
      const sessionNum = String(sessionId).replace('Session', '').trim();
      data = data.filter(q => String(q.Session_ID) === sessionNum || String(q.Session_ID) === sessionId);
    }
    return data;
  },
  
  getState: async () => {
    const res = await axios.get(`${GAS_URL}?action=getState`);
    return res.data;
  },

  getLeaderboard: async (sessionId) => {
    const res = await axios.get(`${GAS_URL}?action=getLeaderboard&sessionId=${sessionId}`);
    return res.data;
  },

  getCombinedLeaderboard: async () => {
    const res = await axios.get(`${GAS_URL}?action=getCombinedLeaderboard`);
    return res.data;
  },
  
  updateState: async (state) => {
    const res = await axios.post(GAS_URL, JSON.stringify({ action: 'updateState', state }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return res.data;
  },
  
  submitAnswer: async (answer) => {
    const res = await axios.post(GAS_URL, JSON.stringify({ action: 'submitAnswer', answer }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return res.data;
  },
  
  addUser: async (user) => {
    const res = await axios.post(GAS_URL, JSON.stringify({ action: 'addUser', user }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return res.data;
  }
};
