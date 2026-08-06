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
      Timer_Value: customTimer !== null ? customTimer : (newStatus === 'QUESTION_ACTIVE' && currentQ ? (currentQ.Timer || currentQ.Time_Limit || 0) : 0),
      Leaderboard_Reveal: overrides.Leaderboard_Reveal !== undefined ? overrides.Leaderboard_Reveal : revealRank,
      Show_Player_Count: overrides.Show_Player_Count !== undefined ? overrides.Show_Player_Count : showPlayerCount,
      Play_Music: overrides.Play_Music !== undefined ? overrides.Play_Music : playMusic,
      Leaderboard_Page: overrides.Leaderboard_Page !== undefined ? overrides.Leaderboard_Page : leaderboardPage
    };
    
    api.updateState(stateObj);
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
        Leaderboard_Page: leaderboardPage
      });
    }
  };

  const currentQuestion = questions[currentQIndex] || null;

  return (
    <div className="min-h-screen bg-marine-900 text-slate-300 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-marine-800 p-6 rounded-xl border border-marine-700">
          <h1 className="text-2xl font-bold text-white">Captain's Dashboard (Admin)</h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Controls */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-marine-800 p-6 rounded-xl border border-marine-700">
              <h2 className="text-xl font-bold text-gold-400 mb-4">Live Game Controls</h2>
              
              <div className="flex flex-wrap gap-4 mb-6">
                 <select 
                   value={activeSession}
                   onChange={(e) => {
                     setActiveSession(e.target.value);
                     setCurrentQIndex(0);
                   }}
                   className="bg-marine-700 border border-marine-600 rounded px-4 py-2 text-white"
                 >
                   <option value="Session1">Session 1</option>
                   <option value="Session2">Session 2</option>
                   <option value="Session3">Session 3</option>
                 </select>
                 
                 <div className="flex items-center gap-2 px-4 py-2 bg-marine-700 rounded border border-marine-600">
                    Status: <span className="font-bold text-white">{status}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <button onClick={() => handleUpdateState('WAITING')} className="bg-slate-600 hover:bg-slate-500 text-white py-3 rounded font-bold">Lobby / Waiting</button>
                 <button onClick={() => handleUpdateState('QUESTION_ACTIVE')} className="bg-ocean-500 hover:bg-ocean-400 text-white py-3 rounded font-bold">Start Question</button>
                 <button onClick={() => handleUpdateState('LEADERBOARD')} className="bg-gold-500 hover:bg-gold-400 text-marine-900 py-3 rounded font-bold">Show Leaderboard</button>
                 <button onClick={() => handleUpdateState('COMBINED')} className="bg-purple-500 hover:bg-purple-400 text-white py-3 rounded font-bold">Combined LB</button>
              </div>

              <div className="mt-6 p-4 bg-marine-700 rounded-lg border border-marine-600 flex flex-wrap items-center gap-4">
                <label className="text-white font-bold">Join Timer (Lobby):</label>
                <input 
                  type="number" 
                  value={joinTimer} 
                  onChange={(e) => setJoinTimer(e.target.value)}
                  className="bg-marine-800 text-white border border-marine-500 rounded px-3 py-2 w-24 text-center"
                />
                <span className="text-slate-300">seconds</span>
                <button 
                  onClick={() => {
                    setPlayMusic(true);
                    handleUpdateState('WAITING', Number(joinTimer), { Play_Music: true });
                  }} 
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold ml-auto"
                >
                  Start Join Timer
                </button>
              </div>

              <div className="mt-4 p-4 bg-marine-700 rounded-lg border border-marine-600 flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                   <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                     <input 
                       type="checkbox" 
                       checked={showPlayerCount} 
                       onChange={(e) => {
                         setShowPlayerCount(e.target.checked);
                         handleUpdateState(status, null, { Show_Player_Count: e.target.checked });
                       }} 
                       className="w-5 h-5 accent-gold-500"
                     />
                     Show Player Count
                   </label>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className={`px-3 py-1 rounded font-bold ${playMusic ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                     Music: {playMusic ? 'PLAYING' : 'STOPPED'}
                   </div>
                   {playMusic && (
                     <button 
                       onClick={() => {
                         setPlayMusic(false);
                         handleUpdateState(status, null, { Play_Music: false });
                       }}
                       className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold"
                     >
                       Stop Music
                     </button>
                   )}
                 </div>
              </div>
            </section>

            {/* Current Question preview */}
            <section className="bg-marine-800 p-6 rounded-xl border border-marine-700">
               <h2 className="text-xl font-bold text-gold-400 mb-4">Current Question Preview</h2>
               <div className="bg-marine-700 p-4 rounded text-white mb-4 min-h-[60px]">
                  {currentQuestion ? `(${currentQuestion.Question_No}) ${currentQuestion.Question_Text} [Time: ${currentQuestion.Timer || currentQuestion.Time_Limit || '0'}s]` : 'Loading questions...'}
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
                          Timer_Value: nextQ.Timer || nextQ.Time_Limit || 0,
                          Leaderboard_Reveal: revealRank,
                          Show_Player_Count: showPlayerCount,
                          Play_Music: playMusic,
                          Leaderboard_Page: leaderboardPage
                        });
                      }
                    }}
                    className="bg-marine-600 px-4 py-2 rounded hover:bg-marine-500 disabled:opacity-50"
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
                          Timer_Value: nextQ.Timer || nextQ.Time_Limit || 0,
                          Leaderboard_Reveal: revealRank,
                          Show_Player_Count: showPlayerCount,
                          Play_Music: playMusic,
                          Leaderboard_Page: leaderboardPage
                        });
                      }
                    }}
                    className="bg-marine-600 px-4 py-2 rounded hover:bg-marine-500 disabled:opacity-50"
                  >
                    Next Question &gt;
                  </button>
               </div>
            </section>
          </div>

          {/* Leaderboard Reveal Control */}
          <div className="space-y-6">
            <section className="bg-marine-800 p-6 rounded-xl border border-marine-700">
               <h2 className="text-xl font-bold text-gold-400 mb-4">Leaderboard Reveal</h2>
               <p className="text-sm text-slate-400 mb-4">Control which rank is currently visible on the big screen.</p>
               
               <div className="flex items-center justify-between bg-marine-700 p-4 rounded mb-4">
                  <span>Current Reveal:</span>
                  <span className="text-2xl font-bold text-white">#{revealRank}</span>
               </div>
               
               <button 
                 onClick={handleNextReveal}
                 disabled={revealRank <= 1 || (status !== 'LEADERBOARD' && status !== 'COMBINED')}
                 className="w-full bg-ocean-500 hover:bg-ocean-400 disabled:opacity-50 text-white py-3 rounded font-bold"
               >
                 Reveal Next (Rank #{Math.max(1, revealRank - 1)})
               </button>
               
               <button 
                 onClick={() => setRevealRank(10)}
                 className="w-full mt-2 bg-marine-600 hover:bg-marine-500 text-white py-2 rounded font-bold"
               >
                 Reset to #10
               </button>
             </section>
          </div>
        </main>
      </div>
    </div>
  );
}
