import React, { useState, useEffect } from 'react';
import { getUser, clearData } from './services/db';
import { getSession, logout } from './services/auth';
import { UserProfile, ViewState } from './types';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import MealLogView from './views/MealLog';
import Coach from './views/Coach';
import Login from './views/Login';
import Register from './views/Register';
import Layout from './components/Layout';
import Button from './components/Button';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    setLoading(true);
    try {
      // 1. Check if authenticated
      const sessionEmail = getSession();
      
      if (!sessionEmail) {
        // If we are already on register, don't force login
        if (view !== 'REGISTER') {
          setView('LOGIN');
        }
        setUser(null);
        setLoading(false);
        return;
      }

      // 2. Check if user profile exists for this account
      const existingUser = await getUser();
      setUser(existingUser);
      
      if (!existingUser) {
        setView('ONBOARDING');
      } else {
        // Only redirect to Dashboard if we are currently on an auth page or onboarding
        if (view === 'LOGIN' || view === 'REGISTER' || view === 'ONBOARDING') {
          setView('DASHBOARD');
        }
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const handleLogout = () => {
    logout();
    setView('LOGIN');
    setUser(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-emerald-600">Loading BeFit...</div>;

  // Views that don't need user profile
  if (view === 'LOGIN') {
    return <Layout currentView={view} setView={setView}><Login onLogin={checkUser} setView={setView} /></Layout>;
  }

  if (view === 'REGISTER') {
    return <Layout currentView={view} setView={setView}><Register onLogin={checkUser} setView={setView} /></Layout>;
  }

  if (view === 'ONBOARDING') {
    return <Layout currentView={view} setView={setView}><Onboarding onComplete={checkUser} initialData={user} /></Layout>;
  }

  // Settings View
  if (view === 'SETTINGS') {
      return (
          <Layout currentView={view} setView={setView}>
              <div className="space-y-6 animate-in fade-in">
                  <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="font-semibold mb-4">Profile</h3>
                      {user && (
                          <div className="space-y-2 text-slate-600 mb-6">
                              <p>Name: {user.name}</p>
                              <p>Goal: {user.goal}</p>
                              <p>Calories: {user.targetCalories}</p>
                              <p className="text-xs text-slate-400 mt-4">Account: {getSession()}</p>
                          </div>
                      )}
                      <div className="space-y-2">
                        <Button variant="secondary" onClick={() => setView('ONBOARDING')} className="w-full justify-center">
                            Edit Profile
                        </Button>
                        <Button variant="danger" onClick={handleLogout} className="w-full justify-center">
                            Sign Out
                        </Button>
                      </div>
                  </div>
              </div>
          </Layout>
      )
  }

  return (
    <Layout currentView={view} setView={setView}>
      {view === 'DASHBOARD' && user && <Dashboard user={user} setView={setView} />}
      {view === 'LOG_MEAL' && <MealLogView onComplete={() => setView('DASHBOARD')} setView={setView} />}
      {view === 'COACH' && user && <Coach user={user} />}
    </Layout>
  );
};

export default App;