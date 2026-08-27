import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Trophy } from 'lucide-react';

export default function ParticipantPlay() {
  const [gameState, setGameState] = useState({ Status: 'WAITING' });
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState(false);
  const lastQuestionNoRef = useRef(0);
  const [score, setScore] = useState(0); 
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
      return;
    }

    const fetchInitial = async () => {
      const state = await api.getState();
      setGameState(state);
    };
    fetchInitial();

    const unsubscribe = api.subscribeToState((newState) => {
      setGameState(prev => {
        if (newState.Current_Question_No !== prev.Current_Question_No || newState.Trap_Active !== prev.Trap_Active) {
          setAnswered(false); // Reset answered if question or trap state changes
        }
        return newState;
      });
    });

    return () => {
      if(unsubscribe) unsubscribe();
    };
  }, [participantName, navigate]);

  useEffect(() => {
    if (gameState.Active_Session_ID && (questions.length === 0 || gameState.Active_Session_ID !== activeSessionId)) {
      api.getQuestions(gameState.Active_Session_ID).then(qs => {
        setQuestions(qs);
        setActiveSessionId(gameState.Active_Session_ID);
      });
    }
  }, [gameState.Active_Session_ID, activeSessionId, questions.length]);

  const handleAnswer = async (option) => {
    if (answered || gameState.Status !== 'QUESTION_ACTIVE') return;
    setAnswered(true);
    
    let isCorrect = false;
    let points = 0;
    const startTime = localStartTime || (gameState.Start_Time ? new Date(gameState.Start_Time).getTime() : Date.now());
    const now = Date.now();
    const responseTimeSecs = Math.max(0, (now - startTime) / 1000);

    if (!gameState.Trap_Active) {
      const currentQ = questions.find(q => q.Question_No == gameState.Current_Question_No);
      if (!currentQ) return;
      
      isCorrect = option === currentQ.Correct_Option;
      
      if (isCorrect) {
         const responseTimeMs = now - startTime;
         let calcPoints = 1000 - (responseTimeMs / 25);
         points = Math.max(500, Math.round(calcPoints));
      }
    }
    
    setScore(prev => prev + points);
    
    await api.submitAnswer({
      sessionId: gameState.Active_Session_ID,
      combinedName: participantName,
      questionNo: gameState.Trap_Active ? 999 : gameState.Current_Question_No, // 999 for traps to separate data
      answeredOption: option,
      responseTime: parseFloat(responseTimeSecs.toFixed(2)),
      isCorrect: isCorrect,
      points: points
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-poster-blue-light/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-poster-red-bright/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="animate-fade-in-up glass-panel p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10 border border-white/10 flex flex-col items-center">
        
        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <img src="/Lentera.png" alt="Lentera Logo" className="h-10 object-contain" />
          <img src="/Logo_HCGA.png" alt="HCGA Logo" className="h-10 object-contain" />
        </div>

        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">{participantName}</h2>
        <div className="text-poster-cyan font-bold mb-8 text-xl tracking-wider">
          SCORE <span key={score} className="inline-block animate-score-pop ml-2">{score}</span>
        </div>

        {(gameState.Status === 'WAITING' || gameState.Status === 'FINISHED') && (
          <div className="bg-black/30 rounded-2xl py-12 px-4 border border-poster-cyan/30 backdrop-blur-sm shadow-md">
            <h3 className="text-3xl font-black text-white mb-3 drop-shadow-md">YOU'RE IN!</h3>
            <p className="text-gray-300 font-medium">Waiting for the captain to start the game...</p>
          </div>
        )}

        {gameState.Status === 'QUESTION_ACTIVE' && (() => {
          let displayQuestion = null;
          if (gameState.Trap_Active) {
            displayQuestion = {
              Question: gameState.Trap_Question,
              Option_A: gameState.Trap_A,
              Option_B: gameState.Trap_B,
              Option_C: gameState.Trap_C,
              Option_D: gameState.Trap_D
            };
          } else {
            displayQuestion = questions.find(q => q.Question_No == gameState.Current_Question_No);
          }

          return (
            <div className="space-y-6 animate-pop-in w-full">
              <div className="text-3xl sm:text-4xl font-black text-white mb-2 animate-fade-in-up drop-shadow-md">
                {answered ? "ANSWER RECORDED!" : "READY?"}
              </div>
              {displayQuestion && (
                <div className="text-lg sm:text-xl font-medium text-gray-200 mb-6 px-2 break-words whitespace-normal leading-relaxed">
                  {displayQuestion.Question}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 sm:gap-5 w-full">
                  <button 
                    onClick={() => handleAnswer('A')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-300 bg-gradient-to-br from-red-600 to-poster-red min-h-[140px] rounded-2xl text-white font-bold shadow-[0_8px_0_0_rgba(153,0,0,1)] active:shadow-none active:translate-y-[8px] border border-red-400/50 flex flex-col items-center justify-center p-3 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                    <span className="text-4xl sm:text-5xl mb-2 drop-shadow-md">A</span>
                    <span className="text-sm sm:text-base px-2 break-words leading-tight w-full font-medium">{displayQuestion?.Option_A || ''}</span>
                  </button>
                  <button 
                    onClick={() => handleAnswer('B')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-300 bg-gradient-to-br from-blue-500 to-poster-blue-light min-h-[140px] rounded-2xl text-white font-bold shadow-[0_8px_0_0_rgba(9,23,69,1)] active:shadow-none active:translate-y-[8px] border border-blue-400/50 flex flex-col items-center justify-center p-3 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                    <span className="text-4xl sm:text-5xl mb-2 drop-shadow-md">B</span>
                    <span className="text-sm sm:text-base px-2 break-words leading-tight w-full font-medium">{displayQuestion?.Option_B || ''}</span>
                  </button>
                  <button 
                    onClick={() => handleAnswer('C')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-300 bg-gradient-to-br from-yellow-500 to-yellow-600 min-h-[140px] rounded-2xl text-white font-bold shadow-[0_8px_0_0_rgba(161,98,7,1)] active:shadow-none active:translate-y-[8px] border border-yellow-400/50 flex flex-col items-center justify-center p-3 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                    <span className="text-4xl sm:text-5xl mb-2 drop-shadow-md">C</span>
                    <span className="text-sm sm:text-base px-2 break-words leading-tight w-full font-medium">{displayQuestion?.Option_C || ''}</span>
                  </button>
                  <button 
                    onClick={() => handleAnswer('D')} 
                    disabled={answered}
                    className={`${answered ? 'opacity-50' : 'hover:scale-105 active:scale-95'} transition-all duration-300 bg-gradient-to-br from-green-500 to-emerald-600 min-h-[140px] rounded-2xl text-white font-bold shadow-[0_8px_0_0_rgba(6,78,59,1)] active:shadow-none active:translate-y-[8px] border border-green-400/50 flex flex-col items-center justify-center p-3 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                    <span className="text-4xl sm:text-5xl mb-2 drop-shadow-md">D</span>
                    <span className="text-sm sm:text-base px-2 break-words leading-tight w-full font-medium">{displayQuestion?.Option_D || ''}</span>
                  </button>
              </div>
            </div>
          );
        })()}

        {(gameState.Status === 'LEADERBOARD' || gameState.Status === 'COMBINED') && (
           <div className="py-12 animate-fade-in-up flex flex-col items-center">
             <div className="w-20 h-20 bg-gradient-to-br from-poster-cyan to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Trophy size={40} className="text-white" />
             </div>
             <h3 className="text-3xl font-black text-white mb-2 drop-shadow-md">LOOK AT THE BIG SCREEN!</h3>
             <p className="text-poster-cyan tracking-widest uppercase font-semibold">Leaderboard Time</p>
           </div>
        )}
      </div>
    </div>
  );
}
