
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Providers from './components/Providers';
import Resolved from './components/Resolved';
import Massive from './components/Massive';
import Degradations from './components/Degradations';
import AuthPage from './components/AuthPage';
import ProjectSettings from './components/ProjectSettings';
import Metrics from './components/Metrics';
import Message from './components/Message';
import AgentNexus from './components/AgentNexus';
import AgentNexusVoice from './components/AgentNexusVoice';
import KnowledgeBase from './components/KnowledgeBase'; // NEW IMPORT
import { Loader2, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // WELCOME STATE
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');

  // State to handle direct navigation to a specific inventory item
  const [targetNetworkId, setTargetNetworkId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check for OAuth redirect return
      if (session && localStorage.getItem('auth_in_progress') === 'true') {
        // Consume the flag
        localStorage.removeItem('auth_in_progress');
        // Trigger Welcome
        triggerWelcomeSequence(session);
      }
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth Event: ${event}`);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Keep-Alive: Periodically check session to prevent expiration
  useEffect(() => {
    if (!session) return;

    const keepAliveInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);
      }
    }, 1000 * 60 * 15); // Every 15 minutes

    return () => clearInterval(keepAliveInterval);
  }, [session]);

  // Centralized function to start simple welcome message
  const triggerWelcomeSequence = (currentSession: any) => {
    // 1. Set User Name immediate
    let name = 'Analista';
    if (currentSession && currentSession.user) {
      name = currentSession.user.user_metadata?.first_name || currentSession.user.email?.split('@')[0] || 'Analista';
    }
    setUserName(name);

    // 2. Show Welcome Overlay IMMEDIATELY
    setShowWelcome(true);

    // 3. Navigate to dashboard in background so it's ready
    setActiveTab('dashboard');

    // 4. Hide overlay after 2 seconds
    setTimeout(() => {
      setShowWelcome(false);
      // Force session refresh just in case
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    }, 2500);
  };

  // Called when clicking "Inventory" on a Failure Card
  const handleNavigateToInventory = (networkId: string) => {
    setTargetNetworkId(networkId);
    setActiveTab('inventory');
  };

  // Called when clicking items in Sidebar
  const handleSidebarNavigation = (tab: string) => {
    if (tab === 'inventory') {
      setTargetNetworkId(null);
    }
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-blue-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // === WELCOME OVERLAY COMPONENT (Simple & Static) ===
  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center text-white font-sans animate-in fade-in duration-300">

        {/* Subtle Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* Logo */}
          <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(37,99,235,0.5)] mb-8 border border-blue-500/30">
            <svg viewBox="0 0 24 24" className="w-14 h-14 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 12L19 5" />
              <path d="M12 12L5 5" />
              <path d="M12 12L5 19" />
              <path d="M12 12L19 19" />
              <circle cx="5" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </div>

          {/* Text */}
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            SOMMER <span className="text-zinc-500">NETWORK NEXUS</span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p className="text-xl text-blue-400 font-medium">Bienvenido, {userName}</p>
            <div className="flex items-center gap-2 mt-4 text-zinc-500 text-xs uppercase tracking-widest font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Inicializando Dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logic to determine what to render
  const isPublicTab = activeTab === 'dashboard';
  const showContent = (isPublicTab || session) && activeTab !== 'login';

  const implementedTabs = ['dashboard', 'inventory', 'providers', 'resolved', 'massive', 'settings', 'metrics', 'message', 'agent', 'voice-mode', 'kb', 'degradations'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 transition-colors duration-300">
      <Sidebar activeTab={activeTab} setActiveTab={handleSidebarNavigation} />

      <main className="pb-20 md:pb-0 md:pl-16 transition-all duration-300">
        <div className="max-w-[1920px] mx-auto min-h-screen flex flex-col">

          {showContent ? (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  onNavigateToInventory={handleNavigateToInventory}
                  onNavigateToLogin={() => setActiveTab('login')}
                />
              )}
              {activeTab === 'inventory' && (
                <Inventory targetNetworkId={targetNetworkId} />
              )}
              {activeTab === 'providers' && (
                <Providers />
              )}
              {activeTab === 'resolved' && (
                <Resolved />
              )}
              {activeTab === 'massive' && (
                <Massive />
              )}
              {activeTab === 'degradations' && (
                <Degradations
                  onNavigateToDashboard={() => setActiveTab('dashboard')}
                  onNavigateToMassive={() => setActiveTab('massive')}
                />
              )}
              {activeTab === 'settings' && (
                <ProjectSettings onClose={() => setActiveTab('dashboard')} />
              )}
              {activeTab === 'metrics' && (
                <Metrics />
              )}
              {activeTab === 'message' && (
                <Message />
              )}
              {activeTab === 'agent' && (
                <AgentNexus />
              )}
              {activeTab === 'voice-mode' && (
                <AgentNexusVoice />
              )}
              {activeTab === 'kb' && (
                <KnowledgeBase />
              )}

              {!implementedTabs.includes(activeTab) && (
                <div className="flex flex-col items-center justify-center flex-1 h-[calc(100vh-4rem)] text-zinc-500 animate-in fade-in duration-500">
                  <div className="text-4xl mb-4 opacity-20 font-bold uppercase">{activeTab}</div>
                  <p>Módulo en construcción</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-300">
              {activeTab !== 'login' && (
                <div className="max-w-md w-full text-center mb-8 bg-white dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-none">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-4">
                    <Lock className="w-6 h-6 text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                    Acceso Restringido
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    El módulo <span className="text-zinc-800 dark:text-white font-mono font-bold uppercase tracking-wider">{activeTab}</span> requiere credenciales.
                  </p>
                </div>
              )}

              <div className="w-full max-w-md">
                <AuthPage onLoginSuccess={triggerWelcomeSequence} />
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
