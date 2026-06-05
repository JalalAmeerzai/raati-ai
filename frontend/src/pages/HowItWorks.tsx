import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BrainCircuit, 
    Zap, 
    Target, 
    ShieldCheck, 
    BarChart3, 
    ArrowRight, 
    Users, 
    ChevronRight,
    Search,
    Network,
    Scale,
    LineChart,
    Info,
    Sun,
    Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OpenAIIcon, ClaudeIcon, XAIIcon } from '../components/LLMIcons';
import { useTheme } from '../components/Layout';
import { 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    ResponsiveContainer 
} from 'recharts';

const DEMO_DATA = {
    sketch: [
        { subject: 'Visual Hierarchy', A: 4.2 },
        { subject: 'Information Flow', A: 3.8 },
        { subject: 'Typography', A: 4.5 },
        { subject: 'Consistency', A: 4.0 },
        { subject: 'Interactivity', A: 4.6 },
        { subject: 'Accessibility', A: 4.8 },
    ],
    package: [
        { subject: 'Eco-Efficiency', A: 4.9 },
        { subject: 'Material Durability', A: 1.2 },
        { subject: 'Manufacturability', A: 4.1 },
        { subject: 'User Experience', A: 3.5 },
        { subject: 'Aesthetics', A: 4.8 },
        { subject: 'Cost-Effectiveness', A: 2.1 },
    ]
};

// Constellation Background (shared with Landing)
const CONSTELLATION_NODES = [
    { cx: 120, cy: 80, r: 2, delay: 0 },
    { cx: 350, cy: 150, r: 1.5, delay: 0.5 },
    { cx: 580, cy: 60, r: 2.5, delay: 1 },
    { cx: 800, cy: 200, r: 1.8, delay: 1.5 },
    { cx: 1050, cy: 100, r: 2, delay: 0.3 },
    { cx: 1280, cy: 180, r: 1.5, delay: 0.8 },
    { cx: 200, cy: 350, r: 1.8, delay: 1.2 },
    { cx: 450, cy: 420, r: 2.5, delay: 0.7 },
    { cx: 700, cy: 380, r: 1.5, delay: 1.8 },
    { cx: 950, cy: 450, r: 2, delay: 0.2 },
    { cx: 1200, cy: 380, r: 1.8, delay: 1.3 },
    { cx: 100, cy: 600, r: 2, delay: 0.9 },
    { cx: 330, cy: 680, r: 1.5, delay: 1.6 },
    { cx: 560, cy: 620, r: 2.5, delay: 0.4 },
    { cx: 780, cy: 700, r: 1.8, delay: 1.1 },
    { cx: 1020, cy: 640, r: 1.5, delay: 0.6 },
];

const CONSTELLATION_EDGES: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [6, 7], [7, 8], [8, 9], [9, 10],
    [11, 12], [12, 13], [13, 14], [14, 15],
    [0, 6], [1, 7], [3, 9], [4, 10],
    [6, 11], [7, 13], [9, 15],
];

const ConstellationBackground = ({ dark }: { dark: boolean }) => {
    const nodeColor = dark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(26, 35, 126, 0.25)';
    const edgeColor = dark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(26, 35, 126, 0.06)';

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className={`absolute inset-0 ${dark ? 'bg-[#0a0c10]' : 'bg-[#f8faff]'}`} />
            <motion.div
                animate={{ x: [0, 30, 0], y: [0, 15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className={`absolute -top-40 -right-40 w-[40rem] h-[40rem] rounded-full blur-[140px] ${dark ? 'bg-blue-600/8' : 'bg-blue-400/8'}`}
            />
            <motion.div
                animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className={`absolute -bottom-60 -left-60 w-[50rem] h-[50rem] rounded-full blur-[140px] ${dark ? 'bg-indigo-600/8' : 'bg-indigo-400/8'}`}
            />
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <filter id="hiwNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {CONSTELLATION_EDGES.map(([from, to], i) => {
                    const a = CONSTELLATION_NODES[from];
                    const b = CONSTELLATION_NODES[to];
                    return (
                        <motion.line
                            key={`edge-${i}`}
                            x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                            stroke={edgeColor} strokeWidth="1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 5 + (i % 3), delay: (i * 0.2) % 3, repeat: Infinity, ease: "easeInOut" }}
                        />
                    );
                })}
                {CONSTELLATION_NODES.map((node, i) => (
                    <motion.circle
                        key={`node-${i}`}
                        cx={node.cx} cy={node.cy} r={node.r}
                        fill={nodeColor} filter="url(#hiwNodeGlow)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.8, 0.3], cx: [node.cx, node.cx + (i % 2 === 0 ? 6 : -6), node.cx], cy: [node.cy, node.cy + (i % 3 === 0 ? 4 : -4), node.cy] }}
                        transition={{ duration: 7 + (i % 4), delay: node.delay, repeat: Infinity, ease: "easeInOut" }}
                    />
                ))}
            </svg>
            <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-transparent via-transparent to-[#0a0c10]' : 'bg-gradient-to-b from-transparent via-transparent to-[#f8faff]'}`} />
        </div>
    );
};

