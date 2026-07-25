import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ParticipantJoin() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers()
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch users", err);
        setLoading(false);
      });
  }, []);

  const handleJoin = () => {
    if (selectedUser) {
      localStorage.setItem('participantName', selectedUser);
      navigate('/play');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-marine-900 p-4 sm:p-6">
      <div className="animate-fade-in-up bg-marine-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gold-500/30">
        <div className="flex justify-center gap-4 mb-6 animate-pop-in" style={{ animationDelay: '0.1s' }}>
          <img src="/logo_agm-.png" alt="AGM Logo" className="h-10 sm:h-12 object-contain" />
          <img src="/Konvensi_Logo.jpeg" alt="Convention Logo" className="h-10 sm:h-12 object-contain rounded-md" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-gold-400 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Join the Voyage
        </h1>
        
        <div className="space-y-5 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Select Your Name</label>
            <div className="relative">
              <select 
                className="w-full p-3.5 sm:p-4 rounded-xl bg-marine-700 border border-marine-500 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none transition-shadow cursor-pointer text-base sm:text-lg"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">{loading ? "Loading crew..." : "-- Choose Name --"}</option>
                {users.map((u, i) => (
                  <option key={i} value={u.Combined_Name}>{u.Combined_Name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gold-400">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleJoin}
            disabled={!selectedUser}
            className="w-full bg-gold-500 hover:bg-gold-400 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-marine-900 font-bold py-4 px-4 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-gold-500/20"
          >
            Enter Session
          </button>
        </div>
      </div>
    </div>
  );
}
