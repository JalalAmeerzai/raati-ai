import React, { useEffect, useState, useRef } from 'react';
import Layout, { useTheme } from '../components/Layout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FileText, CalendarDays, TrendingUp, Award, ArrowRight, Image, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { OpenAIIcon, XAIIcon, ClaudeIcon } from '../components/LLMIcons';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, Cell,
    Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';

interface AnalyticsData {
    total_submissions: number;
    submissions_this_month: number;
    average_score: number;
    highest_score: number;
    distribution: { range: string; count: number; percentage?: number }[];
}

interface HistoryItem {
    id: string;
    timestamp: string;
    image_filename: string;
    description: string;
    overall_score: string | number;
    image_url: string;
    submitter_name?: string;
}

const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'AN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const cardBarData = (detail: any, fallbackScore: number) => {
    const dimensions = [
        { key: 'creativity_score', label: 'CR' },
        { key: 'originality_score', label: 'OR' },
        { key: 'usefulness_relevance_score', label: 'US' },
        { key: 'clarity_score', label: 'CL' },
        { key: 'level_of_detail_elaboration_score', label: 'DT' },
        { key: 'feasibility_score', label: 'FE' },
    ];
    return dimensions.map((d) => {
        let val = detail && detail[d.key] != null ? parseFloat(detail[d.key]) : fallbackScore;
        if (isNaN(val)) val = 0;
        return { dim: d.label, val: parseFloat(val.toFixed(1)) };
    });
};

const avatarColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];
const getAvatarColor = (name?: string) => {
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
};