// ─── Animated Typing Effect ───
const TypingText: React.FC<{ texts: string[]; dark: boolean }> = ({ texts, dark }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const text = texts[currentIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setDisplayText(text.slice(0, displayText.length + 1));
                if (displayText.length === text.length) {
                    setTimeout(() => setIsDeleting(true), 1500);
                }
            } else {
                setDisplayText(text.slice(0, displayText.length - 1));
                if (displayText.length === 0) {
                    setIsDeleting(false);
                    setCurrentIndex((currentIndex + 1) % texts.length);
                }
            }
        }, isDeleting ? 30 : 60);
        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, currentIndex, texts]);

    return (
        <span className={`font-mono text-sm ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
            {displayText}<span className="animate-pulse">|</span>
        </span>
    );
};

// ─── Animated Counter ───
const AnimatedCounter: React.FC<{ value: number; suffix?: string; dark: boolean }> = ({ value, suffix = '', dark }) => {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        if (!hasStarted) return;
        const duration = 2000;
        const steps = 60;
        const increment = value / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += increment;
            if (current >= value) {
                setCount(value);
                clearInterval(interval);
            } else {
                setCount(current);
            }
        }, duration / steps);
        return () => clearInterval(interval);
    }, [hasStarted, value]);

    return (
        <motion.span 
            onViewportEnter={() => setHasStarted(true)}
            className={`text-5xl font-black ${dark ? 'text-white' : 'text-gray-900'}`}
        >
            {count.toFixed(2)}{suffix}
        </motion.span>
    );
};


const HowItWorks = () => {
    const navigate = useNavigate();
    const { dark, toggle } = useTheme();
    const [demoType, setDemoType] = useState<'sketch' | 'package'>('sketch');
    const [isStepPaused, setIsStepPaused] = useState(false);

    const STEP_DURATION = 5000;
    const TICK_INTERVAL = 50;
    const TICKS_PER_STEP = STEP_DURATION / TICK_INTERVAL; // 100 ticks per step

    const [tick, setTick] = useState(0);

    // Auto-advance steps — single tick counter, no nested state setters
    useEffect(() => {
        if (isStepPaused) return;
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, TICK_INTERVAL);
        return () => clearInterval(interval);
    }, [isStepPaused]);

    // Derive activeStep and stepProgress from the single tick counter
    const activeStep = Math.floor(tick / TICKS_PER_STEP) % 4; // 4 steps
    const stepProgress = ((tick % TICKS_PER_STEP) / TICKS_PER_STEP) * 100;

    const handleStepClick = (idx: number) => {
        setTick(idx * TICKS_PER_STEP);
        setIsStepPaused(true);
        setTimeout(() => setIsStepPaused(false), 8000);
    };

    const steps = [
        {
            title: "Dynamic Expert Recruitment",
            icon: Target,
            desc: "Raati AI doesn't use static prompts. Our Recruiter Agent analyzes your unique design problem to define three specialized professional personas (e.g., 'Sustainability Consultant', 'HCI Researcher', 'Industrial Designer') tailored to your domain.",
            visual: (
                <div className="relative flex items-center justify-center h-full p-8">
                    {/* Central recruiter */}
                    <motion.div 
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className={`w-48 h-48 rounded-[3rem] flex flex-col items-center justify-center border-2 border-dashed p-6 text-center relative z-10 ${dark ? 'border-blue-500/30 bg-blue-500/5' : 'border-indigo-500/20 bg-indigo-50'}`}
                    >
                        <Search size={36} className="text-blue-500 mb-3" />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${dark ? 'text-blue-400' : 'text-indigo-600'}`}>Recruiter Agent</span>
                        <div className="mt-3 w-full">
                            <TypingText 
                                texts={['Sustainability Consultant', 'HCI Researcher', 'Industrial Designer', 'UX Strategist']}
                                dark={dark}
                            />
                        </div>
                    </motion.div>
                    
                    {/* Spawned persona cards */}
                    {[
                        { x: -180, y: -40, label: 'UX Strategist', delay: 0 },
                        { x: 180, y: -40, label: 'Design Engineer', delay: 0.3 },
                        { x: 0, y: 170, label: 'Art Director', delay: 0.6 },
                    ].map((p, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                            animate={{ opacity: 1, scale: 1, x: p.x, y: p.y }}
                            transition={{ delay: p.delay, duration: 0.8, ease: "backOut" }}
                            className={`absolute w-28 h-28 rounded-2xl flex flex-col items-center justify-center border shadow-2xl gap-1 ${dark ? 'bg-[#151921] border-white/10' : 'bg-white border-black/5'}`}
                        >
                            <Users size={24} className="text-blue-500" />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${dark ? 'text-white/50' : 'text-gray-400'}`}>{p.label}</span>
                            <motion.div 
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                                className="w-3 h-3 rounded-full bg-emerald-400"
                            />
                        </motion.div>
                    ))}

                    {/* Connection lines SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 400">
                        {[
                            { x1: 250, y1: 180, x2: 80, y2: 160 },
                            { x1: 250, y1: 180, x2: 420, y2: 160 },
                            { x1: 250, y1: 220, x2: 250, y2: 340 },
                        ].map((line, i) => (
                            <motion.line
                                key={i}
                                {...line}
                                stroke={dark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}
                                strokeWidth="1.5"
                                strokeDasharray="6 4"
                                animate={{ opacity: [0.2, 0.6, 0.2] }}
                                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                            />
                        ))}
                    </svg>
                </div>
            )
        },
        {
            title: "The 3×3 Evaluation Matrix",
            icon: Network,
            desc: "To eliminate model-specific bias, every persona is 'portrayed' by three independent LLM providers simultaneously. This creates a 9-point fan-out grid where OpenAI, Claude, and xAI each evaluate your design from the three specific professional lenses.",
            visual: (
                <div className="relative p-8 h-full flex flex-col items-center justify-center">
                    {/* 3x3 Grid with animated data flow */}
                    <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                        {/* Column headers */}
                        {['UX Strategist', 'Design Engineer', 'Art Director'].map((label, p) => (
                            <div key={`header-${p}`} className={`text-center text-[9px] font-black uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</div>
                        ))}
                        {/* Grid cells */}
                        {[0, 1, 2].map((p) => (
                            [
                                { Icon: OpenAIIcon, color: 'text-[#10a37f]', bg: 'bg-white', label: 'GPT' },
                                { Icon: ClaudeIcon, color: 'text-white', bg: 'bg-orange-500', label: 'Claude' },
                                { Icon: XAIIcon, color: dark ? 'text-white' : 'text-black', bg: dark ? 'bg-white/10' : 'bg-gray-100', label: 'Grok' },
                            ].map((model, m) => (
                                <motion.div 
                                    key={`${p}-${m}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: (p * 0.15) + (m * 0.1) + 0.2 }}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <motion.div 
                                        whileHover={{ scale: 1.1 }}
                                        animate={{ boxShadow: [`0 0 0 0 ${dark ? 'rgba(59,130,246,0)' : 'rgba(59,130,246,0)'}`, `0 0 20px 4px ${dark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'}`, `0 0 0 0 ${dark ? 'rgba(59,130,246,0)' : 'rgba(59,130,246,0)'}`] }}
                                        transition={{ duration: 3, repeat: Infinity, delay: (p * 0.5) + (m * 0.3) }}
                                        className={`w-16 h-16 rounded-xl flex items-center justify-center border shadow-lg ${model.bg} ${dark ? 'border-white/10' : 'border-black/5'}`}
                                    >
                                        <model.Icon size={28} className={model.color} />
                                    </motion.div>
                                    <span className={`text-[8px] font-bold ${dark ? 'text-white/30' : 'text-gray-400'}`}>{model.label}</span>
                                </motion.div>
                            ))
                        ))}
                    </div>
                    <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="mt-6 text-center text-xs font-bold text-blue-500 italic"
                    >
                        9 independent evaluations active
                    </motion.div>
                </div>
            )
        },
        {
            title: "Mathematical Consistency (ICC)",
            icon: Scale,
            desc: "Instead of simple averaging, Raati AI computes the Intraclass Correlation Coefficient (ICC). This measures how consistent the 9 evaluations are. High ICC proves a stable, reliable result; low ICC highlights ambiguity in your design concept.",
            visual: (
                <div className="relative h-full flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-xs space-y-6">
                        {/* Animated ICC Score */}
                        <div className="text-center mb-4">
                            <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Reliability Index</div>
                            <AnimatedCounter value={0.89} dark={dark} />
                        </div>

                        {/* Animated gauge */}
                        <div className="relative">
                            <div className={`h-5 w-full rounded-full overflow-hidden ${dark ? 'bg-white/5' : 'bg-black/5'}`}>
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: '89%' }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 rounded-full relative"
                                >
                                    <motion.div 
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute right-0 top-0 h-full w-8 bg-gradient-to-r from-transparent to-white/30 rounded-r-full"
                                    />
                                </motion.div>
                            </div>
                            {/* Scale markers */}
                            <div className="flex justify-between mt-1.5">
                                {['Poor', 'Fair', 'Good', 'Excellent'].map((label, i) => (
                                    <span key={i} className={`text-[8px] font-bold ${i === 3 ? 'text-blue-500' : (dark ? 'text-white/20' : 'text-gray-300')}`}>{label}</span>
                                ))}
                            </div>
                        </div>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.5 }}
                            className={`p-5 rounded-2xl border ${dark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}
                        >
                            <div className="flex items-center gap-3 mb-2 text-blue-500">
                                <ShieldCheck size={20} />
                                <span className="text-sm font-black uppercase tracking-tighter">Excellent Consensus</span>
                            </div>
                            <p className={`text-xs leading-relaxed ${dark ? 'text-blue-200/60' : 'text-blue-700/80'}`}>The panel demonstrated high professional alignment. Your score is mathematically verified as stable.</p>
                        </motion.div>
                    </div>
                </div>
            )
        },
        {
            title: "Synaptic Reporting",
            icon: BrainCircuit,
            desc: "Finally, a Chief Assessment Officer agent synthesizes all 9 evaluations, reconciles conflicting feedback using Kendall's W concordance metrics, and generates a cohesive visual and qualitative report for the student.",
            visual: (
                <div className="relative h-full flex items-center justify-center p-8">
                    {/* Outer pulse rings */}
                    {[1, 2, 3].map((ring) => (
                        <motion.div 
                            key={ring}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, delay: ring * 0.8 }}
                            className={`absolute w-48 h-48 rounded-full border ${dark ? 'border-blue-500/20' : 'border-blue-300/20'}`}
                        />
                    ))}
                    
                    {/* Converging data cards */}
                    {[
                        { x: -140, y: -100, label: 'UX Strategist', delay: 0 },
                        { x: 140, y: -100, label: 'Design Engineer', delay: 0.3 },
                        { x: -140, y: 100, label: 'Art Director', delay: 0.6 },
                        { x: 140, y: 100, label: 'ICC Metrics', delay: 0.9 },
                    ].map((card, i) => (
                        <motion.div
                            key={i}
                            animate={{ 
                                x: [card.x, card.x * 0.3, card.x],
                                y: [card.y, card.y * 0.3, card.y],
                                opacity: [0.6, 1, 0.6]
                            }}
                            transition={{ duration: 4, repeat: Infinity, delay: card.delay }}
                            className={`absolute w-20 h-14 rounded-xl flex items-center justify-center border text-[8px] font-black uppercase tracking-widest ${dark ? 'bg-white/5 border-white/10 text-white/40' : 'bg-white border-black/5 text-gray-400'}`}
                        >
                            {card.label}
                        </motion.div>
                    ))}

                    {/* Central report hub */}
                    <motion.div 
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className={`w-44 h-44 rounded-[2.5rem] shadow-4xl flex flex-col items-center justify-center p-6 text-center relative z-10 border ${dark ? 'bg-[#1a1f26] border-white/10' : 'bg-white border-black/5'}`}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-2xl shadow-blue-500/40">
                            <LineChart className="text-white" size={30} />
                        </div>
                        <h4 className={`text-sm font-black ${dark ? 'text-white' : 'text-gray-900'}`}>Synaptic Report</h4>
                        <motion.div 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="mt-1 text-[9px] font-bold text-blue-500 uppercase tracking-widest"
                        >
                            Synthesis Complete
                        </motion.div>
                    </motion.div>
                </div>
            )
        }
    ];

    return (
        <div className={`min-h-screen relative ${dark ? 'text-gray-300' : 'text-gray-900'} selection:bg-blue-500 selection:text-white transition-colors duration-700`}>
            <ConstellationBackground dark={dark} />

            {/* Navigation */}
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

            <main className="max-w-7xl mx-auto px-6 pt-40 pb-32 relative z-10">
                {/* Hero */}
                <div className="max-w-4xl mb-24">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}
                    >
                        <Zap size={14} /> The Assessment Protocol
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`text-6xl sm:text-8xl font-black tracking-tight mb-8 leading-[0.9] ${dark ? 'text-white' : 'text-gray-900'}`}
                    >
                        Under the Hood <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">The Synaptic Engine.</span>
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`text-2xl leading-relaxed max-w-2xl ${dark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                        Raati AI leverages an orchestration of multi-agent intelligence and rigorous statistical auditing to provide feedback that is both qualitatively deep and mathematically stable.
                    </motion.p>
                </div>

                {/* Interactive Explorer with Auto-Advance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[600px]">
                    <div className="space-y-3">
                        {/* Step progress indicator */}
                        <div className={`flex items-center gap-3 mb-4 px-4`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${dark ? 'text-white/30' : 'text-gray-400'}`}>Pipeline Progress</span>
                            <div className={`flex-1 h-1 rounded-full overflow-hidden ${dark ? 'bg-white/5' : 'bg-black/5'}`}>
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                    style={{ width: `${((activeStep) / steps.length) * 100 + (stepProgress / steps.length)}%` }}
                                />
                            </div>
                            <span className={`text-[10px] font-black ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{activeStep + 1}/{steps.length}</span>
                        </div>

                        {steps.map((step, idx) => (
                            <motion.div 
                                key={idx}
                                onClick={() => handleStepClick(idx)}
                                whileHover={{ x: 8 }}
                                className={`group cursor-pointer p-6 rounded-[2rem] border transition-all duration-500 ${
                                    activeStep === idx 
                                    ? (dark ? 'bg-blue-600 border-blue-400 shadow-2xl shadow-blue-500/20' : 'bg-[#1a237e] border-blue-400 shadow-2xl shadow-blue-900/10') 
                                    : (dark ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]' : 'bg-white/80 border-black/5 hover:border-black/10')
                                }`}
                            >
                                <div className="flex gap-6 items-start">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black italic transition-all duration-500 ${
                                        activeStep === idx ? 'bg-white text-blue-600 rotate-6 scale-110' : (dark ? 'bg-white/5 text-white/20' : 'bg-black/5 text-black/15')
                                    }`}>
                                        {`0${idx + 1}`}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <step.icon size={16} className={activeStep === idx ? 'text-white' : (dark ? 'text-blue-400' : 'text-blue-600')} />
                                            <h3 className={`text-lg font-black tracking-tight ${activeStep === idx ? 'text-white' : (dark ? 'text-white' : 'text-gray-900')}`}>{step.title}</h3>
                                        </div>
                                        <p className={`text-xs leading-relaxed transition-colors ${activeStep === idx ? 'text-blue-100' : (dark ? 'text-gray-500' : 'text-gray-500')}`}>{step.desc}</p>
                                        
                                        {/* Phase mini progress */}
                                        {activeStep === idx && (
                                            <div className={`mt-3 h-0.5 rounded-full overflow-hidden bg-white/20`}>
                                                <motion.div 
                                                    className="h-full bg-white/60 rounded-full"
                                                    style={{ width: `${stepProgress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    
                    <div className={`h-[600px] rounded-[4rem] border relative overflow-hidden flex items-center justify-center ${dark ? 'bg-[#0f1218]/50 border-white/10' : 'bg-white border-black/5 shadow-2xl shadow-indigo-900/5'}`}>
                        {/* Visual Stage */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStep}
                                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                                transition={{ duration: 0.5, ease: "circOut" }}
                                className="w-full h-full"
                            >
                                {steps[activeStep].visual}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Statistical Details Section */}
                <div className="mt-48">
                    <div className="text-center mb-20">
                        <h2 className={`text-4xl sm:text-6xl font-black tracking-tight mb-6 ${dark ? 'text-white' : 'text-gray-900'}`}>The Science of Consensus.</h2>
                        <p className={`text-xl max-w-2xl mx-auto ${dark ? 'text-gray-400' : 'text-gray-600'}`}>We don't just aggregate scores. We verify them through industry-standard psychometric analysis.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { 
                                title: "ICC(3,1) Reliability", 
                                icon: ShieldCheck, 
                                color: "text-blue-500", 
                                bg: "bg-blue-500/10",
                                desc: "The Intraclass Correlation Coefficient measures the stability of ratings across multiple judges. It filter out 'noise' to ensure your score reflects true creative potential."
                            },
                            { 
                                title: "Kendall's W", 
                                icon: BarChart3, 
                                color: "text-indigo-500", 
                                bg: "bg-indigo-500/10",
                                desc: "Measures the strength of concordance among different persona perspectives. It answers: 'Do the Engineer and the Artist agree on what makes this design work?'"
                            },
                            { 
                                title: "Variance Analysis", 
                                icon: Scale, 
                                color: "text-purple-500", 
                                bg: "bg-purple-500/10",
                                desc: "We map disagreement per dimension. If Feasibility has high variance, it indicates a critical point of debate that needs design refinement."
                            }
                        ].map((stat, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                whileHover={{ y: -5 }}
                                className={`p-10 rounded-[3rem] border ${dark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-black/5 shadow-xl shadow-indigo-900/5'}`}
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={32} />
                                </div>
                                <h3 className={`text-2xl font-black mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>{stat.title}</h3>
                                <p className={`leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Interactive Live Demo Section */}
                <div className="mt-48">
                    <div className="flex flex-col lg:flex-row gap-20 items-center">
                        <div className="flex-1 lg:max-w-md">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}><BarChart3 size={12} /> Interactive Engine Demo</div>
                            <h2 className={`text-4xl sm:text-6xl font-black tracking-tight mb-8 ${dark ? 'text-white' : 'text-gray-900'}`}>See an <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Actual Result.</span></h2>
                            <p className={`text-lg ${dark ? 'text-gray-400' : 'text-gray-600'} mb-12 leading-relaxed`}>Toggle between these two distinct project profiles to see how the system's 9-agent panel identifies unique strengths and risks with mathematical precision.</p>
                            
                            <div className="space-y-4">
                                <button 
                                    onClick={() => setDemoType('sketch')}
                                    className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all ${demoType === 'sketch' ? (dark ? 'bg-blue-500/10 border-blue-500' : 'bg-blue-50 border-blue-500') : (dark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-black/5')}`}
                                >
                                    <div className="text-left">
                                        <div className={`text-xs font-black uppercase tracking-widest ${demoType === 'sketch' ? 'text-blue-500' : (dark ? 'text-gray-500' : 'text-gray-400')}`}>Case Study A</div>
                                        <div className={`font-black ${dark ? 'text-white' : 'text-gray-900'}`}>Smart Home Interface Sketch</div>
                                    </div>
                                    <ChevronRight size={20} className={demoType === 'sketch' ? 'text-blue-500' : 'opacity-20'} />
                                </button>
                                <button 
                                    onClick={() => setDemoType('package')}
                                    className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all ${demoType === 'package' ? (dark ? 'bg-blue-500/10 border-blue-500' : 'bg-blue-50 border-blue-500') : (dark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-black/5')}`}
                                >
                                    <div className="text-left">
                                        <div className={`text-xs font-black uppercase tracking-widest ${demoType === 'package' ? 'text-blue-500' : (dark ? 'text-gray-500' : 'text-gray-400')}`}>Case Study B</div>
                                        <div className={`font-black ${dark ? 'text-white' : 'text-gray-900'}`}>Sustainable Packaging Concept</div>
                                    </div>
                                    <ChevronRight size={20} className={demoType === 'package' ? 'text-blue-500' : 'opacity-20'} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 w-full">
                            <motion.div 
                                key={demoType}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-10 rounded-[4rem] border relative overflow-hidden shadow-4xl ${dark ? 'bg-[#151921] border-white/10' : 'bg-white border-black/5 shadow-blue-900/5'}`}
                            >
                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        <div className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1 italic">Synthesized Consensus</div>
                                        <h3 className={`text-3xl font-black ${dark ? 'text-white' : 'text-gray-900'}`}>{demoType === 'sketch' ? '4.2/5' : '4.6/5'}</h3>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>High Reliability (ICC 0.92)</div>
                                </div>

                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={demoType === 'sketch' ? DEMO_DATA.sketch : DEMO_DATA.package}>
                                            <PolarGrid stroke={dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: dark ? '#888' : '#666', fontSize: 10, fontWeight: 'bold' }} />
                                            <Radar name="Consensus" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className={`mt-8 p-6 rounded-3xl ${dark ? 'bg-white/5' : 'bg-gray-50'} border border-transparent`}>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                                            <Info size={18} className="text-white" />
                                        </div>
                                        <div>
                                            <div className={`text-xs font-black uppercase tracking-widest mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>Chief Evaluator's Note</div>
                                            <p className={`text-xs leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {demoType === 'sketch' 
                                                    ? "Excellent visual hierarchy and accessibility scores, but consider clarifying the user flow in the navigation modal. The panel suggests a 15% more defined clear state."
                                                    : "High material sustainability profile. However, manufacturing costs are surfacing as a primary focal point in the feasibility dimension (Variance 1.4). Verify supplier logistics."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Final CTA */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className={`mt-48 p-16 rounded-[4rem] text-center border relative overflow-hidden ${dark ? 'bg-[#151921] border-blue-500/20' : 'bg-[#1a237e] border-blue-400 text-white shadow-2xl shadow-indigo-900/10'}`}
                >
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <Network size={400} className="absolute -bottom-20 -right-20" />
                    </div>
                    <h2 className={`text-4xl sm:text-6xl font-black mb-8 leading-tight ${dark ? 'text-white' : 'text-white'}`}>Ready to stress-test <br />your next big idea?</h2>
                    <button 
                        onClick={() => navigate('/evaluate')}
                        className={`group px-12 py-6 rounded-3xl text-xl font-black transition-all flex items-center gap-4 mx-auto shadow-2xl hover:scale-105 active:scale-95 ${dark ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/25' : 'bg-white text-[#1a237e] hover:bg-gray-100 shadow-black/20'}`}
                    >
                        Start Creative Assessment <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>
            </main>

            {/* Footer Minimal */}
            <footer className={`py-12 border-t relative z-10 ${dark ? 'border-white/5 opacity-40' : 'border-black/5 opacity-60'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span>Research by University of Oulu</span>
                    <div className="flex gap-8">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                        <span>© 2026 Raati AI</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HowItWorks;
