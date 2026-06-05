import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/Layout';
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import Dashboard from './pages/Dashboard';
import Evaluate from './pages/Evaluate';
import Results from './pages/Results';
import History from './pages/History';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen font-sans transition-colors duration-300">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/evaluate" element={<Evaluate />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
