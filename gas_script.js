const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'getUsers') {
      return jsonResponse(getUsers());
    } else if (action === 'getQuestions') {
      return jsonResponse(getQuestions(e.parameter.sessionId));
    } else if (action === 'getState') {
      return jsonResponse(getGameState());
    } else if (action === 'getLeaderboard') {
      return jsonResponse(getLeaderboard(e.parameter.sessionId));
    } else if (action === 'getCombinedLeaderboard') {
      return jsonResponse(getCombinedLeaderboard());
    } else if (action === 'getJoinedCount') {
      return jsonResponse(getJoinedCount());
    } else {
      return jsonResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonResponse({ error: "Invalid JSON" });
  }

  const action = body.action;

  try {
    if (action === 'updateState') {
      return jsonResponse(updateGameState(body.state));
    } else if (action === 'submitAnswer') {
      return jsonResponse(submitAnswer(body.answer));
    } else if (action === 'addUser') {
      return jsonResponse(addUser(body.user));
    } else if (action === 'joinSession') {
      return jsonResponse(joinSession(body.name));
    } else {
      return jsonResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Helper Functions ---

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function getUsers() {
  return getSheetData('Users');
}

function getQuestions(sessionId) {
  const all = getSheetData('Questions');
  if (sessionId) {
    return all.filter(q => q.Session_ID === sessionId);
  }
  return all;
}

function getGameState() {
  const data = getSheetData('Game_State');
  if (data.length > 0) return data[0];
  return {};
}

function updateGameState(state) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Game_State');
  sheet.clearContents(); // Clear existing
  const headers = ['Active_Session_ID', 'Current_Question_No', 'Status', 'Start_Time', 'Timer_Value', 'Leaderboard_Reveal', 'Show_Player_Count', 'Play_Music', 'Leaderboard_Page'];
  sheet.appendRow(headers);
  sheet.appendRow([
    state.Active_Session_ID || '',
    state.Current_Question_No || '',
    state.Status || 'WAITING',
    state.Start_Time || '',
    state.Timer_Value || 0,
    state.Leaderboard_Reveal || 10,
    state.Show_Player_Count !== undefined ? state.Show_Player_Count : true,
    state.Play_Music !== undefined ? state.Play_Music : false,
    state.Leaderboard_Page || 1
  ]);
  return { success: true, state };
}

function submitAnswer(answer) {
  // answer = { sessionId, combinedName, questionNo, answeredOption, responseTime, points, isCorrect }
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Scores');
  sheet.appendRow([
    new Date(),
    answer.sessionId,
    answer.combinedName,
    answer.questionNo,
    answer.answeredOption,
    answer.isCorrect,
    answer.responseTime,
    answer.points
  ]);
  return { success: true };
}

function addUser(user) {
  // user = { id, name, dept, sbu, nik, combined }
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
  sheet.appendRow([
    user.id || new Date().getTime(),
    user.name,
    user.dept,
    user.sbu,
    user.nik,
    user.combined
  ]);
  return { success: true };
}

// NEW FUNCTION: Logs a participant when they enter the session
function joinSession(name) {
  let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Joined_Users');
  if (!sheet) {
    // Auto-create if it doesn't exist
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet('Joined_Users');
    sheet.appendRow(['Timestamp', 'Name']);
  }
  sheet.appendRow([new Date(), name]);
  return { success: true };
}

// NEW FUNCTION: Returns the unique count of joined participants
function getJoinedCount() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Joined_Users');
  if (!sheet) return { count: 0 };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { count: 0 };
  
  // Name is in column 2 (index 1)
  const names = data.slice(1).map(row => row[1]);
  // Use Set to only count unique participants even if they click join multiple times
  const uniqueNames = [...new Set(names)];
  return { count: uniqueNames.length };
}

function getLeaderboard(sessionId) {
  const scores = getSheetData('Scores');
  let userPoints = {};
  
  scores.forEach(s => {
    if (s.Session_ID === sessionId) {
      if (!userPoints[s.Combined_Name]) userPoints[s.Combined_Name] = 0;
      userPoints[s.Combined_Name] += Number(s.Points || 0);
    }
  });

  let leaderboard = Object.keys(userPoints).map(name => ({
    name: name,
    points: userPoints[name]
  }));

  leaderboard.sort((a, b) => b.points - a.points);
  return leaderboard; // Return top or all
}

function getCombinedLeaderboard() {
  const scores = getSheetData('Merged_Scores');
  let leaderboard = scores.filter(s => s.Combined_Name).map(s => ({
    name: s.Combined_Name,
    points: Number(s.Total_Points || 0)
  }));
  leaderboard.sort((a, b) => b.points - a.points);
  return leaderboard;
}
