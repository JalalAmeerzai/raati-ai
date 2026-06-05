import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BrainCircuit, 
    Zap, 
    ArrowRight, 
    Target, 
    BarChart3, 
    Network, 
    Sun, 
    Moon, 
    Users, 
    ImagePlus, 
    FileCheck
} from 'lucide-react';
import { OpenAIIcon, XAIIcon, ClaudeIcon } from '../components/LLMIcons';

// Constellation nodes for the animated SVG background
const CONSTELLATION_NODES = [
    // Scattered across the viewport — x, y in viewBox coords (0-1400 x 0-900)
    { cx: 120, cy: 80, r: 2.5, delay: 0 },
    { cx: 350, cy: 150, r: 1.8, delay: 0.5 },
    { cx: 580, cy: 60, r: 3, delay: 1 },
    { cx: 800, cy: 200, r: 2, delay: 1.5 },
    { cx: 1050, cy: 100, r: 2.8, delay: 0.3 },
    { cx: 1280, cy: 180, r: 1.5, delay: 0.8 },
    { cx: 200, cy: 350, r: 2, delay: 1.2 },
    { cx: 450, cy: 420, r: 3.2, delay: 0.7 },
    { cx: 700, cy: 380, r: 1.8, delay: 1.8 },
    { cx: 950, cy: 450, r: 2.5, delay: 0.2 },
    { cx: 1200, cy: 380, r: 2, delay: 1.3 },
    { cx: 100, cy: 600, r: 2.8, delay: 0.9 },
    { cx: 330, cy: 680, r: 1.5, delay: 1.6 },
    { cx: 560, cy: 620, r: 3, delay: 0.4 },
    { cx: 780, cy: 700, r: 2.2, delay: 1.1 },
    { cx: 1020, cy: 640, r: 1.8, delay: 0.6 },
    { cx: 1300, cy: 580, r: 2.5, delay: 1.4 },
    { cx: 180, cy: 820, r: 2, delay: 0.1 },
    { cx: 650, cy: 850, r: 2.8, delay: 1.7 },
    { cx: 1100, cy: 800, r: 1.5, delay: 0.5 },
    { cx: 420, cy: 250, r: 1.2, delay: 2.0 },
    { cx: 880, cy: 550, r: 1.8, delay: 1.9 },
    { cx: 1350, cy: 420, r: 2.2, delay: 0.8 },
    { cx: 60, cy: 480, r: 1.5, delay: 1.0 },
];

// Connections between node indices
const CONSTELLATION_EDGES: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [6, 7], [7, 8], [8, 9], [9, 10],
    [11, 12], [12, 13], [13, 14], [14, 15], [15, 16],
    [17, 18], [18, 19],
    // Cross connections for depth
    [0, 6], [1, 7], [2, 8], [3, 9], [4, 10],
    [6, 11], [7, 13], [8, 14], [9, 15],
    [12, 17], [13, 18], [15, 19],
    [20, 1], [20, 7], [21, 9], [21, 14],
    [22, 5], [22, 10], [23, 6], [23, 11],
];