const Dashboard: React.FC = () => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [featuredDetail, setFeaturedDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [maxGridItems, setMaxGridItems] = useState(7); // Initial guess
    const gridRef = useRef<HTMLDivElement>(null);
    const { dark } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            axios.get('http://localhost:8000/analytics'),
            axios.get('http://localhost:8000/history'),
        ]).then(([analyticsRes, historyRes]) => {
            setAnalytics(analyticsRes.data);
            const hist = historyRes.data;
            setHistory(hist);
            setLoading(false);
            
            // Immediately fetch detail for the top item
            if (hist.length > 0) {
                axios.get(`http://localhost:8000/results/${hist[0].id}`)
                    .then(res => setFeaturedDetail(res.data))
                    .catch(err => console.error("Failed to load featured details", err));
            }
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!gridRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                // grid auto-fill logic: minmax 240px + gap 20px (1.25rem = 20px)
                const cols = Math.floor((width + 20) / 260) || 1;
                // We want max 2 rows. Last item is always "View More" component
                // So max items from history to render = (cols * 2) - 1
                setMaxGridItems((cols * 2) - 1);
            }
        });
        observer.observe(gridRef.current);
        return () => observer.disconnect();
    }, [history]);

    const cardBg = dark ? 'bg-[#181b23] border-gray-700/50' : 'bg-white border-gray-200';
    const txt = dark ? 'text-gray-100' : 'text-gray-900';
    const sub = dark ? 'text-gray-400' : 'text-gray-500';
    const sub2 = dark ? 'text-gray-600' : 'text-gray-400';

    const formatDate = (isoString: string) =>
        new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (loading) {
        return (
            <Layout title="Dashboard">
                <div className="space-y-6">
                    {/* Skeleton for metric cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={`${cardBg} border rounded-xl p-6 animate-pulse`}>
                                <div className={`h-3 w-24 rounded mb-3 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                                <div className={`h-8 w-16 rounded mb-2 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                                <div className={`h-2 w-20 rounded ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
                            </div>
                        ))}
                    </div>
                    {/* Skeleton for featured cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className={`${cardBg} border rounded-xl h-64 animate-pulse`} />
                        ))}
                    </div>
                </div>
            </Layout>
        );
    }

    const stats = [
        {
            title: 'Total Submissions',
            value: analytics?.total_submissions ?? 0,
            subtitle: 'All Time',
            icon: FileText,
            color: dark ? 'text-purple-400' : 'text-purple-600',
            bg: dark ? 'bg-purple-500/10' : 'bg-purple-50',
        },
        {
            title: 'This Month',
            value: analytics?.submissions_this_month ?? 0,
            subtitle: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            icon: CalendarDays,
            color: dark ? 'text-blue-400' : 'text-blue-600',
            bg: dark ? 'bg-blue-500/10' : 'bg-blue-50',
        },
        {
            title: 'Average Score',
            value: `${analytics?.average_score ?? 0}/5`,
            subtitle: 'Across all evaluations',
            icon: TrendingUp,
            color: dark ? 'text-emerald-400' : 'text-emerald-600',
            bg: dark ? 'bg-emerald-500/10' : 'bg-emerald-50',
        },
        {
            title: 'Highest Score',
            value: `${analytics?.highest_score ?? 0}/5`,
            subtitle: 'Best evaluation',
            icon: Award,
            color: dark ? 'text-amber-400' : 'text-amber-600',
            bg: dark ? 'bg-amber-500/10' : 'bg-amber-50',
        },
    ];

    const featuredItem = history.length > 0 ? history[0] : null;
    const itemsForGrid = history.slice(1, Math.max(1, maxGridItems));

    const getBarColor = (index: number) => {
        const colorsDark = ['#f87171', '#fbbf24', '#60a5fa', '#34d399'];
        const colorsLight = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
        return dark ? colorsDark[index % 4] : colorsLight[index % 4];
    };

    const DistributionTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md ${dark ? 'bg-[#181b23]/95 border-[#2a2e3d]' : 'bg-white/95 border-gray-200'} animate-in fade-in zoom-in-95 duration-200`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{data.range}</p>
                    <div className="flex items-end gap-3">
                        <p className={`text-3xl font-black leading-none ${dark ? 'text-white' : 'text-gray-900'}`}>{data.count}</p>
                        <div className="flex flex-col pb-0.5">
                            <span className={`text-[11px] font-bold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{data.percentage ?? 0}% of total</span>
                            <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>platform volume</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Layout title="Dashboard">
            <div className="space-y-6">

                {/* ─── Global Metrics ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {stats.map((stat, i) => (
                        <div key={i} className={`${cardBg} border rounded-xl p-6 shadow-sm hover:shadow-md transition-all group`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${sub}`}>{stat.title}</p>
                                    <h3 className={`text-3xl font-black tracking-tight ${txt}`}>{stat.value}</h3>
                                    <p className={`text-[11px] mt-1.5 ${sub2}`}>{stat.subtitle}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                                    <stat.icon size={22} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ─── Score Distribution Chart ─── */}
                {analytics?.distribution && analytics.distribution.length > 0 && (
                    <div className={`${cardBg} border rounded-xl shadow-sm p-6 transition-colors`}>
                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-5 ${sub}`}>Score Distribution — Platform Overview</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.distribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#374151' : '#eee'} />
                                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: dark ? '#9ca3af' : '#888', fontSize: 11 }} dy={8} />
                                    <YAxis hide />
                                    <Tooltip content={<DistributionTooltip />} cursor={{ fill: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48} animationDuration={1500}>
                                        {analytics.distribution.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ─── Recent Submissions Header ─── */}
                <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-bold ${txt}`}>Recent Submissions</h2>
                    <span className={`text-xs font-medium ${sub2}`}>
                        {history.length > 0 ? `${history.length} total` : 'No submissions yet'}
                    </span>
                </div>

                {history.length === 0 ? (
                    <div className={`${cardBg} border rounded-xl p-12 text-center`}>
                        <Image size={48} className={`mx-auto mb-4 ${sub2}`} />
                        <p className={`text-base font-semibold mb-2 ${txt}`}>No submissions yet</p>
                        <p className={`text-sm mb-6 ${sub}`}>Run your first evaluation to see results here.</p>
                        <button
                            onClick={() => navigate('/evaluate')}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${dark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#1a237e] hover:bg-[#151b60] text-white'}`}
                        >
                            Run Evaluation
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ─── Featured Top Submission ─── */}
                        {featuredItem && (
                            <div className="mb-8">
                                {(() => {
                                    const score = featuredItem.overall_score != null && featuredItem.overall_score !== '' ? parseFloat(String(featuredItem.overall_score)) : null;
                                    return (
                                        <div
                                            onClick={() => navigate(`/results/${featuredItem.id}`)}
                                            className={`${cardBg} border rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer group flex flex-col lg:flex-row overflow-hidden relative group/card`}
                                        >
                                            {/* Section 1: Visual (Image) */}
                                            <div className={`w-full lg:w-[320px] h-72 lg:h-auto relative shrink-0 overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                <img
                                                    src={`http://localhost:8000${featuredItem.image_url}`}
                                                    alt="Submission Sketch"
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2.5s] ease-out"
                                                    crossOrigin="anonymous"
                                                />
                                                {/* Standard seamless transition from older style */}
                                                <div className={`absolute inset-0 hidden lg:block ${dark ? 'bg-gradient-to-r from-transparent via-transparent to-[#12141c]' : 'bg-gradient-to-r from-transparent via-transparent to-white'}`} />
                                                <div className={`absolute inset-0 lg:hidden ${dark ? 'bg-gradient-to-t from-[#12141c] via-transparent to-transparent' : 'bg-gradient-to-t from-white via-transparent to-transparent'}`} />
                                                
                                                {/* Bottom Left Badge on Image */}
                                                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                                    <div className="flex -space-x-1.5">
                                                        <div className={`h-6 w-6 rounded-full border-2 border-white/10 flex items-center justify-center bg-blue-500 shadow-lg`} title="OpenAI Evaluated">
                                                            <OpenAIIcon size={10} className="text-white" />
                                                        </div>
                                                        <div className={`h-6 w-6 rounded-full border-2 border-white/10 flex items-center justify-center bg-orange-500 shadow-lg`} title="Claude Evaluated">
                                                            <ClaudeIcon size={10} className="text-white" />
                                                        </div>
                                                        <div className={`h-6 w-6 rounded-full border-2 border-white/10 flex items-center justify-center bg-gray-900 shadow-lg`} title="xAI Evaluated">
                                                            <XAIIcon size={10} className="text-white" />
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white drop-shadow-md bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-md">Consensus Engine</span>
                                                </div>
                                            </div>

                                            {/* Section 2: Insights & Context */}
                                            <div className="flex-1 p-8 flex flex-col min-w-0">
                                                <div className="flex items-start justify-between mb-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-xl group-hover/card:scale-110 transition-transform duration-500 ${getAvatarColor(featuredItem.submitter_name)}`}>
                                                            {getInitials(featuredItem.submitter_name)}
                                                        </div>
                                                        <div>
                                                            <h3 className={`text-xl font-black tracking-tight ${txt}`}>{featuredItem.submitter_name?.trim() || 'Anonymous'}</h3>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className={`text-[10px] font-bold uppercase tracking-widest opacity-50 ${sub}`}>{formatDate(featuredItem.timestamp)}</p>
                                                                <span className="h-1 w-1 rounded-full bg-gray-500/30" />
                                                                <p className={`text-[10px] font-bold uppercase tracking-widest text-blue-500/80`}>Draft Review</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {score != null && (
                                                        <div className="flex flex-col items-end">
                                                            <div className={`text-4xl font-black tracking-tighter leading-none ${
                                                                score >= 4 ? (dark ? 'text-emerald-400' : 'text-emerald-600') :
                                                                score >= 2.5 ? (dark ? 'text-amber-400' : 'text-amber-600') :
                                                                (dark ? 'text-red-400' : 'text-red-600')
                                                            }`}>
                                                                {score.toFixed(1)}<span className="text-sm opacity-30 ml-1 font-medium">/ 5.0</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Analytical Badges - Balanced Layout to fill whitespace */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                                    {/* Consensus Badge */}
                                                    {featuredDetail?.stats?.overall_icc && (
                                                        <div className={`p-4 rounded-2xl border flex flex-col gap-1 transition-all hover:bg-white/5 ${dark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50/50 border-blue-100'}`}>
                                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-blue-500">
                                                                <ShieldCheck size={12} strokeWidth={3} /> Quality Consensus
                                                            </div>
                                                            <div className={`text-sm font-bold ${txt}`}>
                                                                {featuredDetail.stats.overall_icc.label} 
                                                                <span className="ml-2 text-[10px] opacity-40 font-bold uppercase tracking-wider">{(featuredDetail.stats.overall_icc.score * 100).toFixed(0)}% Agree</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Top Strength & Challenges Badge Group */}
                                                    <div className="flex flex-col gap-2">
                                                        {(() => {
                                                            const dims = [
                                                                { l: 'Creativity', v: featuredDetail?.creativity_score },
                                                                { l: 'Originality', v: featuredDetail?.originality_score },
                                                                { l: 'Usefulness', v: featuredDetail?.usefulness_relevance_score },
                                                                { l: 'Clarity', v: featuredDetail?.clarity_score },
                                                                { l: 'Detail', v: featuredDetail?.level_of_detail_elaboration_score },
                                                                { l: 'Feasibility', v: featuredDetail?.feasibility_score },
                                                            ].filter(d => d.v != null).sort((a, b) => b.v - a.v);
                                                            
                                                            const best = dims[0];
                                                            const worst = dims[dims.length - 1];
                                                            
                                                            if (!best) return null;

                                                            return (
                                                                <>
                                                                    <div className={`px-4 py-2.5 rounded-xl border flex items-center justify-between group/badge transition-all ${dark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                                                            <Zap size={10} fill="currentColor" /> Peak Area
                                                                        </div>
                                                                        <div className={`text-[11px] font-black ${txt}`}>{best.l} <span className="ml-1 opacity-40">{best.v}</span></div>
                                                                    </div>
                                                                    <div className={`px-4 py-2.5 rounded-xl border flex items-center justify-between group/badge transition-all ${dark ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50/50 border-amber-100'}`}>
                                                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-500">
                                                                            <AlertCircle size={10} /> Focus Area
                                                                        </div>
                                                                        <div className={`text-[11px] font-black ${txt}`}>{worst.l} <span className="ml-1 opacity-40">{worst.v}</span></div>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-500/5">
                                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] group/btn ${dark ? 'text-blue-400' : 'text-blue-700'}`}>
                                                        Intelligence Report <ArrowRight size={14} strokeWidth={3} className="group-hover/btn:translate-x-1 transition-transform" />
                                                    </div>
                                                    <div className={`text-[10px] font-black font-mono opacity-30 ${txt}`}>
                                                        REF.{featuredItem.id.split('-')[0].toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 3: Graphical Fingerprint */}
                                            <div className={`w-full lg:w-[320px] p-8 flex flex-col shrink-0 relative ${dark ? 'bg-black/20' : 'bg-gray-50/40'}`}>
                                                {/* Visual connector - making it feel unified */}
                                                <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-gray-500/10 to-transparent lg:block hidden" />
                                                
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-gray-500/60">
                                                    <span>Performance Spectrum</span>
                                                    <TrendingUp size={12} />
                                                </div>
                                                
                                                <div className="flex-1 min-h-[200px] w-full">
                                                    {score != null ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={cardBarData(featuredDetail, score)}>
                                                                <PolarGrid stroke={dark ? '#374151' : '#e5e7eb'} strokeDasharray="3 3" />
                                                                <PolarAngleAxis dataKey="dim" tick={{ fill: dark ? '#9ca3af' : '#6b7280', fontSize: 9, fontWeight: 800 }} />
                                                                <Radar
                                                                    name="Scores"
                                                                    dataKey="val"
                                                                    stroke={dark ? '#60a5fa' : '#1a237e'}
                                                                    strokeWidth={2}
                                                                    fill={dark ? '#3b82f6' : '#1a237e'}
                                                                    fillOpacity={0.3}
                                                                    animationBegin={200}
                                                                    animationDuration={1000}
                                                                />
                                                                <Tooltip 
                                                                    contentStyle={{ 
                                                                        borderRadius: '16px', 
                                                                        fontSize: '10px', 
                                                                        backgroundColor: dark ? '#1b1e2e' : '#fff',
                                                                        border: 'none',
                                                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
                                                                    }} 
                                                                />
                                                            </RadarChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                                            <div className="h-2 w-32 bg-gray-700/50 rounded-full animate-pulse mb-3" />
                                                            <div className="h-2 w-24 bg-gray-700/50 rounded-full animate-pulse" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        {/* ─── Fluid Grid for Additional Recent Submissions ─── */}
                        <div ref={gridRef} className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
                            {itemsForGrid.map((item) => {
                                const score = item.overall_score != null && item.overall_score !== '' ? parseFloat(String(item.overall_score)) : null;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(`/results/${item.id}`)}
                                        className={`${cardBg} border rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col overflow-hidden relative min-h-[250px]`}
                                    >
                                        {/* Score Overlay Badge */}
                                        {score != null && (
                                            <div className={`absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full font-bold text-sm shadow-md backdrop-blur-md ${
                                                score >= 4 ? (dark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white') :
                                                score >= 2.5 ? (dark ? 'bg-amber-500/80 text-white' : 'bg-amber-500 text-white') :
                                                (dark ? 'bg-red-500/80 text-white' : 'bg-red-50 text-white')
                                            }`}>
                                                {score.toFixed(1)} <span className="text-[10px] opacity-80 font-medium">/ 5</span>
                                            </div>
                                        )}

                                        {/* Large Image Reveal */}
                                        <div className={`w-full flex-grow relative overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                            <img
                                                src={`http://localhost:8000${item.image_url}`}
                                                alt="Submission Sketch"
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                crossOrigin="anonymous"
                                            />
                                            {/* Gradient fade to seamlessly blend into card body */}
                                            <div className={`absolute inset-0 top-auto h-12 pointer-events-none ${dark ? 'bg-gradient-to-t from-[#181b23] to-transparent' : 'bg-gradient-to-t from-white to-transparent'}`} />
                                        </div>

                                        {/* Context Footer (Author + Date) */}
                                        <div className="p-4 pt-3 flex items-center justify-between shrink-0 border-t border-gray-500/10">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${getAvatarColor(item.submitter_name)}`}>
                                                    {getInitials(item.submitter_name)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold truncate max-w-[120px] ${txt}`}>
                                                        {item.submitter_name?.trim() || 'Anonymous'}
                                                    </span>
                                                    <span className={`text-[10px] ${sub2}`}>
                                                        {formatDate(item.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${sub}`}>
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Terminal View More Link Card - Placed explicitly as the last grid item */}
                            <div
                                onClick={() => navigate('/history')}
                                className={`flex flex-col items-center justify-center min-h-[250px] rounded-xl border border-dashed transition-all cursor-pointer group ${dark ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/5' : 'border-gray-300 hover:border-blue-600 hover:bg-blue-50'}`}
                            >
                                <div className={`h-12 w-12 rounded-full mb-3 flex items-center justify-center transition-transform group-hover:scale-110 ${dark ? 'bg-gray-800 text-blue-400' : 'bg-white shadow-sm text-blue-600'}`}>
                                    <ArrowRight size={24} />
                                </div>
                                <p className={`text-base font-bold ${dark ? 'text-gray-300' : 'text-gray-800'} group-hover:text-blue-500 transition-colors`}>View More</p>
                                <p className={`text-[11px] mt-1 ${sub2}`}>See all submissions</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;
