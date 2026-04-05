import React, { useState, createContext, useContext, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FlaskConical, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';

/* ───── Theme Context ───── */
interface ThemeCtx { dark: boolean; toggle: () => void; collapsed: boolean; toggleSidebar: () => void }
const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {}, collapsed: false, toggleSidebar: () => {} });
export const useTheme = () => useContext(ThemeContext);

/* ───── Global Theme Provider (wrap once in App) ───── */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dark, setDark] = useState(() => {
        try { return localStorage.getItem('raati-dark-mode') === 'true'; } catch { return false; }
    });
    const [collapsed, setCollapsed] = useState(false);

    const toggle = () => setDark(d => {
        const next = !d;
        try { localStorage.setItem('raati-dark-mode', String(next)); } catch {}
        return next;
    });
    const toggleSidebar = () => setCollapsed(c => !c);

    // Sync dark mode class on <html> for global CSS access
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
    }, [dark]);

    return (
        <ThemeContext.Provider value={{ dark, toggle, collapsed, toggleSidebar }}>
            {children}
        </ThemeContext.Provider>
    );
};

interface LayoutProps { children: React.ReactNode; title: string }

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
    const { dark, toggle, collapsed, toggleSidebar } = useTheme();
    const navigate = useNavigate();

    const bg     = dark ? 'bg-[#0f1117]' : 'bg-gray-50';
    const cardBg = dark ? 'bg-[#181b23]' : 'bg-white';
    const text   = dark ? 'text-gray-100' : 'text-gray-900';
    const border = dark ? 'border-gray-700/50' : 'border-gray-200';

    return (
        <div className={`flex h-screen ${bg} ${text} transition-colors duration-300`}>

            {/* ─── Sidebar ─── */}
            <aside className={`relative ${collapsed ? 'w-16' : 'w-64'} ${dark ? 'bg-[#12141c]' : 'bg-[#1a237e]'} text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
                {/* Top: Logo */}
                <div className={`flex items-center ${collapsed ? 'justify-center py-4' : 'px-5 py-4'}`}>
                    <div
                        className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${collapsed ? 'justify-center w-full' : ''}`}
                        onClick={() => navigate('/landing')}
                        title="Go to Landing Page"
                    >
                        <img src="/logo.svg" alt="raati.ai logo" className="w-8 h-8 brightness-0 invert shrink-0" />
                        {!collapsed && (
                            <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
                                raati.ai
                            </h1>
                        )}
                    </div>
                </div>

                {/* Floating Collapse Toggler */}
                <button
                    onClick={toggleSidebar}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={`absolute -right-3 top-6 p-1 rounded-full shadow-md border transition-all z-50 ${dark ? 'bg-[#181b23] border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800' : 'bg-white border-gray-200 text-[#1a237e] hover:bg-gray-50'}`}
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Nav */}
                <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-4'} space-y-1 mt-2`}>
                    {[
                        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { to: '/evaluate', icon: FlaskConical, label: 'Run Evaluation' },
                        { to: '/history', icon: Users, label: 'Submissions' },
                    ].map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                                `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`
                            }
                        >
                            <Icon size={20} />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom spacer (settings removed) */}
                <div className="pb-4" />
            </aside>

            {/* ─── Main Content ─── */}
            <main className="flex-1 flex flex-col overflow-hidden transition-colors duration-300">
                {/* Header */}
                <header className={`h-14 ${cardBg} ${border} border-b flex items-center justify-between px-6 transition-colors duration-300`}>
                    <h2 className={`text-lg font-semibold ${dark ? 'text-gray-100' : 'text-gray-800'}`}>{title}</h2>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggle}
                            className={`p-1.5 rounded-lg transition-colors ${dark ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            title={dark ? 'Light mode' : 'Dark mode'}
                        >
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className={`flex-1 overflow-auto p-6 ${bg} transition-colors duration-300`}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
