import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminDashboard() {
  const [activeSession, setActiveSession] = useState('Session1');
  const [status, setStatus] = useState('WAITING');
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [revealRank, setRevealRank] = useState(10);
  const [joinTimer, setJoinTimer] = useState(60);
  const [showPlayerCount, setShowPlayerCount] = useState(true);
  const [playMusic, setPlayMusic] = useState(false);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  
  // Trap states
  const [trapActive, setTrapActive] = useState(false);
  const [trapQuestion, setTrapQuestion] = useState('Siapa yang mau joget?');
  const [trapA, setTrapA] = useState('Budi');
  const [trapB, setTrapB] = useState('Andi');
  const [trapC, setTrapC] = useState('Siti');
  const [trapD, setTrapD] = useState('Semua benar');

  useEffect(() => {
    api.getQuestions(activeSession).then(setQuestions);
  }, [activeSession]);

  const handleUpdateState = (newStatus, customTimer = null, overrides = {}) => {
    setStatus(newStatus);
    const currentQ = questions[currentQIndex];
    
    let stateObj = {
      Active_Session_ID: activeSession,
      Current_Question_No: currentQ ? currentQ.Question_No : 1,
      Status: newStatus,
      Start_Time: (newStatus === 'QUESTION_ACTIVE' || customTimer !== null) ? new Date().toISOString() : '',
      Timer_Value: customTimer !== null ? customTimer : (newStatus === 'QUESTION_ACTIVE' && currentQ ? (currentQ.time_limit || 30) : 0),
      Leaderboard_Reveal: overrides.Leaderboard_Reveal !== undefined ? overrides.Leaderboard_Reveal : revealRank,
      Show_Player_Count: overrides.Show_Player_Count !== undefined ? overrides.Show_Player_Count : showPlayerCount,
      Play_Music: overrides.Play_Music !== undefined ? overrides.Play_Music : playMusic,
      Leaderboard_Page: overrides.Leaderboard_Page !== undefined ? overrides.Leaderboard_Page : leaderboardPage,
      Trap_Active: overrides.Trap_Active !== undefined ? overrides.Trap_Active : trapActive,
      Trap_Question: trapQuestion,
      Trap_A: trapA,
      Trap_B: trapB,
      Trap_C: trapC,
      Trap_D: trapD
    };
    
    api.updateState(stateObj);
  };

  const toggleTrap = () => {
    const newState = !trapActive;
    setTrapActive(newState);
    handleUpdateState(status, null, { Trap_Active: newState });
  };

  const handleNextReveal = () => {
    if (revealRank > 1) {
      const nextRank = revealRank - 1;
      setRevealRank(nextRank);
      
      const currentQ = questions[currentQIndex];
      api.updateState({
        Active_Session_ID: activeSession,
        Current_Question_No: currentQ ? currentQ.Question_No : 1,
        Status: status === 'COMBINED' ? 'COMBINED' : 'LEADERBOARD',
        Start_Time: '',
        Timer_Value: 0,
        Leaderboard_Reveal: nextRank,
        Show_Player_Count: showPlayerCount,
        Play_Music: playMusic,
        Leaderboard_Page: leaderboardPage,
        Trap_Active: trapActive,
        Trap_Question: trapQuestion,
        Trap_A: trapA,
        Trap_B: trapB,
        Trap_C: trapC,
        Trap_D: trapD
      });
    }
  };

  const currentQuestion = questions[currentQIndex] || null;

  return (
    <div className="min-h-screen p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <header className="flex justify-between items-center glass-panel p-6 rounded-2xl border-white/10">
          <div>
             <h1 className="text-3xl font-black text-white tracking-wide">CAPTAIN'S DASHBOARD</h1>
             <p className="text-poster-cyan text-sm uppercase tracking-widest font-semibold mt-1">System Administration</p>
          </div>
          <div className="flex items-center gap-4">
            <img src="/Lentera.png" alt="Lentera Logo" className="h-10 object-contain" />
            <img src="/Logo_HCGA.png" alt="HCGA Logo" className="h-10 object-contain" />
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Controls */}
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-panel p-8 rounded-3xl border-white/10 relative overflow-hidden">
              <h2 className="text-xl font-bold text-poster-cyan mb-6 uppercase tracking-wider">Live Game Controls</h2>
              
              <div className="flex flex-wrap gap-4 mb-8">
                 <select 
                   value={activeSession}
                   onChange={(e) => {
                     setActiveSession(e.target.value);
                     setCurrentQIndex(0);
                   }}
                   className="bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-poster-cyan backdrop-blur-md"
                 >
                   <option value="Session1">Session 1</option>
                   <option value="Session2">Session 2</option>
                   <option value="Session3">Session 3</option>
                 </select>
                 
                 <div className="flex items-center gap-2 px-6 py-3 bg-black/40 rounded-xl border border-white/20 backdrop-blur-md">
                    <span className="text-gray-400">STATUS:</span> 
                    <span className="font-bold text-poster-cyan tracking-wider">{status}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <button onClick={() => handleUpdateState('WAITING')} className="bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-md transition-transform active:scale-95">Lobby</button>
                 <button onClick={() => handleUpdateState('QUESTION_ACTIVE')} className="bg-poster-blue-light hover:bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-md transition-transform active:scale-95">Start Q</button>
                 <button onClick={() => handleUpdateState('LEADERBOARD')} className="bg-poster-red hover:bg-red-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-md transition-transform active:scale-95">Leaderboard</button>
                 <button onClick={() => handleUpdateState('COMBINED')} className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-md transition-transform active:scale-95">Global LB</button>
              </div>

              <div className="mt-8 p-5 bg-black/30 rounded-2xl border border-white/10 flex flex-wrap items-center gap-4 backdrop-blur-md">
                <label className="text-gray-300 font-bold uppercase tracking-wider text-sm">Join Timer:</label>
                <input 
                  type="number" 
                  value={joinTimer} 
                  onChange={(e) => setJoinTimer(e.target.value)}
                  className="bg-black/50 text-white border border-white/20 rounded-lg px-4 py-2 w-24 text-center focus:outline-none focus:border-poster-cyan"
                />
                <span className="text-gray-400 text-sm">SEC</span>
                <button 
                  onClick={() => {
                    setPlayMusic(true);
                    handleUpdateState('WAITING', Number(joinTimer), { Play_Music: true });
                  }} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold ml-auto uppercase tracking-wider text-sm shadow-md transition-transform active:scale-95"
                >
                  Start Join Timer
                </button>
              </div>

              <div className="mt-4 p-5 bg-black/30 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
                 <div className="flex items-center gap-4">
                   <label className="flex items-center gap-3 text-gray-300 font-bold cursor-pointer uppercase tracking-wider text-sm">
                     <input 
                       type="checkbox" 
                       checked={showPlayerCount} 
                       onChange={(e) => {
                         setShowPlayerCount(e.target.checked);
                         handleUpdateState(status, null, { Show_Player_Count: e.target.checked });
                       }} 
                       className="w-5 h-5 accent-poster-cyan bg-black/50 border-white/20"
                     />
                     Show Player Count
                   </label>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-xs border ${playMusic ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                     BGM: {playMusic ? 'ON' : 'OFF'}
                   </div>
                   {playMusic && (
                     <button 
                       onClick={() => {
                         setPlayMusic(false);
                         handleUpdateState(status, null, { Play_Music: false });
                       }}
                       className="bg-red-600/80 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-transform active:scale-95 border border-red-500/50"
                     >
                       Stop BGM
                     </button>
                   )}
                 </div>
              </div>
            </section>

            {/* Current Question preview */}
            <section className="glass-panel p-8 rounded-3xl border-white/10 relative overflow-hidden">
               <h2 className="text-xl font-bold text-poster-cyan mb-6 uppercase tracking-wider">Question Preview</h2>
               <div className="bg-black/40 border border-white/10 p-6 rounded-2xl text-white mb-6 min-h-[80px] font-medium text-lg leading-relaxed">
                  {currentQuestion ? <><span className="text-poster-cyan mr-2 font-black">Q{currentQuestion.Question_No}.</span> {currentQuestion.Question} <span className="text-gray-500 text-sm ml-2">[{currentQuestion.time_limit || '30'}s]</span></> : <span className="text-gray-500">Loading questions...</span>}
               </div>
                <div className="flex gap-4">
                  <button 
                    disabled={currentQIndex === 0}
                    onClick={() => {
                      const newIndex = currentQIndex - 1;
                      setCurrentQIndex(newIndex);
                      const nextQ = questions[newIndex];
                      if (nextQ) {
                        setStatus('WAITING');
                        api.updateState({
                          Active_Session_ID: activeSession,
                          Current_Question_No: nextQ.Question_No,
                          Status: 'WAITING',
                          Start_Time: '',
                          Timer_Value: nextQ.time_limit || 30,
                          Leaderboard_Reveal: revealRank,
                          Show_Player_Count: showPlayerCount,
                          Play_Music: playMusic,
                          Leaderboard_Page: leaderboardPage,
                          Trap_Active: trapActive
                        });
                      }
                    }}
                    className="bg-black/50 border border-white/20 px-6 py-3 rounded-xl hover:bg-white/10 disabled:opacity-30 uppercase tracking-wider text-sm font-bold transition-all"
                  >
                    &lt; Prev Question
                  </button>
                  <button 
                    disabled={currentQIndex >= questions.length - 1}
                    onClick={() => {
                      const newIndex = currentQIndex + 1;
                      setCurrentQIndex(newIndex);
                      const nextQ = questions[newIndex];
                      if (nextQ) {
                        setStatus('WAITING');
                        api.updateState({
                          Active_Session_ID: activeSession,
                          Current_Question_No: nextQ.Question_No,
                          Status: 'WAITING',
                          Start_Time: '',
                          Timer_Value: nextQ.time_limit || 30,
                          Leaderboard_Reveal: revealRank,
                          Show_Player_Count: showPlayerCount,
                          Play_Music: playMusic,
                          Leaderboard_Page: leaderboardPage,
                          Trap_Active: trapActive
                        });
                      }
                    }}
                    className="bg-black/50 border border-white/20 px-6 py-3 rounded-xl hover:bg-white/10 disabled:opacity-30 uppercase tracking-wider text-sm font-bold transition-all"
                  >
                    Next Question &gt;
                  </button>
                </div>
            </section>
          </div>
          
          {/* Side Panel */}
          <div className="space-y-6">
            <section className="glass-panel p-8 rounded-3xl border-white/10 relative overflow-hidden">
               <h2 className="text-xl font-bold text-poster-cyan mb-6 uppercase tracking-wider">LB Reveal</h2>
               <p className="text-sm text-gray-400 mb-6">Control which rank is currently visible on the big screen.</p>
               
               <div className="flex items-center justify-between bg-black/40 border border-white/10 p-5 rounded-2xl mb-6">
                  <span className="text-gray-300 font-bold uppercase tracking-wider text-sm">Revealed:</span>
                  <span className="text-3xl font-black text-white">#{revealRank}</span>
               </div>
               
               <button 
                 onClick={handleNextReveal}
                 disabled={revealRank <= 1 || (status !== 'LEADERBOARD' && status !== 'COMBINED')}
                 className="w-full bg-poster-blue-light hover:bg-blue-600 disabled:opacity-30 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-md transition-all active:scale-95"
               >
                 Reveal Next (#{Math.max(1, revealRank - 1)})
               </button>
               
               <button 
                 onClick={() => setRevealRank(10)}
                 className="w-full mt-4 bg-transparent border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all"
               >
                 Reset to #10
               </button>
             </section>

             {/* Fitur Jebakan */}
             <section className="glass-panel p-8 rounded-3xl border-poster-red/30 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-poster-red-bright/10 blur-2xl pointer-events-none"></div>
               <h2 className="text-xl font-bold text-poster-red-bright mb-4 uppercase tracking-wider flex items-center justify-between">
                 Fitur Jebakan
                 <div className={`w-3 h-3 rounded-full ${trapActive ? 'bg-poster-red-bright animate-pulse' : 'bg-gray-600'}`}></div>
               </h2>
               <p className="text-sm text-gray-400 mb-6 leading-relaxed">Tiban (override) pertanyaan saat ini di layar semua orang dengan jebakan secara instan.</p>
               
               <div className="space-y-4 mb-6">
                 <div>
                   <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Pertanyaan Jebakan</label>
                   <input type="text" value={trapQuestion} onChange={e => setTrapQuestion(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:border-poster-red-bright outline-none" />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Opsi A</label>
                      <input type="text" value={trapA} onChange={e => setTrapA(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:border-poster-red-bright outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Opsi B</label>
                      <input type="text" value={trapB} onChange={e => setTrapB(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:border-poster-red-bright outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Opsi C</label>
                      <input type="text" value={trapC} onChange={e => setTrapC(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:border-poster-red-bright outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Opsi D</label>
                      <input type="text" value={trapD} onChange={e => setTrapD(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:border-poster-red-bright outline-none" />
                    </div>
                 </div>
               </div>
               
               <button 
                 onClick={toggleTrap}
                 className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-md transition-all active:scale-95 ${trapActive ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-poster-red hover:bg-red-600 text-white'}`}
               >
                 {trapActive ? 'Matikan Jebakan' : 'Aktifkan Jebakan!'}
               </button>
             </section>
          </div>
        </main>
      </div>
    </div>
  );
}
