import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/Layout';
import { Sparkles, Users, BarChart3, FileText, ArrowRight, Sun, Moon, ChevronRight } from 'lucide-react';
import heroBg from '../assets/hero-bg.png';

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const { dark, toggle } = useTheme();

    const bg = dark ? 'bg-[#0f1117]' : 'bg-gray-50';
    const txt = dark ? 'text-gray-100' : 'text-gray-900';
    const sub = dark ? 'text-gray-400' : 'text-gray-600';
    const cardBg = dark ? 'bg-[#181b23]/80 border-gray-700/50' : 'bg-white/80 border-gray-200';
    const glassBg = dark
        ? 'bg-white/[0.04] backdrop-blur-xl border-white/[0.08]'
        : 'bg-white/60 backdrop-blur-xl border-white/80';

    const features = [
        {
            icon: Users,
            title: 'Multi-Agent Expert Panel',
            description: 'Three AI personas powered by OpenAI, xAI, and Claude evaluate every submission from unique creative perspectives.',
            color: dark ? 'text-blue-400' : 'text-blue-600',
            bg: dark ? 'bg-blue-500/10' : 'bg-blue-50',
        },
        {
            icon: BarChart3,
            title: '6-Dimension Scoring',
            description: 'Creativity, Originality, Usefulness, Clarity, Detail, and Feasibility — each scored and reasoned independently.',
            color: dark ? 'text-purple-400' : 'text-purple-600',
            bg: dark ? 'bg-purple-500/10' : 'bg-purple-50',
        },
        {
            icon: FileText,
            title: 'Statistical Reliability',
            description: 'ICC inter-rater reliability, Kendall\'s W concordance, and variance analysis ensure trustworthy assessments.',
            color: dark ? 'text-emerald-400' : 'text-emerald-600',
            bg: dark ? 'bg-emerald-500/10' : 'bg-emerald-50',
        },
    ];

    const steps = [
        { num: '01', title: 'Upload Your Sketch', desc: 'Drag & drop your design image along with a brief description of your creative intent.' },
        { num: '02', title: 'AI Panel Evaluates', desc: 'Three AI expert personas analyze your work across six creativity dimensions simultaneously.' },
        { num: '03', title: 'Get Detailed Results', desc: 'Receive a comprehensive report with scores, reasoning, instructor feedback, and a downloadable PDF.' },
    ];

    return (
        <div className={`min-h-screen ${bg} ${txt} transition-colors duration-300`}>
            {/* ─── Floating Nav Bar ─── */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300`}>
                <div className={`mx-4 mt-4 rounded-2xl border px-6 py-3 flex items-center justify-between ${glassBg} shadow-lg shadow-black/5`}>
                    <div
                        className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => navigate('/landing')}
                    >
                        <img src="/logo.svg" alt="raati.ai logo" className={`w-8 h-8 ${dark ? 'brightness-0 invert' : ''}`} />
                        <h1 className={`text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-[#1a237e]'}`}>
                            raati.ai
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggle}
                            className={`p-2 rounded-xl transition-colors ${dark ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            title={dark ? 'Light mode' : 'Dark mode'}
                        >
                            {dark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${dark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#1a237e] hover:bg-[#151b60] text-white'} shadow-md hover:shadow-lg`}
                        >
                            Open Platform
                        </button>
                    </div>
                </div>
            </nav>

            {/* ─── Hero Section ─── */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
                {/* Background image */}
                <div className="absolute inset-0 z-0">
                    <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
                    <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-[#0f1117]/60 via-[#0f1117]/30 to-[#0f1117]' : 'bg-gradient-to-b from-gray-50/80 via-gray-50/40 to-gray-50'}`} />
                </div>

                {/* Animated gradient orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
                    <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl animate-pulse ${dark ? 'bg-blue-500/15' : 'bg-blue-400/10'}`} style={{ animationDuration: '4s' }} />
                    <div className={`absolute -bottom-48 -left-48 w-[30rem] h-[30rem] rounded-full blur-3xl animate-pulse ${dark ? 'bg-indigo-600/10' : 'bg-indigo-400/8'}`} style={{ animationDuration: '6s', animationDelay: '2s' }} />
                    <div className={`absolute top-1/3 right-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse ${dark ? 'bg-purple-500/8' : 'bg-purple-400/6'}`} style={{ animationDuration: '5s', animationDelay: '1s' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold tracking-wide mb-8 ${dark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                        <Sparkles size={14} />
                        Powered by Multi-Agent AI
                    </div>

                    <h1 className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
                        AI-Powered{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600">
                            Creativity
                        </span>
                        <br />
                        Assessment
                    </h1>

                    <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${sub}`}>
                        Submit your design sketches and receive comprehensive AI evaluations from a panel of expert personas — scored across six creativity dimensions with statistical reliability analysis.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className={`group px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg hover:shadow-xl ${dark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-[#1a237e] hover:bg-[#151b60] text-white shadow-[#1a237e]/20'}`}
                        >
                            <span className="flex items-center gap-2">
                                Explore the Platform
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                        <button
                            onClick={() => navigate('/evaluate')}
                            className={`group px-8 py-4 rounded-xl text-base font-bold border-2 transition-all ${dark ? 'border-gray-700 text-gray-300 hover:border-blue-500/50 hover:bg-blue-500/5' : 'border-gray-200 text-gray-700 hover:border-[#1a237e]/30 hover:bg-blue-50/50'}`}
                        >
                            <span className="flex items-center gap-2">
                                Run Evaluation
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>

                {/* Bottom fade */}
                <div className={`absolute bottom-0 left-0 right-0 h-32 ${dark ? 'bg-gradient-to-t from-[#0f1117]' : 'bg-gradient-to-t from-gray-50'} z-20`} />
            </section>

            {/* ─── Features Section ─── */}
            <section className="relative z-30 py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                            How It Works
                        </p>
                        <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
                            A Smarter Way to Evaluate Creativity
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className={`group relative rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardBg}`}
                            >
                                {/* Subtle top accent */}
                                <div className={`absolute top-0 left-6 right-6 h-px ${dark ? 'bg-gradient-to-r from-transparent via-blue-500/30 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-300/50 to-transparent'}`} />

                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.bg} ${f.color}`}>
                                    <f.icon size={22} />
                                </div>
                                <h3 className={`text-lg font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>{f.title}</h3>
                                <p className={`text-sm leading-relaxed ${sub}`}>{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Steps Section ─── */}
            <section className={`py-24 px-6 ${dark ? 'bg-[#12141c]' : 'bg-white'}`}>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${dark ? 'text-purple-400' : 'text-purple-600'}`}>
                            Simple Process
                        </p>
                        <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
                            Three Steps to Your Assessment
                        </h2>
                    </div>

                    <div className="space-y-0">
                        {steps.map((step, i) => (
                            <div key={i} className="flex gap-6 items-start">
                                {/* Number + connector */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black ${dark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-[#1a237e]/5 text-[#1a237e] border border-[#1a237e]/10'}`}>
                                        {step.num}
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className={`w-px h-16 my-2 ${dark ? 'bg-gradient-to-b from-blue-500/30 to-transparent' : 'bg-gradient-to-b from-[#1a237e]/20 to-transparent'}`} />
                                    )}
                                </div>
                                {/* Content */}
                                <div className="pt-2 pb-8">
                                    <h3 className={`text-xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>{step.title}</h3>
                                    <p className={`text-sm leading-relaxed ${sub}`}>{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA Section ─── */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-3xl ${dark ? 'bg-blue-600/8' : 'bg-blue-400/5'}`} />
                </div>
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <h2 className={`text-3xl sm:text-4xl font-black tracking-tight mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
                        Ready to Evaluate?
                    </h2>
                    <p className={`text-base mb-8 ${sub}`}>
                        Upload a sketch now and get your comprehensive AI creativity assessment in minutes.
                    </p>
                    <button
                        onClick={() => navigate('/evaluate')}
                        className={`group px-10 py-4 rounded-xl text-base font-bold transition-all shadow-lg hover:shadow-xl ${dark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-[#1a237e] hover:bg-[#151b60] text-white shadow-[#1a237e]/20'}`}
                    >
                        <span className="flex items-center gap-2">
                            Run Evaluation
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className={`py-8 px-6 border-t ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/landing')}>
                        <img src="/logo.svg" alt="raati.ai logo" className={`w-6 h-6 opacity-80 ${dark ? 'brightness-0 invert' : ''}`} />
                        <span className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1a237e]'}`}>raati.ai</span>
                        <span className={`text-xs ml-2 ${sub}`}>— AI Creativity Assessment Platform</span>
                    </div>
                    <p className={`text-xs ${sub}`}>© {new Date().getFullYear()} University of Oulu, Thesis Project.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
