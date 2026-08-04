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
    const res = await axios.get(`${GAS_URL}?action=getQuestions`);
    let data = res.data;
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
  
  joinSession: async (name) => {
    const res = await axios.post(GAS_URL, JSON.stringify({ action: 'joinSession', name }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return res.data;
  },

  getJoinedCount: async () => {
    const res = await axios.get(`${GAS_URL}?action=getJoinedCount`);
    return res.data;
  },
  
  addUser: async (user) => {
    const res = await axios.post(GAS_URL, JSON.stringify({ action: 'addUser', user }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return res.data;
  }
};
