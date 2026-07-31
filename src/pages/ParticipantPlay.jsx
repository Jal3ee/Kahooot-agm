import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ParticipantPlay() {
  const [gameState, setGameState] = useState({ Status: 'WAITING' });
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState(false);
  const lastQuestionNoRef = useRef(0);
  const [score, setScore] = useState(0); // Mock local score
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [localStartTime, setLocalStartTime] = useState(null);
  
  const navigate = useNavigate();
  const participantName = localStorage.getItem('participantName');

  // Capture local start time when question becomes active
  useEffect(() => {
    if (gameState.Status === 'QUESTION_ACTIVE') {
      setLocalStartTime(prev => prev || Date.now());
    } else {
      setLocalStartTime(null);
    }
  }, [gameState.Status, gameState.Current_Question_No]);

  useEffect(() => {
    if (!participantName) {
      navigate('/');
    }
    
    // Adaptive Polling with Jitter
    let timeoutId;
    let isMounted = true;

    const pollState = async () => {
      try {
        const state = await api.getState();
        
        if (!isMounted) return;

        // When question changes, reset answered status
        if (state.Current_Question_No !== lastQuestionNoRef.current) {
           setAnswered(false);
           lastQuestionNoRef.current = state.Current_Question_No;
        }
        
        setGameState(state);
        
        // Fetch questions if we don't have them for this session yet
        if (state.Active_Session_ID && (questions.length === 0 || state.Active_Session_ID !== activeSessionId)) {
          api.getQuestions(state.Active_Session_ID).then(qs => {
            if (isMounted) {
              setQuestions(qs);
              setActiveSessionId(state.Active_Session_ID);
            }
          });
        }

        // Determine polling delay based on game state
        let baseDelay = 5000;
        if (state.Status === 'QUESTION_ACTIVE') {
          // If already answered, we don't need to poll aggressively
          // We just need to know when state changes to LEADERBOARD
          baseDelay = answered ? 4000 : 2500;
        }
        
        // Add random jitter to stagger requests (0 to 1.5 seconds)
        const jitter = Math.floor(Math.random() * 1500);
        
        timeoutId = setTimeout(pollState, baseDelay + jitter);

      } catch(e) {
        console.error("Polling error", e);
        if (isMounted) timeoutId = setTimeout(pollState, 5000); // Retry after 5s on error
      }
    };

    pollState();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [participantName, navigate, questions.length, activeSessionId, answered]);

  const handleAnswer = async (option) => {
    if (answered || gameState.Status !== 'QUESTION_ACTIVE') return;
    setAnswered(true);
    
    const currentQ = questions.find(q => q.Question_No == gameState.Current_Question_No);
    if (!currentQ) return;
    
    // Calculate response time based on local start time
    const startTime = localStartTime || (gameState.Start_Time ? new Date(gameState.Start_Time).getTime() : Date.now());
    const now = Date.now();
    const responseTimeSecs = Math.max(0, (now - startTime) / 1000);
    
    // Calculate points based purely on speed (milliseconds), completely ignoring timer limit.
    const isCorrect = option === currentQ.Correct_Option;
    let points = 0;
    
    if (isCorrect) {
       const responseTimeMs = now - startTime;
       // Base points 1000. Subtract 0.04 points per millisecond (40 points lost per second).
       let calcPoints = 1000 - (responseTimeMs / 25);
       // Pembulatan poin sesuai permintaan
       points = Math.max(500, Math.round(calcPoints));
    }
    
    setScore(prev => prev + points);
    
    await api.submitAnswer({
      sessionId: gameState.Active_Session_ID,
      combinedName: participantName,
      questionNo: gameState.Current_Question_No,
      answeredOption: option,
      responseTime: parseFloat(responseTimeSecs.toFixed(2)),
      isCorrect: isCorrect,
      points: points
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-marine-900 p-4 sm:p-6 text-center">
      <div className="animate-fade-in-up bg-marine-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl border border-gold-500/30 relative overflow-hidden">
        <h2 className="text-xl font-bold text-slate-300 mb-2">{participantName}</h2>
        <div className="text-gold-400 font-bold mb-6 text-lg">
          Score: <span key={score} className="inline-block animate-score-pop">{score}</span>
        </div>

        {(gameState.Status === 'WAITING' || gameState.Status === 'FINISHED') && (
          <div className="animate-pulse-glow bg-marine-700/50 rounded-2xl py-12 px-4 border border-ocean-500/30">
            <h3 className="text-2xl font-bold text-white mb-2">You're in!</h3>
            <p className="text-slate-400">Waiting for the captain to start the game...</p>
          </div>
        )}

        {gameState.Status === 'QUESTION_ACTIVE' && (() => {
          const currentQ = questions.find(q => q.Question_No == gameState.Current_Question_No);
          return (
            <div className="space-y-4 animate-pop-in w-full">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2 animate-fade-in-up">
                {answered ? "Answer Recorded!" : "Ready?"}
              </div>
              {currentQ && (
                <div className="text-lg sm:text-xl font-semibold text-slate-200 mb-6 px-2 break-words whitespace-normal leading-tight">
                  {currentQ.Question_Text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                  <button 
                    onClick={() => handleAnswer('A')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-200 bg-red-500 min-h-[120px] sm:min-h-[140px] rounded-2xl text-white font-bold shadow-[0_6px_0_0_rgba(185,28,28,1)] active:shadow-none active:translate-y-[6px] border-2 border-red-400 flex flex-col items-center justify-center p-2`}
                  >
                    <span className="text-3xl sm:text-4xl mb-1">A</span>
                    <span className="text-sm sm:text-base px-1 break-words leading-tight w-full">{currentQ?.Option_A || ''}</span>
                  </button>
                  <button 
                    onClick={() => handleAnswer('B')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-200 bg-blue-500 min-h-[120px] sm:min-h-[140px] rounded-2xl text-white font-bold shadow-[0_6px_0_0_rgba(29,78,216,1)] active:shadow-none active:translate-y-[6px] border-2 border-blue-400 flex flex-col items-center justify-center p-2`}
                  >
                    <span className="text-3xl sm:text-4xl mb-1">B</span>
                    <span className="text-sm sm:text-base px-1 break-words leading-tight w-full">{currentQ?.Option_B || ''}</span>
                  </button>
                  <button 
                    onClick={() => handleAnswer('C')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-200 bg-yellow-500 min-h-[120px] sm:min-h-[140px] rounded-2xl text-white font-bold shadow-[0_6px_0_0_rgba(180,83,9,1)] active:shadow-none active:translate-y-[6px] border-2 border-yellow-400 flex flex-col items-center justify-center p-2`}
                  >
                    <span className="text-3xl sm:text-4xl mb-1">C</span>
                    <span className="text-sm sm:text-base px-1 break-words leading-tight w-full">{currentQ?.Option_C || ''}</span>
                  </button>
                  <button 
                    onClick={() => handleAnswer('D')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-200 bg-green-500 min-h-[120px] sm:min-h-[140px] rounded-2xl text-white font-bold shadow-[0_6px_0_0_rgba(21,128,61,1)] active:shadow-none active:translate-y-[6px] border-2 border-green-400 flex flex-col items-center justify-center p-2`}
                  >
                    <span className="text-3xl sm:text-4xl mb-1">D</span>
                    <span className="text-sm sm:text-base px-1 break-words leading-tight w-full">{currentQ?.Option_D || ''}</span>
                  </button>
              </div>
            </div>
          );
        })()}

        {gameState.Status === 'LEADERBOARD' && (
           <div className="py-12 animate-fade-in-up">
             <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                <span className="text-marine-900 font-bold text-2xl">🏆</span>
             </div>
             <h3 className="text-2xl font-bold text-gold-400 mb-2">Look at the big screen!</h3>
           </div>
        )}
      </div>
    </div>
  );
}
