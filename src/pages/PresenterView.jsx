import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Trophy, Volume2 } from 'lucide-react';
import Confetti from 'react-confetti';

const playCelebrationSound = (rank) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const playTone = (freq, type, time, duration, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(vol, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    };

    if (rank === 3) {
      playTone(440, 'triangle', 0, 0.4, 0.5);
      playTone(554, 'triangle', 0.15, 0.6, 0.5);
    } else if (rank === 2) {
      playTone(554, 'triangle', 0, 0.3, 0.5);
      playTone(659, 'triangle', 0.15, 0.3, 0.5);
      playTone(880, 'triangle', 0.3, 0.8, 0.5);
    } else if (rank === 1) {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        playTone(freq, 'square', i * 0.1, 0.3, 0.3);
      });
      playTone(1046.50, 'square', 0.4, 1.5, 0.3);
      playTone(1046.50, 'sine', 0.4, 1.5, 0.5);
    } else {
      playTone(300 + (10 - rank) * 20, 'sine', 0, 0.3, 0.3);
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const playBeep = (freq, duration, type = 'sine') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export default function PresenterView() {
  const [gameState, setGameState] = useState({ Status: 'WAITING', Current_Question_No: 1 });
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [localStartTime, setLocalStartTime] = useState(null);
  const [trapWinner, setTrapWinner] = useState(null);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial fetch and subscription
  useEffect(() => {
    const fetchInitial = async () => {
      const state = await api.getState();
      setGameState(state);
    };
    fetchInitial();

    const unsubscribe = api.subscribeToState((newState) => {
      setGameState(newState);
      if (!newState.Trap_Active) {
        setTrapWinner(null);
      }
    });

    const unsubscribeScores = api.subscribeToScores((newScore) => {
      if (newScore.question_no === 999 && newScore.answered_option === 'A') {
        setTrapWinner((prev) => {
          if (!prev) return newScore.combined_name;
          return prev;
        });
      }
    });

    return () => {
      if(unsubscribe) unsubscribe();
      if(unsubscribeScores) unsubscribeScores();
    };
  }, []);

  // Sync questions and users based on state changes
  useEffect(() => {
    const syncData = async () => {
      if (gameState.Active_Session_ID && (questions.length === 0 || gameState.Active_Session_ID !== activeSessionId)) {
        const qs = await api.getQuestions(gameState.Active_Session_ID);
        setQuestions(qs);
        setActiveSessionId(gameState.Active_Session_ID);
      }

      if (gameState.Status === 'WAITING') {
        const data = await api.getJoinedCount();
        setTotalUsers(data.count || 0);
      }

      if (gameState.Status === 'LEADERBOARD' || gameState.Status === 'COMBINED') {
        if (gameState.Status === 'COMBINED') {
          const clb = await api.getCombinedLeaderboard();
          setLeaderboard(clb);
        } else {
          const lb = await api.getLeaderboard(gameState.Active_Session_ID);
          setLeaderboard(lb);
        }
      }
    };
    syncData();
  }, [gameState.Status, gameState.Active_Session_ID, gameState.Current_Question_No, gameState.Leaderboard_Page, activeSessionId, questions.length]);


  useEffect(() => {
    if (gameState.Status === 'QUESTION_ACTIVE') {
      setLocalStartTime(prev => prev || Date.now());
    } else {
      setLocalStartTime(null);
    }
  }, [gameState.Status, gameState.Current_Question_No]);

  useEffect(() => {
    let countdownInterval;
    if (gameState.Status === 'QUESTION_ACTIVE' || gameState.Status === 'WAITING') {
      countdownInterval = setInterval(() => {
        let startTime;
        if (gameState.Status === 'QUESTION_ACTIVE') {
           startTime = localStartTime || (gameState.Start_Time ? new Date(gameState.Start_Time).getTime() : Date.now());
        } else {
           startTime = gameState.Start_Time ? new Date(gameState.Start_Time).getTime() : Date.now();
        }
        
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const totalTime = Number(gameState.Timer_Value) || 0;
        const remaining = Math.max(0, Math.ceil(totalTime - elapsed));
        setTimeLeft(remaining);
      }, 500);
    } else {
      setTimeLeft(0);
    }
    return () => clearInterval(countdownInterval);
  }, [gameState.Status, gameState.Start_Time, gameState.Timer_Value, localStartTime]);

  const prevTimeLeft = useRef(null);
  useEffect(() => {
    if ((gameState.Status === 'QUESTION_ACTIVE' || gameState.Status === 'WAITING') && Number(gameState.Timer_Value) > 0) {
      if (prevTimeLeft.current !== null && timeLeft !== prevTimeLeft.current) {
        if (timeLeft === 3 || timeLeft === 2 || timeLeft === 1) {
          playBeep(800, 0.2);
        } else if (timeLeft === 0 && prevTimeLeft.current > 0) {
          playBeep(300, 1.0, 'square');
        }
      }
      prevTimeLeft.current = timeLeft;
    } else {
      prevTimeLeft.current = null;
    }
  }, [timeLeft, gameState.Status, gameState.Timer_Value]);

  const bgMusicRef = useRef(null);
  useEffect(() => {
    bgMusicRef.current = new Audio('/jack_sparrow.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (gameState.Play_Music === true) {
      if (bgMusicRef.current && bgMusicRef.current.paused) {
        bgMusicRef.current.play().catch(e => console.error("Audio play blocked", e));
      }
    } else {
      if (bgMusicRef.current && !bgMusicRef.current.paused) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
      }
    }
  }, [gameState.Play_Music]);


  // Determine what to display
  let displayQuestion = null;
  if (gameState.Trap_Active) {
    displayQuestion = {
      Question: gameState.Trap_Question,
      Option_A: gameState.Trap_A,
      Option_B: gameState.Trap_B,
      Option_C: gameState.Trap_C,
      Option_D: gameState.Trap_D,
      Correct_Option: null // No correct option in a trap
    };
  } else {
    displayQuestion = questions.find(q => String(q.Question_No) === String(gameState.Current_Question_No));
  }

  // --- Leaderboard logic ---
  const page = gameState.Leaderboard_Page || 1;
  const pageSize = 10;
  const startIdx = (page - 1) * pageSize;
  const visibleLeaderboard = leaderboard.slice(startIdx, startIdx + pageSize);

  const [revealedCount, setRevealedCount] = useState(() => {
    const stored = sessionStorage.getItem('revealedScores');
    return stored ? parseInt(stored, 10) : 0;
  });

  useEffect(() => {
    if (gameState.Status === 'LEADERBOARD' || gameState.Status === 'COMBINED') {
       const targetReveal = pageSize - (gameState.Leaderboard_Reveal - 1);
       const targetCount = Math.max(0, Math.min(pageSize, targetReveal));
       
       if (targetCount > revealedCount) {
          setRevealedCount(targetCount);
          const newlyRevealedRank = startIdx + pageSize - targetCount + 1;
          
          if (newlyRevealedRank === 1 && visibleLeaderboard.length > 0) {
             playCelebrationSound(1); // Winner
          } else if (newlyRevealedRank === 2) {
             playCelebrationSound(2); 
          } else if (newlyRevealedRank === 3) {
             playCelebrationSound(3); 
          } else {
             playCelebrationSound(newlyRevealedRank); // Generic pop for others
          }
       }
       sessionStorage.setItem('revealedScores', revealedCount.toString());
    } else {
       sessionStorage.setItem('revealedScores', '0');
    }
  }, [revealedCount, gameState.Status, startIdx, visibleLeaderboard, gameState.Leaderboard_Reveal, pageSize]);

  const showWinnerConfetti = (gameState.Status === 'LEADERBOARD' || gameState.Status === 'COMBINED') && 
                              page === 1 && revealedCount >= 1 && visibleLeaderboard.length > 0;

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Global Logos (Top Left) */}
      <div className="absolute top-6 left-6 flex items-center gap-6 z-50">
        <img src="/Lentera.png" alt="Lentera Logo" className="h-16 object-contain drop-shadow-xl" />
        <img src="/Logo_HCGA.png" alt="HCGA Logo" className="h-16 object-contain drop-shadow-xl" />
      </div>

      {showWinnerConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={800} gravity={0.15} />}

      <div className="w-full max-w-5xl z-10">
      
      {gameState.Play_Music && (
          <div className="absolute top-4 right-4 flex items-center gap-2 text-poster-cyan bg-white/10 px-4 py-2 rounded-full glass-panel">
              <Volume2 className="animate-pulse" size={20} />
              <span className="text-sm font-medium">BGM Playing</span>
          </div>
      )}

      <main className="w-full flex-grow flex flex-col items-center justify-center space-y-8">
        
        {gameState.Status === 'WAITING' && (
          <div className="text-center w-full animate-fade-in-up">
            <h1 className="text-6xl font-black mb-6 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
               HCGA SHARING SESSION
            </h1>
            <p className="text-2xl text-poster-cyan font-semibold tracking-widest mb-12 uppercase">
               Learn, Share, Grow Together
            </p>
            
            <div className="glass-panel p-12 rounded-3xl inline-block shadow-2xl relative border border-white/20">
               <div className="absolute inset-0 bg-gradient-to-br from-poster-blue-light/20 to-poster-red/20 rounded-3xl pointer-events-none"></div>
               <p className="text-2xl text-gray-300 mb-6 font-medium relative z-10">Join at <span className="text-white font-bold tracking-wider">hcga.vercel.app</span></p>
               {gameState.Active_Session_ID && (
                  <div className="text-7xl font-black tracking-widest text-poster-cyan mb-8 relative z-10">
                    {gameState.Active_Session_ID}
                  </div>
               )}
               {gameState.Show_Player_Count !== false && (
                  <div className="flex items-center justify-center gap-3 text-3xl font-bold bg-white/10 py-4 px-8 rounded-full border border-white/20 relative z-10">
                     <span className="text-white">Participants Joined:</span>
                     <span className="text-poster-red-bright animate-score-pop">{totalUsers}</span>
                  </div>
               )}
            </div>
            
            {Number(gameState.Timer_Value) > 0 && (
                <div className="mt-12">
                   <div className="text-2xl text-gray-400 mb-2 font-medium">Starting in</div>
                   <div className="text-6xl font-black text-poster-red-bright animate-pulse">{timeLeft}</div>
                </div>
            )}
          </div>
        )}

        {(gameState.Status === 'QUESTION_ACTIVE' || gameState.Status === 'ANSWER_REVEAL') && (
          displayQuestion ? (
            <div className="w-full flex flex-col items-center animate-fade-in-up">

            <div className="w-full flex justify-between items-center mb-8 px-8">
              <div className="text-3xl font-black text-white bg-white/10 px-6 py-2 rounded-full border border-white/20 glass-panel">
                 {gameState.Trap_Active ? '⚠️ JEBAKAN' : `Q${gameState.Current_Question_No}`}
              </div>
              <div className={`text-6xl font-black ${timeLeft <= 3 ? 'text-poster-red-bright animate-pulse' : 'text-white'}`}>
                {timeLeft}
              </div>
            </div>
            
            {gameState.Trap_Active && trapWinner ? (
              <div className="flex flex-col items-center justify-center animate-pop-in my-16 bg-poster-red-bright/20 border-4 border-poster-red-bright p-12 rounded-3xl backdrop-blur-md shadow-[0_0_50px_rgba(255,59,75,0.5)]">
                 <h2 className="text-4xl text-white font-bold mb-4 uppercase tracking-widest text-center">GOTCHA!</h2>
                 <p className="text-2xl text-gray-200 mb-8 text-center">The first person to fall for the trap is:</p>
                 <div className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-poster-cyan to-white drop-shadow-2xl text-center">
                    {trapWinner}
                 </div>
              </div>
            ) : (
              <h2 className="text-5xl font-bold text-center mb-16 leading-tight max-w-4xl px-4 drop-shadow-lg">
                {displayQuestion.Question}
              </h2>
            )}

            {!trapWinner && (
              <div className="grid grid-cols-2 gap-6 w-full max-w-5xl px-4">
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const text = displayQuestion[`Option_${opt}`];
                  if (!text) return null;
                
                let isCorrect = displayQuestion.Correct_Option === opt;
                let showReveal = gameState.Status === 'ANSWER_REVEAL' && !gameState.Trap_Active; // No reveal for traps
                
                let bgColor = 'bg-white/10 border-white/20';
                let opacity = 'opacity-100';
                
                if (showReveal) {
                   if (isCorrect) {
                      bgColor = 'bg-green-600 border-green-400 shadow-xl';
                   } else {
                      opacity = 'opacity-40';
                   }
                }

                return (
                  <div key={opt} className={`glass-panel border p-8 rounded-2xl flex items-center transition-all duration-500 ${bgColor} ${opacity}`}>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mr-6 shrink-0">
                      {opt}
                    </div>
                    <div className="text-3xl font-medium break-words w-full">{text}</div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
          ) : (
            <div className="text-center w-full animate-fade-in-up mt-20">
              <div className="inline-block glass-panel p-8 rounded-3xl border border-white/20">
                 <h2 className="text-4xl text-white font-bold mb-4">Loading Question...</h2>
                 <p className="text-xl text-gray-400">Please make sure questions are available for this session.</p>
              </div>
            </div>
          )
        )}

        {(gameState.Status === 'LEADERBOARD' || gameState.Status === 'COMBINED') && (
          <div className="w-full max-w-4xl animate-fade-in-up">
            <div className="text-center mb-12">
              <Trophy size={80} className="mx-auto text-poster-cyan mb-6" />
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-poster-cyan to-blue-400 tracking-wider uppercase drop-shadow-md">
                {gameState.Status === 'COMBINED' ? 'Global Leaderboard' : 'Session Leaderboard'}
              </h2>
              <p className="text-xl text-gray-400 mt-2">Page {page}</p>
            </div>

            <div className="space-y-4">
              {visibleLeaderboard.map((user, index) => {
                 const rank = startIdx + index + 1;
                 const isRevealed = (pageSize - index) <= revealedCount;
                 
                 // Styling for top 3
                 let rankStyle = "bg-white/10 text-white";
                 let rowStyle = "glass-panel";
                 let nameStyle = "text-white";
                 
                 if (rank === 1) { rankStyle = "bg-yellow-500 text-yellow-900 shadow-lg"; rowStyle = "glass-panel bg-yellow-900/40 border-yellow-500/50"; nameStyle = "text-yellow-400 font-bold"; }
                 else if (rank === 2) { rankStyle = "bg-gray-300 text-gray-800 shadow-lg"; rowStyle = "glass-panel bg-gray-800/60 border-gray-400/50"; nameStyle = "text-gray-300 font-bold"; }
                 else if (rank === 3) { rankStyle = "bg-amber-700 text-amber-100 shadow-lg"; rowStyle = "glass-panel bg-amber-900/40 border-amber-700/50"; nameStyle = "text-amber-500 font-bold"; }

                 return (
                  <div 
                    key={user.name} 
                    className={`${rowStyle} border p-5 rounded-2xl flex items-center justify-between transition-all duration-500 transform ${isRevealed ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 absolute pointer-events-none'}`}
                    style={{ transitionDelay: isRevealed ? '0ms' : '0ms' }}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black ${rankStyle}`}>
                        {rank}
                      </div>
                      <div className={`text-3xl ${nameStyle}`}>{user.name}</div>
                    </div>
                    <div className="text-4xl font-black text-white drop-shadow-md">
                      {user.points.toLocaleString()}
                    </div>
                  </div>
                );
              })}
              
              {visibleLeaderboard.length === 0 && (
                  <div className="text-center text-gray-400 text-2xl mt-12">No scores available yet.</div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
