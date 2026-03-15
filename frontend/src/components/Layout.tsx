import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PieChart, Users, Settings, Bell } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
    return (
        <div className="flex h-screen bg-gray-50 text-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1a237e] text-white flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold tracking-tight">C.ai</h1>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`
                        }
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/history"
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`
                        }
                    >
                        <Users size={20} />
                        <span>Submissions</span>
                    </NavLink>

                    <NavLink
                        to="/analytics"
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`
                        }
                    >
                        <PieChart size={20} />
                        <span>Analytics</span>
                    </NavLink>
                </nav>

                <div className="p-4">
                    <button className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors w-full px-4 py-2">
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden text-gray-900 bg-white">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

                    <div className="flex items-center space-x-6">
                        <button className="text-gray-400 hover:text-gray-600 relative">
                            <Bell size={20} />
                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
                                <img src="https://ui-avatars.com/api/?name=Jalal+Ghaffar&background=0D8ABC&color=fff" alt="Profile" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Jalal Ghaffar</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-8 bg-gray-50">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
