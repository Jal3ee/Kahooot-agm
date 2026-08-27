import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ParticipantJoin() {
  const [selectedUser, setSelectedUser] = useState('');
  const navigate = useNavigate();

  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (selectedUser.trim()) {
      setJoining(true);
      try {
        await api.joinSession(selectedUser.trim());
      } catch (err) {
        console.error("Failed to notify join to server", err);
      }
      localStorage.setItem('participantName', selectedUser.trim());
      navigate('/play');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-poster-blue-light/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-poster-red-bright/10 rounded-full blur-3xl"></div>

      <div className="animate-fade-in-up glass-panel p-6 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-white/10 flex flex-col items-center">
        
        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <img src="/Lentera.png" alt="Lentera Logo" className="h-12 object-contain" />
          <img src="/Logo_HCGA.png" alt="HCGA Logo" className="h-12 object-contain" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-poster-cyan to-white tracking-wide">
          HCGA SESSION
        </h1>
        <p className="text-center text-gray-300 font-medium mb-8 tracking-wider uppercase text-sm">Learn, Share, Grow Together</p>
        
        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div>
            <label className="block text-sm font-semibold text-poster-cyan mb-2 tracking-wide uppercase">Enter Your Name</label>
            <input
              type="text"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              placeholder="Type your name here..."
              className="w-full p-4 rounded-xl bg-black/30 border border-white/20 text-white focus:outline-none focus:border-poster-cyan focus:ring-1 focus:ring-poster-cyan transition-all text-base sm:text-lg backdrop-blur-md shadow-md"
              autoFocus
            />
          </div>
          
          <button 
            onClick={handleJoin}
            disabled={!selectedUser || joining}
            className="w-full bg-poster-red hover:bg-poster-red-bright active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 text-lg shadow-lg uppercase tracking-wider mt-4"
          >
            {joining ? "Joining..." : "Enter Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
