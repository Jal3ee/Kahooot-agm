import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ParticipantJoin from './pages/ParticipantJoin';
import ParticipantPlay from './pages/ParticipantPlay';
import AdminDashboard from './pages/AdminDashboard';
import PresenterView from './pages/PresenterView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ParticipantJoin />} />
        <Route path="/play" element={<ParticipantPlay />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/presenter" element={<PresenterView />} />
      </Routes>
    </Router>
  );
}

export default App;
