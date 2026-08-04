import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Trophy, Anchor, Volume2 } from 'lucide-react';
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

  // Confetti size
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let timerInterval;

    const pollInterval = setInterval(async () => {
      try {
        const state = await api.getState();
        setGameState(state);

        // Fetch questions if missing or session changed
        if (state.Active_Session_ID && (questions.length === 0 || state.Active_Session_ID !== activeSessionId)) {
          const qs = await api.getQuestions(state.Active_Session_ID);
          setQuestions(qs);
          setActiveSessionId(state.Active_Session_ID);
        }

        // Fetch leaderboard if in leaderboard state
        if (state.Status === 'LEADERBOARD' || state.Status === 'COMBINED') {
          // Use combined leaderboard logic if COMBINED
          if (state.Status === 'COMBINED') {
            const clb = await api.getCombinedLeaderboard();
            setLeaderboard(clb);
          } else {
            const lb = await api.getLeaderboard(state.Active_Session_ID);
            setLeaderboard(lb);
          }
        }

        // Fetch users if in waiting state to show count
        if (state.Status === 'WAITING') {
          const data = await api.getJoinedCount();
          setTotalUsers(data.count || 0);
        }

      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [questions.length, activeSessionId]);

  // Capture local start time when question becomes active
  useEffect(() => {
    if (gameState.Status === 'QUESTION_ACTIVE') {
      setLocalStartTime(prev => prev || Date.now());
    } else {
      setLocalStartTime(null);
    }
  }, [gameState.Status, gameState.Current_Question_No]);

  // Handle local countdown timer
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
    if (gameState.Status === 'WAITING' && Number(gameState.Timer_Value) > 0 && timeLeft > 0) {
      if (bgMusicRef.current && bgMusicRef.current.paused) {
        bgMusicRef.current.play().catch(e => console.error("Audio play blocked", e));
      }
    } else {
      if (bgMusicRef.current && !bgMusicRef.current.paused) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
      }
    }
  }, [gameState.Status, gameState.Timer_Value, timeLeft]);

  const currentQ = questions.find(q => q.Question_No == gameState.Current_Question_No) || null;
  const revealRank = gameState.Leaderboard_Reveal || 10;

  // Track previous revealRank to play sound
  const prevRevealRank = useRef(revealRank);
  useEffect(() => {
    if (gameState.Status === 'COMBINED' || gameState.Status === 'LEADERBOARD') {
      if (revealRank < prevRevealRank.current) {
        if (revealRank === 3) playCelebrationSound(3);
        else if (revealRank === 2) playCelebrationSound(2);
        else if (revealRank === 1) playCelebrationSound(1);
        else playCelebrationSound(revealRank);
      }
    }
    prevRevealRank.current = revealRank;
  }, [revealRank, gameState.Status]);

  // Filter leaderboard to only show items based on reveal rank
  const visibleLeaderboard = leaderboard.slice(0, 10).filter((_, index) => (index + 1) >= revealRank);

  const handleEnableAudio = () => {
    // Just a dummy action to register a user interaction in the browser so AudioContext can resume
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      ctx.resume();
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      <div 
        className="bg-marine-900 text-white flex flex-col relative overflow-hidden shadow-2xl"
        style={{ width: '100%', maxWidth: '177.78vh', aspectRatio: '16/9', containerType: 'size' }}
      >
      {gameState.Status === 'COMBINED' && revealRank <= 1 && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti width={windowSize.width} height={windowSize.height} recycle={true} numberOfPieces={500} />
        </div>
      )}
      <header className="p-6 flex justify-between items-center bg-marine-800 shadow-md border-b border-marine-700 relative z-40">
        <div className="flex items-center gap-4">
          <img src="/logo_agm-.png" alt="AGM Logo" className="h-16 bg-white p-1 rounded" />
          <img src="/Konvensi_Logo.jpeg" alt="Convention Logo" className="h-16 rounded" />
          <button onClick={handleEnableAudio} className="ml-4 p-2 bg-marine-700 hover:bg-marine-600 rounded-full transition-colors" title="Click me once to enable celebration sounds!">
            <Volume2 className="w-6 h-6 text-gold-400" />
          </button>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gold-400 uppercase tracking-widest">Join at: https://s.id/CCAGM</h1>
          <p className="text-xl text-slate-300">Session: <span className="font-bold text-white">{gameState.Active_Session_ID || 'TBA'}</span></p>
        </div>
      </header>

      <main className="flex-1 relative z-40 overflow-hidden">
        {gameState.Status === 'WAITING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <Anchor className={`w-32 h-32 text-gold-500 mx-auto mb-8 ${Number(gameState.Timer_Value) > 0 && timeLeft <= 10 ? 'animate-pulse text-red-500' : 'animate-bounce'}`} />
            <h2 className="text-6xl font-black text-white drop-shadow-lg">Waiting for sailors to board...</h2>
            
            {Number(gameState.Timer_Value) > 0 && (
              <div className={`mt-12 font-black transition-all duration-300 ${
                  timeLeft <= 3 && timeLeft > 0 
                  ? "text-9xl text-red-500 scale-125" 
                  : (timeLeft === 0 ? "text-8xl text-red-600" : "text-7xl text-gold-400")
              }`}>
                {timeLeft > 0 ? timeLeft : "Let's Go!"}
              </div>
            )}

            {totalUsers > 0 && (
              <p className="text-3xl mt-6 font-bold text-slate-300 animate-fade-in-up">
                Total Crew Joined: <span className="text-gold-400">{totalUsers}</span>
              </p>
            )}
          </div>
        )}

        {gameState.Status === 'QUESTION_ACTIVE' && currentQ && (
          <div className="absolute inset-0 flex flex-col p-6 md:p-10 text-center bg-marine-900 overflow-hidden">
            {/* Question Text */}
            <div className="flex-none flex items-start justify-center w-full mb-4" style={{ minHeight: '15%', maxHeight: '40%' }}>
              <h2 className={`font-bold leading-tight break-words w-full overflow-hidden text-ellipsis ${currentQ.Question_Text?.length > 150 ? 'text-2xl md:text-3xl lg:text-4xl' : currentQ.Question_Text?.length > 80 ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-4xl md:text-5xl lg:text-6xl'}`} style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                {currentQ.Question_Text}
              </h2>
            </div>
            
            {/* Options Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4 md:gap-6 min-h-0">
              <div className="flex items-center bg-red-500 p-4 md:p-6 rounded-2xl font-bold shadow-xl border-4 border-red-600 break-words text-left overflow-hidden">
                <span className="mr-4 md:mr-6 opacity-75 shrink-0 text-3xl md:text-5xl">A.</span> 
                <span className={`break-words leading-tight overflow-hidden text-ellipsis ${currentQ.Option_A?.length > 60 ? 'text-lg md:text-xl lg:text-2xl' : 'text-xl md:text-3xl lg:text-4xl'}`} style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{currentQ.Option_A}</span>
              </div>
              <div className="flex items-center bg-blue-500 p-4 md:p-6 rounded-2xl font-bold shadow-xl border-4 border-blue-600 break-words text-left overflow-hidden">
                <span className="mr-4 md:mr-6 opacity-75 shrink-0 text-3xl md:text-5xl">B.</span> 
                <span className={`break-words leading-tight overflow-hidden text-ellipsis ${currentQ.Option_B?.length > 60 ? 'text-lg md:text-xl lg:text-2xl' : 'text-xl md:text-3xl lg:text-4xl'}`} style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{currentQ.Option_B}</span>
              </div>
              <div className="flex items-center bg-yellow-500 p-4 md:p-6 rounded-2xl font-bold shadow-xl border-4 border-yellow-600 break-words text-left overflow-hidden">
                <span className="mr-4 md:mr-6 opacity-75 shrink-0 text-3xl md:text-5xl">C.</span> 
                <span className={`break-words leading-tight overflow-hidden text-ellipsis ${currentQ.Option_C?.length > 60 ? 'text-lg md:text-xl lg:text-2xl' : 'text-xl md:text-3xl lg:text-4xl'}`} style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{currentQ.Option_C}</span>
              </div>
              <div className="flex items-center bg-green-500 p-4 md:p-6 rounded-2xl font-bold shadow-xl border-4 border-green-600 break-words text-left overflow-hidden">
                <span className="mr-4 md:mr-6 opacity-75 shrink-0 text-3xl md:text-5xl">D.</span> 
                <span className={`break-words leading-tight overflow-hidden text-ellipsis ${currentQ.Option_D?.length > 60 ? 'text-lg md:text-xl lg:text-2xl' : 'text-xl md:text-3xl lg:text-4xl'}`} style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{currentQ.Option_D}</span>
              </div>
            </div>

            {/* Timer */}
            {Number(gameState.Timer_Value) > 0 && (
              <div className="flex-none mt-4 flex justify-center items-end" style={{ height: '15%' }}>
                <div className={`font-black transition-all duration-300 text-6xl md:text-8xl lg:text-9xl ${
                    timeLeft <= 3 && timeLeft > 0 
                    ? "text-red-500 scale-125" 
                    : (timeLeft === 0 ? "text-red-600" : "text-gold-400")
                }`}>
                  {timeLeft > 0 ? timeLeft : "Time's Up!"}
                </div>
              </div>
            )}
          </div>
        )}

        {(gameState.Status === 'LEADERBOARD' || gameState.Status === 'COMBINED') && (
          <div className="absolute inset-0 flex items-center justify-center p-8 overflow-hidden">
            <div className="w-full max-w-4xl max-h-full flex flex-col bg-marine-800 rounded-3xl p-8 md:p-12 shadow-2xl border border-gold-500/30 overflow-hidden">
              <h2 className="text-4xl md:text-5xl font-bold text-center text-gold-400 mb-8 md:mb-12 flex justify-center items-center gap-4 flex-none">
                <Trophy className="w-12 h-12 md:w-16 md:h-16" /> {gameState.Status === 'COMBINED' ? 'Final Voyage Standings' : 'Top Sailors'}
              </h2>
              <div className="space-y-4 relative flex-1 overflow-y-auto min-h-0 pr-4 custom-scrollbar">
                {leaderboard.length === 0 ? (
                <p className="text-center text-slate-400 text-2xl">Calculating scores...</p>
              ) : (
                visibleLeaderboard.map((u, index) => {
                  const actualRank = (index + 1) + (revealRank - 1);

                  let styleClass = "bg-marine-700 text-slate-200 border-transparent";
                  let textClass = "text-gold-500";

                  if (actualRank === 1) {
                    styleClass = "bg-gradient-to-r from-yellow-300 to-yellow-600 text-black border-2 border-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.6)] scale-110 z-30 transform";
                    textClass = "text-yellow-900";
                  } else if (actualRank === 2) {
                    styleClass = "bg-gradient-to-r from-slate-300 to-slate-400 text-black border-2 border-white shadow-[0_0_20px_rgba(148,163,184,0.6)] scale-105 z-20 transform";
                    textClass = "text-slate-800";
                  } else if (actualRank === 3) {
                    styleClass = "bg-gradient-to-r from-amber-600 to-amber-700 text-white border-2 border-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.6)] scale-105 z-10 transform";
                    textClass = "text-amber-200";
                  }

                  return (
                    <div key={actualRank} className={`flex justify-between items-center p-3 sm:p-5 rounded-xl text-lg sm:text-xl md:text-2xl font-bold animate-fade-in-up transition-all duration-500 ${styleClass} relative gap-4`} style={{ zIndex: actualRank <= 3 ? 4 - actualRank : 0 }}>
                      <div className="flex gap-2 sm:gap-4 items-center min-w-0 flex-1">
                        <span className={`w-8 sm:w-10 md:w-12 shrink-0 text-xl sm:text-2xl md:text-3xl ${textClass}`}>#{actualRank}</span>
                        <span className="text-xl sm:text-2xl md:text-3xl truncate break-words whitespace-normal leading-tight min-w-0">{u.name || u.combinedName || u.Name}</span>
                      </div>
                      <div className={`text-xl sm:text-2xl md:text-3xl shrink-0 whitespace-nowrap text-right ${actualRank <= 3 ? (actualRank === 3 ? 'text-amber-200' : 'text-black/80') : 'text-gold-400'}`}>
                        {u.points !== undefined ? u.points : (u.score !== undefined ? u.score : (u.totalPoints !== undefined ? u.totalPoints : u.Points))} pts
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
