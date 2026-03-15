import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { CheckCircle, Lightbulb, TrendingUp, Download, Maximize2, AlertTriangle, Users, BarChart3 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { OpenAIIcon, GeminiIcon, XAIIcon, ClaudeIcon } from '../components/LLMIcons';

interface AgentResult {
    assigned_model: string;
    persona: {
        assigned_model: string;
        name: string;
        title: string;
        sub_text: string;
        prompt: string;
    };
    result: {
        overall_score: number;
        creativity_score: number;
        originality_score: number;
        usefulness_relevance_score: number;
        clarity_score: number;
        level_of_detail_elaboration_score: number;
        feasibility_score: number;
        creativity_reasoning: string;
        originality_reasoning: string;
        usefulness_relevance_reasoning: string;
        clarity_reasoning: string;
        level_of_detail_elaboration_reasoning: string;
        feasibility_reasoning: string;
        instructor_feedback: string;
    };
    error?: string;
}

interface ResultData {
    id: string;
    image_url: string;
    description: string;
    creativity_score: number;
    originality_score: number;
    usefulness_relevance_score: number;
    clarity_score: number;
    level_of_detail_elaboration_score: number;
    feasibility_score: number;
    overall_score: number;
    creativity_reasoning: string;
    originality_reasoning: string;
    usefulness_relevance_reasoning: string;
    clarity_reasoning: string;
    level_of_detail_elaboration_reasoning: string;
    feasibility_reasoning: string;
    instructor_feedback_intro: string;
    instructor_feedback_pivot: string;
    instructor_feedback_next_step: string;
    expert_panel?: AgentResult[];
    stats?: {
        icc: {
            score: number | null;
            label: string;
            message: string;
            bg: string;
            color: string;
            border: string;
        };
        anova: {
            p_value: number | null;
            significant: boolean;
            message: string;
        };
    };
}


const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</span>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" className="text-gray-500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-4 bg-white text-gray-600 text-sm leading-relaxed border-t border-gray-200">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Sub-component for mini progress bars in the Agent Cards
const MiniScoreBar: React.FC<{ label: string; score: number; reasoning?: string }> = ({ label, score, reasoning }) => {
    const percentage = (score / 5) * 100;

    // Determine color based on score
    let colorClass = "bg-blue-500";
    if (score >= 4.5) colorClass = "bg-emerald-500";
    else if (score <= 3.0) colorClass = "bg-red-500";
    else if (score < 4.0) colorClass = "bg-amber-500";

    return (
        <div className="relative group flex items-center justify-between text-[10px] mb-1.5 last:mb-0 cursor-help">
            <span className="text-gray-500 font-medium truncate w-16 group-hover:text-blue-600 transition-colors">{label}</span>
            <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="font-bold text-gray-700 w-5 text-right">{score.toFixed(1)}</span>

            {/* Tooltip */}
            {reasoning && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                    {reasoning}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

const Results: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [data, setData] = useState<ResultData | null>(location.state?.result || null);
    const [loading, setLoading] = useState(!data);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!data && id) {
            axios.get(`http://localhost:8000/results/${id}`)
                .then(response => {
                    setData(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [id, data]);

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;

        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: true
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`assessment-report-${data?.id?.slice(0, 8)}.pdf`);
        } catch (error) {
            console.error("Error generating PDF", error);
        }
    };

    if (loading) return <Layout title="Results"><div className="p-8">Loading...</div></Layout>;
    if (!data) return <Layout title="Results"><div className="p-8">Result not found</div></Layout>;

    // Prepare chart data for main radar (aggregated consensus)
    const chartData = [
        { subject: 'Creativity', A: Number(data.creativity_score), fullMark: 5 },
        { subject: 'Originality', A: Number(data.originality_score), fullMark: 5 },
        { subject: 'Usefulness', A: Number(data.usefulness_relevance_score), fullMark: 5 },
        { subject: 'Clarity', A: Number(data.clarity_score), fullMark: 5 },
        { subject: 'Detail', A: Number(data.level_of_detail_elaboration_score), fullMark: 5 },
        { subject: 'Feasibility', A: Number(data.feasibility_score), fullMark: 5 },
    ];

    return (
        <Layout title="Evaluation Report: Consensual Assessment Technique Assessment">
            <div ref={reportRef} className="bg-gray-50 p-4 transition-colors">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Image (Takes 5/12 columns) */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Product Concept</h3>

                        {/* Image Container with Hover Effect */}
                        <div
                            className="group relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <img
                                src={`http://localhost:8000${data.image_url}`}
                                alt="Submitted Sketch"
                                className="w-full h-full object-contain mix-blend-multiply"
                            />

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full text-white">
                                    <Maximize2 size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {data.description}
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Analysis (Takes 7/12 columns) */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* 1. Top Radar Chart Card - Relabeled to Aggregated Consensus */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                            {/* Decorative Background Glow */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                                    <Users size={16} className="text-blue-500" /> Aggregated Panel Consensus
                                </h3>
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-100">
                                    Mean of {data.expert_panel ? data.expert_panel.length : 0} Agents
                                </span>
                            </div>

                            <div className="flex items-center relative z-10">
                                <div className="h-64 w-2/3">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                            <PolarGrid stroke="#e5e7eb" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Consensus Score"
                                                dataKey="A"
                                                stroke="#3b82f6"
                                                strokeWidth={2.5}
                                                fill="url(#colorUv)" /* Added gradient fill */
                                                fillOpacity={0.4}
                                            />
                                            {/* Gradient Definition for Radar Fill */}
                                            <defs>
                                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                </linearGradient>
                                            </defs>
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/3 flex flex-col items-center justify-center border-l border-gray-100 pl-6">
                                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-800 tracking-tighter shadow-sm">
                                        {data.overall_score}/<span className="text-3xl text-gray-400 font-bold">5</span>
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-500 mt-3 tracking-widest uppercase">Mean Composite Score</div>
                                    <div className="mt-4 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-600 text-center font-medium border border-gray-100">
                                        Top 5% of Submissions
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Detailed Feedback Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Detailed Dimension Feedback</h3>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <span className="font-bold text-gray-800 text-sm">Creativity ({data.creativity_score}/5).</span>
                                        <p className="text-sm text-gray-600 mt-1">{data.creativity_reasoning}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Lightbulb className="text-yellow-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <span className="font-bold text-gray-800 text-sm">Originality ({data.originality_score}/5).</span>
                                        <p className="text-sm text-gray-600 mt-1">{data.originality_reasoning}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <TrendingUp className="text-orange-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <span className="font-bold text-gray-800 text-sm">Usefulness / Relevance ({data.usefulness_relevance_score}/5).</span>
                                        <p className="text-sm text-gray-600 mt-1">{data.usefulness_relevance_reasoning}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <span className="font-bold text-gray-800 text-sm">Clarity ({data.clarity_score}/5).</span>
                                        <p className="text-sm text-gray-600 mt-1">{data.clarity_reasoning}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Lightbulb className="text-purple-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <span className="font-bold text-gray-800 text-sm">Level of Detail ({data.level_of_detail_elaboration_score}/5).</span>
                                        <p className="text-sm text-gray-600 mt-1">{data.level_of_detail_elaboration_reasoning}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <TrendingUp className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <span className="font-bold text-gray-800 text-sm">Feasibility ({data.feasibility_score}/5).</span>
                                        <p className="text-sm text-gray-600 mt-1">{data.feasibility_reasoning}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleDownloadPDF}
                                className="mt-6 w-full py-2.5 border border-[#1a237e] text-[#1a237e] rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
                            >
                                <Download size={16} />
                                <span>Download Full Report PDF</span>
                            </button>
                        </div>

                        {/* 3. Instructor Feedback Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center">
                                <span className="text-lg mr-2">💡</span> Instructor Feedback
                            </h3>
                            <div className="space-y-6">
                                {/* Headline & Intro */}
                                <div>
                                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                                        {data.instructor_feedback_intro}
                                    </p>
                                </div>

                                {/* Accordion for Pivot & Next Step */}
                                <div className="space-y-3">
                                    <AccordionItem title="Where we need to pivot">
                                        {data.instructor_feedback_pivot}
                                    </AccordionItem>
                                    <AccordionItem title="Your Next Step">
                                        {data.instructor_feedback_next_step}
                                    </AccordionItem>
                                </div>
                            </div>
                        </div>

                        {/* 4. Multi-Agent Expert Panel (Grid) */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                    Individual Expert Panel Breakdown
                                </h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent ml-4"></div>
                            </div>

                            <div className={`grid grid-cols-1 ${data.expert_panel && data.expert_panel.length === 2 ? 'md:grid-cols-2' : data.expert_panel && data.expert_panel.length === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                                {data.expert_panel ? data.expert_panel.map((agent: any) => {
                                    // determine icon and gradient based on assigned_model
                                    let Icon = OpenAIIcon;
                                    let gradient = "from-emerald-400 to-teal-500";
                                    if (agent.assigned_model === 'Gemini') { Icon = GeminiIcon; gradient = "from-blue-500 to-indigo-600"; }
                                    else if (agent.assigned_model === 'xAI') { Icon = XAIIcon; gradient = "from-red-500 to-rose-600"; }
                                    else if (agent.assigned_model === 'Claude') { Icon = ClaudeIcon; gradient = "from-orange-400 to-amber-500"; }

                                    const result = agent.result || {};
                                    const persona = agent.persona || {};

                                    return (
                                        <div key={agent.assigned_model} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-visible">
                                            {/* Colored Header Bar Indicator */}
                                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`}></div>

                                            {/* Header Row */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="pr-2">
                                                    <h4 className="font-bold text-gray-900 flex items-center gap-1.5 leading-tight">
                                                        <Icon size={16} className="text-gray-500 flex-shrink-0" />
                                                        <span className="truncate">{persona.name || agent.assigned_model}</span>
                                                    </h4>
                                                    <p className="text-[11px] font-medium text-gray-500 mt-0.5 uppercase tracking-wider">{persona.title || 'Expert'}</p>
                                                </div>
                                                <div className="flex flex-col items-end flex-shrink-0">
                                                    <div className="text-xl font-black text-gray-800 leading-none">
                                                        {(result.overall_score || 0).toFixed(1)}
                                                    </div>
                                                    <div className="text-[9px] text-gray-400 uppercase font-bold mt-1">Score</div>
                                                </div>
                                            </div>

                                            {/* Persona Description */}
                                            <p className="text-xs text-gray-500 italic mb-4 pb-4 border-b border-gray-100 line-clamp-2">
                                                "{persona.sub_text || 'An expert evaluator.'}"
                                            </p>

                                            {agent.error ? (
                                                <div className="text-xs text-red-500 bg-red-50 p-3 rounded">
                                                    <strong>Model Error:</strong> {agent.error}
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Mini Scores Section */}
                                                    <div className="mb-4 space-y-0.5 relative">
                                                        <MiniScoreBar label="Creativity" score={result.creativity_score || 0} reasoning={result.creativity_reasoning || ''} />
                                                        <MiniScoreBar label="Originality" score={result.originality_score || 0} reasoning={result.originality_reasoning || ''} />
                                                        <MiniScoreBar label="Usefulness" score={result.usefulness_relevance_score || 0} reasoning={result.usefulness_relevance_reasoning || ''} />
                                                        <MiniScoreBar label="Clarity" score={result.clarity_score || 0} reasoning={result.clarity_reasoning || ''} />
                                                        <MiniScoreBar label="Detail" score={result.level_of_detail_elaboration_score || 0} reasoning={result.level_of_detail_elaboration_reasoning || ''} />
                                                        <MiniScoreBar label="Feasibility" score={result.feasibility_score || 0} reasoning={result.feasibility_reasoning || ''} />
                                                    </div>

                                                    {/* Feedback Snippet */}
                                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-4">
                                                        <p className="text-[11px] leading-relaxed text-gray-700 font-medium before:content-['“'] after:content-['”'] before:text-gray-400 after:text-gray-400 max-h-24 overflow-y-auto">
                                                            {result.instructor_feedback || 'No feedback provided.'}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-3 text-sm text-gray-500 text-center py-4">No expert panel data available.</div>
                                )}
                            </div>
                        </div>

                        {/* 5. Statistical Consensus & Bias Dashboard */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                                    <BarChart3 size={16} className="text-indigo-500" />
                                    Statistical Reliability Models
                                </h3>
                                <span className="text-xs text-gray-500 font-mono">N={data.expert_panel ? data.expert_panel.length : 0} Evaluators</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">

                                {/* ICC Block */}
                                <div className="p-6 flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inter-Rater Reliability (ICC)</div>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${data.stats?.icc?.bg ?? 'bg-gray-50'} ${data.stats?.icc?.color ?? 'text-gray-600'} ${data.stats?.icc?.border ?? 'border-gray-200'}`}>
                                            {data.stats?.icc?.label ?? 'Computing...'}
                                        </div>
                                    </div>
                                    <div className="text-4xl font-light text-gray-900 mb-2 tracking-tight">
                                        {data.stats?.icc?.score != null ? data.stats.icc.score.toFixed(2) : '—'}
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-tight">
                                        {data.stats?.icc?.message ?? 'Measures absolute agreement across all domains between the AI agent models. Values > 0.75 indicate excellent reliability.'}
                                    </p>
                                </div>

                                {/* ANOVA Bias Block */}
                                <div className="p-6 flex flex-col justify-center bg-red-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">ANOVA Variance Analysis</div>
                                        <div className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-50 text-red-600 border-red-200">
                                            p = {data.stats?.anova?.p_value != null ? data.stats.anova.p_value : '—'}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 mt-1">
                                        <AlertTriangle size={24} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm font-medium text-gray-800 leading-snug">
                                            {data.stats?.anova?.message ?? 'Analyzing grading variance between models...'}
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-4 leading-tight">
                                        {data.stats?.anova?.significant
                                            ? 'Statistical significance detected (p < 0.05). Indicates one or more agents deviated significantly from the consensus mean in a specific domain.'
                                            : 'No significant bias detected (p ≥ 0.05). The AI panel graded on a consistent scale across all dimensions.'}
                                    </p>
                                </div>

                            </div>
                        </div>

                    </div>

                </div>
            </div>

            {/* Full Scale Image Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        <img
                            src={`http://localhost:8000${data.image_url}`}
                            alt="Full Scale"
                            className="max-w-full max-h-full object-contain"
                        />
                        <button
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <Maximize2 size={32} className="rotate-45" />
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Results;
