import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ParticipantJoin() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleJoin = () => {
    if (selectedUser) {
      localStorage.setItem('participantName', selectedUser);
      navigate('/play');
    }
  };

  const filteredUsers = users.filter(u => 
    u.Combined_Name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="relative" ref={dropdownRef}>
              <div 
                className="w-full p-3.5 sm:p-4 rounded-xl bg-marine-700 border border-marine-500 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 transition-shadow cursor-pointer text-base sm:text-lg flex justify-between items-center"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className={selectedUser ? "text-white" : "text-gray-400"}>
                  {selectedUser || (loading ? "Loading crew..." : "-- Choose Name --")}
                </span>
                <svg className={`fill-current h-5 w-5 text-gold-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-marine-700 border border-marine-500 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-marine-600">
                    <input
                      type="text"
                      className="w-full bg-marine-800 text-white border border-marine-500 rounded-lg p-2 focus:outline-none focus:border-gold-500"
                      placeholder="Search name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-60 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <li className="p-3 text-slate-400 text-center">No name found</li>
                    ) : (
                      filteredUsers.map((u, i) => (
                        <li 
                          key={i} 
                          className="p-3 hover:bg-marine-600 cursor-pointer text-white transition-colors"
                          onClick={() => {
                            setSelectedUser(u.Combined_Name);
                            setIsDropdownOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          {u.Combined_Name}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
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