const SynapticBackground: React.FC = () => {
    const { dark } = useTheme();
    const nodeColor = dark ? 'rgba(96, 165, 250, 0.7)' : 'rgba(26, 35, 126, 0.35)';
    const edgeColor = dark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(26, 35, 126, 0.08)';
    const glowColor = dark ? 'rgba(99, 102, 241, 0.6)' : 'rgba(26, 35, 126, 0.4)';

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className={`absolute inset-0 ${dark ? 'bg-[#0b0d12]' : 'bg-white'}`} />

            {/* Soft Ambient Orbs */}
            <motion.div
                animate={{ x: [0, 40, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className={`absolute -top-40 -right-40 w-[45rem] h-[45rem] rounded-full blur-[140px] ${dark ? 'bg-blue-600/10' : 'bg-blue-400/10'}`}
            />
            <motion.div
                animate={{ x: [0, -60, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className={`absolute -bottom-60 -left-60 w-[55rem] h-[55rem] rounded-full blur-[140px] ${dark ? 'bg-indigo-600/10' : 'bg-indigo-400/10'}`}
            />

            {/* Animated Constellation SVG */}
            <svg
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1400 900"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    {/* Glow filter for nodes */}
                    <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    {/* Pulsing gradient for edges */}
                    <linearGradient id="edgePulse" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={glowColor} stopOpacity="0" />
                        <stop offset="50%" stopColor={glowColor} stopOpacity="1">
                            <animate attributeName="offset" values="0;0.5;1" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Constellation edges (connecting lines) */}
                {CONSTELLATION_EDGES.map(([from, to], i) => {
                    const a = CONSTELLATION_NODES[from];
                    const b = CONSTELLATION_NODES[to];
                    return (
                        <motion.line
                            key={`edge-${i}`}
                            x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                            stroke={edgeColor}
                            strokeWidth="1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{
                                duration: 4 + (i % 3),
                                delay: (i * 0.15) % 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    );
                })}

                {/* Constellation nodes (dots) with floating animation */}
                {CONSTELLATION_NODES.map((node, i) => (
                    <motion.circle
                        key={`node-${i}`}
                        cx={node.cx}
                        cy={node.cy}
                        r={node.r}
                        fill={nodeColor}
                        filter="url(#nodeGlow)"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0.4, 1, 0.4],
                            cx: [node.cx, node.cx + (i % 2 === 0 ? 8 : -8), node.cx],
                            cy: [node.cy, node.cy + (i % 3 === 0 ? 6 : -6), node.cy],
                        }}
                        transition={{
                            duration: 6 + (i % 4),
                            delay: node.delay,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                ))}

                {/* Traveling light pulses along select edges */}
                {[0, 5, 10, 15, 20, 25, 30].map((edgeIdx) => {
                    if (edgeIdx >= CONSTELLATION_EDGES.length) return null;
                    const [from, to] = CONSTELLATION_EDGES[edgeIdx];
                    const a = CONSTELLATION_NODES[from];
                    const b = CONSTELLATION_NODES[to];
                    return (
                        <circle key={`pulse-${edgeIdx}`} r="2" fill={glowColor} opacity="0.8">
                            <animateMotion
                                dur={`${3 + (edgeIdx % 3)}s`}
                                repeatCount="indefinite"
                                path={`M${a.cx},${a.cy} L${b.cx},${b.cy}`}
                            />
                            <animate attributeName="opacity" values="0;0.9;0" dur={`${3 + (edgeIdx % 3)}s`} repeatCount="indefinite" />
                        </circle>
                    );
                })}
            </svg>

            {/* Premium Gradient Overlays for Depth */}
            <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-tr from-[#0b0d12] via-transparent to-[#0b0d12]/80' : 'bg-gradient-to-tr from-white via-transparent to-white/70'}`} />
            <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-transparent via-transparent to-[#0b0d12]' : 'bg-gradient-to-b from-transparent via-transparent to-white'}`} />
        </div>
    );
};

// ─── Pipeline Wizard Component ───
interface PipelineStep {
    num: string;
    title: string;
    desc: string;
    icon: React.FC<{ size?: number; className?: string }>;
    color: string;
    bg: string;
}

const PipelineWizard: React.FC<{ steps: PipelineStep[]; dark: boolean; sub: string }> = ({ steps, dark, sub }) => {
    const PHASE_DURATION = 3000; // 3s per phase
    const TICK_INTERVAL = 50;
    const TICKS_PER_PHASE = PHASE_DURATION / TICK_INTERVAL; // 60 ticks per phase

    const [tick, setTick] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, TICK_INTERVAL);
        return () => clearInterval(interval);
    }, [isPaused]);

    // Derive activePhase and progress from the single tick counter
    const activePhase = Math.floor(tick / TICKS_PER_PHASE) % steps.length;
    const progress = ((tick % TICKS_PER_PHASE) / TICKS_PER_PHASE) * 100;

    const handleClick = (idx: number) => {
        setTick(idx * TICKS_PER_PHASE);
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 5000); // Resume after 5s
    };

    const ActiveIcon = steps[activePhase].icon;

    return (
        <section className="snap-start h-screen shrink-0 flex flex-col justify-center py-20 px-6 relative overflow-hidden">
            <div className="max-w-7xl mx-auto w-full">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-10"
                >
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-5 ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}><Zap size={12} /> The Pulse Pipeline</div>
                    <h2 className={`text-4xl sm:text-6xl font-black tracking-tight mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>High-Fidelity <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-600">Workflow.</span></h2>
                </motion.div>

                {/* Progress Bar */}
                <div className={`relative h-1.5 rounded-full mb-8 overflow-hidden ${dark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <motion.div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${((activePhase) / steps.length) * 100 + (progress / steps.length)}%` }}
                    />
                </div>

                {/* Pipeline Nodes */}
                <div className="relative">
                    {/* Horizontal beam (desktop) */}
                    <div className={`absolute top-8 left-[5%] right-[5%] h-0.5 z-0 hidden lg:block ${dark ? 'bg-white/5' : 'bg-black/5'}`}>
                        {/* Animated glow pulse traveling along beam */}
                        <motion.div
                            className="absolute top-0 h-full w-32 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent rounded-full"
                            animate={{ left: ['-10%', '110%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                        {steps.map((step, idx) => {
                            const isActive = idx === activePhase;
                            const isPast = idx < activePhase;
                            const StepIcon = step.icon;

                            return (
                                <motion.div 
                                    key={idx}
                                    onClick={() => handleClick(idx)}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.08 }}
                                    className="cursor-pointer"
                                >
                                    {/* Node dot */}
                                    <div className="flex justify-center mb-4 relative">
                                        <motion.div 
                                            animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                                isActive 
                                                    ? `${step.bg} ${step.color} shadow-xl ring-2 ring-offset-2 ${dark ? 'ring-blue-500/50 ring-offset-[#0b0d12]' : 'ring-blue-500/30 ring-offset-white'} scale-110`
                                                    : isPast
                                                        ? `${step.bg} ${step.color} opacity-60`
                                                        : `${dark ? 'bg-white/5 text-white/20' : 'bg-gray-100 text-gray-300'}`
                                            }`}
                                        >
                                            <StepIcon size={28} />
                                        </motion.div>
                                    </div>

                                    {/* Card */}
                                    <motion.div 
                                        animate={{ 
                                            height: isActive ? 'auto' : 'auto',
                                        }}
                                        className={`p-6 rounded-2xl border transition-all duration-500 ${
                                            isActive 
                                                ? `${dark ? 'bg-gradient-to-b from-blue-500/10 to-indigo-500/5 border-blue-500/30' : 'bg-gradient-to-b from-blue-50 to-indigo-50 border-blue-200 shadow-xl shadow-blue-900/5'}`
                                                : `${dark ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-white/50 border-black/5 hover:border-black/10'}`
                                        }`}
                                    >
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1.5 transition-colors duration-500 ${
                                            isActive ? (dark ? 'text-blue-400' : 'text-blue-600') : (dark ? 'text-white/20' : 'text-gray-300')
                                        }`}>Phase {step.num}</div>
                                        <h3 className={`text-base font-black mb-2 leading-tight transition-colors duration-500 ${
                                            isActive ? (dark ? 'text-white' : 'text-gray-900') : (dark ? 'text-white/40' : 'text-gray-400')
                                        }`}>{step.title}</h3>
                                        
                                        <AnimatePresence>
                                            {isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <p className={`text-xs leading-relaxed ${sub}`}>{step.desc}</p>
                                                    {/* Phase progress mini-bar */}
                                                    <div className={`mt-3 h-1 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-black/10'}`}>
                                                        <motion.div 
                                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Active Phase Detail Strip */}
                <motion.div 
                    key={activePhase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-8 p-5 rounded-2xl border flex items-center gap-6 ${dark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-black/5 shadow-lg'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${steps[activePhase].bg} ${steps[activePhase].color}`}>
                        <ActiveIcon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-black uppercase tracking-widest ${dark ? 'text-blue-400' : 'text-blue-600'}`}>Currently Processing — Phase {steps[activePhase].num}</div>
                        <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{steps[activePhase].title}: {steps[activePhase].desc}</p>
                    </div>
                    <div className="flex gap-1.5">
                        {steps.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activePhase ? 'bg-blue-500 scale-125' : i < activePhase ? 'bg-blue-500/40' : (dark ? 'bg-white/10' : 'bg-black/10')}`} />
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const { dark, toggle } = useTheme();

    const sub = dark ? 'text-gray-400' : 'text-gray-600';

    const steps = [
        { 
            num: '01', 
            title: 'Concept Input', 
            desc: 'Submit your design problem and sketches to our neural intake engine.',
            icon: ImagePlus,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        { 
            num: '02', 
            title: 'Expert Recruitment', 
            desc: 'The system scouts and deploys three specialized expert personas tailored to your domain.',
            icon: Users,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        { 
            num: '03', 
            title: 'Multi-Agent Evaluation', 
            desc: 'Parallel assessment of your design across technical and qualitative dimensions.',
            icon: BrainCircuit,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10'
        },
        { 
            num: '04', 
            title: 'Statistical Analysis', 
            desc: 'Cross-verification of scores to ensure mathematical reliability and consensus.',
            icon: BarChart3,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        { 
            num: '05', 
            title: 'Integrative Report', 
            desc: 'Final delivery of a creative diagnostic with actionable professional feedback.',
            icon: FileCheck,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
    ];

    return (
        <div className={`relative h-screen overflow-hidden ${dark ? 'text-white' : 'text-[#1a237e]'}`}>
            <SynapticBackground />

            {/* ─── Navigation ─── */}
            <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 backdrop-blur-3xl border-b transition-all ${dark ? 'border-white/5 bg-[#0b0d12]/40' : 'border-black/5 bg-white/40'}`}>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <img src="/logo.svg" alt="raati.ai logo" className={`w-8 h-8 ${dark ? 'brightness-0 invert' : ''}`} />
                    <span className={`text-2xl font-black tracking-tighter ${dark ? 'text-white' : 'text-[#1a237e]'}`}>raati.ai</span>
                </div>
                
                <div className="flex items-center gap-6">
                        <button
                            onClick={toggle}
                            className={`p-1.5 rounded-lg transition-colors ${dark ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            title={dark ? 'Light mode' : 'Dark mode'}
                        >
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className={`px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-2xl active:scale-95 ${dark ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20' : 'bg-[#1a237e] text-white hover:bg-[#151b60] shadow-[#1a237e]/20'}`}
                    >
                        Open Dashboard
                    </button>
                </div>
            </nav>

            {/* ─── SCROLL SNAP CONTAINER ─── */}
            <div className="h-full overflow-y-scroll snap-y snap-mandatory relative z-10 scroll-smooth">
                
                {/* 1. Hero Section */}
                <section className="snap-start h-screen shrink-0 flex flex-col items-center justify-center pt-20 px-6 text-center relative">
                    <div className="max-w-5xl mx-auto">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-12 shadow-sm ${dark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}
                        >
                            <BrainCircuit size={14} /> Intelligence Powered Creativity
                        </motion.div>
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`text-7xl sm:text-9xl font-black tracking-tight mb-10 leading-[0.85] ${dark ? 'text-white' : 'text-[#1a237e]'}`}
                        >
                            Objective Evaluation <br />
                            <span className="relative inline-block mt-4">
                                Of Design.
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ delay: 0.8, duration: 1 }}
                                    className="absolute -bottom-2 left-0 h-4 bg-blue-500/30 -z-10 rounded-full"
                                />
                            </span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className={`text-xl ${sub} max-w-2xl mx-auto mb-16 leading-relaxed`}
                        >
                            The industry's first multi-agent AI framework for objective design assessment and qualitative creativity analysis.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-6"
                        >
                            <button 
                                onClick={() => navigate('/evaluate')}
                                className={`group px-12 py-6 rounded-3xl text-xl font-black transition-all flex items-center gap-4 shadow-2xl hover:shadow-blue-500/20 active:scale-95 ${dark ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-[#1a237e] text-white hover:bg-[#151b60]'}`}
                            >
                                Begin Creative Assessment <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button 
                                onClick={() => navigate('/how-it-works')}
                                className={`px-12 py-6 rounded-3xl text-xl font-bold transition-all border shadow-lg hover:shadow-xl active:scale-95 ${dark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-black/5 hover:bg-gray-50 text-gray-900'}`}
                            >
                                How it works
                            </button>
                        </motion.div>
                    </div>
                    {/* Mouse Scroll Indicator */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className={`w-6 h-10 rounded-full border-2 flex items-start justify-center p-2 ${dark ? 'border-white/20' : 'border-black/20'}`}>
                            <div className={`w-1 h-2 rounded-full ${dark ? 'bg-white/50' : 'bg-black/50'}`} />
                        </motion.div>
                    </div>
                </section>

                {/* 2. Dynamic Expert Synthesis Section */}
                <section className="snap-start h-screen shrink-0 flex items-center justify-center py-20 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                            <motion.div initial={{ x: -50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}><Zap size={12} /> The Recruiter Agent</div>
                                <h2 className={`text-4xl sm:text-6xl font-black tracking-tight mb-8 ${dark ? 'text-white' : 'text-gray-900'}`}>Dynamic Expert <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">Synthesis.</span></h2>
                                <p className={`text-lg ${sub} mb-12 leading-relaxed`}>Our system analyzes your project problem and dynamically generates three professional personas specifically qualified to judge your unique domain with unprecedented accuracy.</p>
                                
                                <div className="space-y-4">
                                    {[
                                        { title: 'Specialized Persona Generation', desc: 'Context-aware recruitment of AI experts.' },
                                        { title: 'Eliminate Professional Bias', desc: 'Objective, data-driven creative critique.' },
                                        { title: 'Domain-Specific Expertise', desc: 'From architecture to UI/UX, we find your match.' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex gap-6 items-start">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${dark ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                <Target size={18} />
                                            </div>
                                            <div>
                                                <h4 className={`text-base font-black ${dark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>
                                                <p className={`text-xs ${sub}`}>{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Premium Multi-Ring Orbital System */}
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                viewport={{ once: true }}
                                className="relative flex items-center justify-center"
                            >
                                {/* SVG for connection beams + particles */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 420" fill="none">
                                    <defs>
                                        <radialGradient id="rippleGrad">
                                            <stop offset="0%" stopColor={dark ? 'rgba(99,102,241,0.3)' : 'rgba(26,35,126,0.2)'} />
                                            <stop offset="100%" stopColor="transparent" />
                                        </radialGradient>
                                        <linearGradient id="beam1" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                                            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="beam2" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                                            <stop offset="50%" stopColor="#f97316" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="beam3" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                                            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    
                                    {/* Energy ripple from center */}
                                    <motion.circle cx="210" cy="210" r="60" fill="url(#rippleGrad)"
                                        animate={{ r: [60, 140, 60], opacity: [0.6, 0, 0.6] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
                                    />
                                    <motion.circle cx="210" cy="210" r="60" fill="url(#rippleGrad)"
                                        animate={{ r: [60, 140, 60], opacity: [0.4, 0, 0.4] }}
                                        transition={{ duration: 4, delay: 2, repeat: Infinity, ease: "easeOut" }}
                                    />

                                    {/* Pulsing connection beams: center to each LLM position */}
                                    {/* To OpenAI (top) */}
                                    <motion.line x1="210" y1="170" x2="210" y2="45" stroke="url(#beam1)" strokeWidth="2"
                                        animate={{ opacity: [0, 0.8, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                                    />
                                    {/* To Claude (bottom-left) */}
                                    <motion.line x1="185" y1="230" x2="75" y2="340" stroke="url(#beam2)" strokeWidth="2"
                                        animate={{ opacity: [0, 0.8, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                                    />
                                    {/* To xAI (bottom-right) */}
                                    <motion.line x1="235" y1="230" x2="345" y2="340" stroke="url(#beam3)" strokeWidth="2"
                                        animate={{ opacity: [0, 0.8, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, delay: 2 }}
                                    />

                                    {/* Data-stream particles traveling to center */}
                                    {/* OpenAI -> center */}
                                    <circle r="3" fill="#10a37f" opacity="0.9">
                                        <animateMotion dur="2.5s" repeatCount="indefinite" path="M210,40 L210,175" />
                                        <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" />
                                    </circle>
                                    <circle r="2" fill="#10a37f" opacity="0.6">
                                        <animateMotion dur="2.5s" repeatCount="indefinite" path="M215,45 L212,175" begin="0.8s" />
                                        <animate attributeName="opacity" values="0;0.7;0.7;0" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
                                    </circle>
                                    {/* Claude -> center */}
                                    <circle r="3" fill="#f97316" opacity="0.9">
                                        <animateMotion dur="2.8s" repeatCount="indefinite" path="M70,345 L190,220" />
                                        <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" repeatCount="indefinite" />
                                    </circle>
                                    <circle r="2" fill="#f97316" opacity="0.6">
                                        <animateMotion dur="2.8s" repeatCount="indefinite" path="M75,340 L192,222" begin="1s" />
                                        <animate attributeName="opacity" values="0;0.7;0.7;0" dur="2.8s" repeatCount="indefinite" begin="1s" />
                                    </circle>
                                    {/* xAI -> center */}
                                    <circle r="3" fill={dark ? "#a78bfa" : "#7c3aed"} opacity="0.9">
                                        <animateMotion dur="2.6s" repeatCount="indefinite" path="M350,345 L230,220" />
                                        <animate attributeName="opacity" values="0;1;1;0" dur="2.6s" repeatCount="indefinite" />
                                    </circle>
                                    <circle r="2" fill={dark ? "#a78bfa" : "#7c3aed"} opacity="0.6">
                                        <animateMotion dur="2.6s" repeatCount="indefinite" path="M345,340 L228,222" begin="0.9s" />
                                        <animate attributeName="opacity" values="0;0.7;0.7;0" dur="2.6s" repeatCount="indefinite" begin="0.9s" />
                                    </circle>
                                </svg>

                                {/* Outer decorative ring */}
                                <motion.div 
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                    className={`absolute w-[28rem] h-[28rem] rounded-full border ${dark ? 'border-white/5' : 'border-black/5'}`}
                                />

                                {/* Main orbit ring */}
                                <div className={`w-[24rem] h-[24rem] rounded-full border-2 border-dashed relative flex items-center justify-center ${dark ? 'border-white/10' : 'border-[#1a237e]/10'}`}>
                                    {/* Inner decorative ring */}
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                        className={`absolute w-[16rem] h-[16rem] rounded-full border ${dark ? 'border-blue-500/10' : 'border-blue-300/20'}`}
                                    />

                                    {/* Central Intelligence Hub */}
                                    <div className={`w-44 h-44 rounded-[3rem] flex flex-col items-center justify-center text-center relative z-20 shadow-4xl border ${dark ? 'bg-[#151921] border-white/10' : 'bg-white border-black/5'}`}>
                                        <motion.div 
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-2xl shadow-blue-500/30"
                                        >
                                            <BrainCircuit size={36} className="text-white" />
                                        </motion.div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${dark ? 'text-blue-400' : 'text-blue-700'} mb-0.5`}>Verified</span>
                                        <span className={`text-xs font-black tracking-tight leading-tight ${dark ? 'text-white' : 'text-gray-900'}`}>Professional Synthesis</span>
                                    </div>

                                    {/* Rotating Orbit Container */}
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0"
                                    >
                                        {/* OpenAI (Top) */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <motion.div 
                                                animate={{ rotate: -360 }}
                                                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                                className="flex flex-col items-center gap-1.5"
                                            >
                                                <div className="relative">
                                                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-emerald-500/20 border border-gray-100 overflow-hidden p-3">
                                                        <OpenAIIcon size={30} className="text-[#10a37f]" />
                                                    </div>
                                                    <motion.div 
                                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"
                                                    />
                                                </div>
                                                <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md ${dark ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'}`}>GPT</span>
                                            </motion.div>
                                        </div>

                                        {/* Claude (Bottom Left) */}
                                        <div className="absolute bottom-[12%] left-[12%] -translate-x-1/2 translate-y-1/2">
                                            <motion.div 
                                                animate={{ rotate: -360 }}
                                                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                                className="flex flex-col items-center gap-1.5"
                                            >
                                                <div className="relative">
                                                    <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/30 p-3">
                                                        <ClaudeIcon size={30} className="text-white" />
                                                    </div>
                                                    <motion.div 
                                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                                                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange-400 border-2 border-white"
                                                    />
                                                </div>
                                                <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md ${dark ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'}`}>Claude</span>
                                            </motion.div>
                                        </div>

                                        {/* xAI (Bottom Right) */}
                                        <div className="absolute bottom-[12%] right-[12%] translate-x-1/2 translate-y-1/2">
                                            <motion.div 
                                                animate={{ rotate: -360 }}
                                                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                                className="flex flex-col items-center gap-1.5"
                                            >
                                                <div className="relative">
                                                    <div className="w-16 h-16 rounded-full bg-gray-950 flex items-center justify-center shadow-2xl shadow-purple-500/20 p-3">
                                                        <XAIIcon size={30} className="text-white" />
                                                    </div>
                                                    <motion.div 
                                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
                                                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 border-white"
                                                    />
                                                </div>
                                                <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md ${dark ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'}`}>Grok</span>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* 3. Animated Pipeline Wizard Section */}
                <PipelineWizard steps={steps} dark={dark} sub={sub} />

                {/* 4. Footer Section */}
                <section className="snap-start h-screen shrink-0 flex items-center justify-center bg-[#0a0c10] text-white relative">
                    {/* Minimalist Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                        <Network size={800} className="absolute -bottom-40 -right-40 text-blue-500" />
                    </div>

                    <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                        <div className="flex items-center justify-center gap-4 mb-12">
                            <img src="/logo.svg" alt="raati.ai logo" className="w-16 h-16 brightness-0 invert" />
                            <span className="text-5xl font-black tracking-tighter">raati.ai</span>
                        </div>
                        <h2 className="text-5xl sm:text-7xl font-black mb-12 leading-tight">Elevating Creativity <br />Through Scientific Audit.</h2>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
                            <button 
                                onClick={() => navigate('/evaluate')}
                                className="px-12 py-6 rounded-3xl bg-blue-500 text-white text-xl font-black transition-all hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20"
                            >
                                Get Started Now
                            </button>
                        </div>
                        
                        <div className="pt-16 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500 gap-8">
                            <div className="flex gap-12">
                                <a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
                                <a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a>
                            </div>
                            <div className="text-center sm:text-right">
                                Research by University of Oulu <br />
                                © 2026 Raati AI. All rights reserved.
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Landing;
