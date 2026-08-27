import { supabase } from './supabaseClient';

export const api = {
  getUsers: async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error("Error fetching users", error);
    return data || [];
  },
  
  getQuestions: async (sessionId = '') => {
    let query = supabase.from('questions').select('*');
    if (sessionId) {
      const sessionNum = String(sessionId).replace('Session', '').trim();
      query = query.or(`session_id.eq.${sessionNum},session_id.eq.${sessionId}`);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching questions", error);
      return [];
    }
    
    // Map lowercase Supabase columns to PascalCase to match component expectations
    return data ? data.map(q => ({
      ...q,
      Question_No: q.question_no,
      Question: q.question,
      Option_A: q.option_a,
      Option_B: q.option_b,
      Option_C: q.option_c,
      Option_D: q.option_d,
      Correct_Option: q.correct_option,
      Time_Limit: q.time_limit,
      Session_ID: q.session_id
    })) : [];
  },
  
  getState: async () => {
    const { data, error } = await supabase.from('game_state').select('*').eq('id', 1).single();
    if (error) console.error("Error fetching game state", error);
    return data ? {
      Active_Session_ID: data.active_session_id,
      Current_Question_No: data.current_question_no,
      Status: data.status,
      Start_Time: data.start_time,
      Timer_Value: data.timer_value,
      Leaderboard_Reveal: data.leaderboard_reveal,
      Show_Player_Count: data.show_player_count,
      Play_Music: data.play_music,
      Leaderboard_Page: data.leaderboard_page,
      Trap_Active: data.trap_active,
      Trap_Question: data.trap_question,
      Trap_A: data.trap_a,
      Trap_B: data.trap_b,
      Trap_C: data.trap_c,
      Trap_D: data.trap_d
    } : { Status: 'WAITING' };
  },

  getLeaderboard: async (sessionId) => {
    // Basic summation query isn't natively grouped in basic supabase without RPC, 
    // so we fetch and reduce locally like before
    const { data, error } = await supabase.from('scores').select('combined_name, points').eq('session_id', sessionId);
    if (error) {
        console.error("Error fetching leaderboard", error);
        return [];
    }
    const userPoints = {};
    data.forEach(s => {
      if (!userPoints[s.combined_name]) userPoints[s.combined_name] = 0;
      userPoints[s.combined_name] += Number(s.points || 0);
    });
    let leaderboard = Object.keys(userPoints).map(name => ({
      name: name,
      points: userPoints[name]
    }));
    leaderboard.sort((a, b) => b.points - a.points);
    return leaderboard;
  },

  getCombinedLeaderboard: async () => {
    // Assuming we have a view or we just sum everything across sessions.
    const { data, error } = await supabase.from('scores').select('combined_name, points');
    if (error) return [];
    
    const userPoints = {};
    data.forEach(s => {
      if (!userPoints[s.combined_name]) userPoints[s.combined_name] = 0;
      userPoints[s.combined_name] += Number(s.points || 0);
    });
    let leaderboard = Object.keys(userPoints).map(name => ({
      name: name,
      points: userPoints[name]
    }));
    leaderboard.sort((a, b) => b.points - a.points);
    return leaderboard;
  },
  
  updateState: async (state) => {
    const payload = {
        active_session_id: state.Active_Session_ID,
        current_question_no: state.Current_Question_No,
        status: state.Status,
        start_time: state.Start_Time,
        timer_value: state.Timer_Value,
        leaderboard_reveal: state.Leaderboard_Reveal,
        show_player_count: state.Show_Player_Count,
        play_music: state.Play_Music,
        leaderboard_page: state.Leaderboard_Page,
        trap_active: state.Trap_Active,
        trap_question: state.Trap_Question,
        trap_a: state.Trap_A,
        trap_b: state.Trap_B,
        trap_c: state.Trap_C,
        trap_d: state.Trap_D
    };
    // Clean undefined values
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase.from('game_state').update(payload).eq('id', 1);
    if (error) console.error("Error updating state", error);
    return { success: !error };
  },
  
  submitAnswer: async (answer) => {
    const { error } = await supabase.from('scores').insert([{
        session_id: answer.sessionId,
        combined_name: answer.combinedName,
        question_no: answer.questionNo,
        answered_option: answer.answeredOption,
        is_correct: answer.isCorrect,
        response_time: answer.responseTime,
        points: answer.points
    }]);
    if (error) console.error("Error submitting answer", error);
    return { success: !error };
  },
  
  joinSession: async (name) => {
    const { error } = await supabase.from('joined_users').insert([{ name }]);
    if (error) console.error("Error joining session", error);
    return { success: !error };
  },

  getJoinedCount: async () => {
    const { data, error } = await supabase.from('joined_users').select('name');
    if (error) {
        console.error("Error getting joined count", error);
        return { count: 0 };
    }
    const uniqueNames = new Set(data.map(d => d.name));
    return { count: uniqueNames.size };
  },
  
  addUser: async (user) => {
    const { error } = await supabase.from('users').insert([{
        id: user.id || new Date().getTime(),
        name: user.name,
        dept: user.dept,
        sbu: user.sbu,
        nik: user.nik,
        combined: user.combined
    }]);
    if (error) console.error("Error adding user", error);
    return { success: !error };
  },

  subscribeToState: (callback) => {
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_state',
          filter: 'id=eq.1',
        },
        (payload) => {
          const state = payload.new;
          callback({
            Active_Session_ID: state.active_session_id,
            Current_Question_No: state.current_question_no,
            Status: state.status,
            Start_Time: state.start_time,
            Timer_Value: state.timer_value,
            Leaderboard_Reveal: state.leaderboard_reveal,
            Show_Player_Count: state.show_player_count,
            Play_Music: state.play_music,
            Leaderboard_Page: state.leaderboard_page,
            Trap_Active: state.trap_active,
            Trap_Question: state.trap_question,
            Trap_A: state.trap_a,
            Trap_B: state.trap_b,
            Trap_C: state.trap_c,
            Trap_D: state.trap_d
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToScores: (callback) => {
    const channel = supabase.channel('schema-db-changes-scores')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scores',
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
