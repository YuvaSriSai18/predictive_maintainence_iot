// Main app component with header and dashboard
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
