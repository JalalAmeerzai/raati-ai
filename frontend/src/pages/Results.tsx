import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Layout, { useTheme } from '../components/Layout';
import axios from 'axios';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Download, Maximize2, Users, BarChart3, X, ArrowRight, Loader2, User } from 'lucide-react';
import jsPDF from 'jspdf';
import { OpenAIIcon, XAIIcon, ClaudeIcon } from '../components/LLMIcons';

/* ───────────────────── TYPES ───────────────────── */

interface PersonaInfo { persona_id: string; name: string; title: string; sub_text: string; prompt: string }
interface AgentResult {
    model_provider: string; persona: PersonaInfo;
    result?: {
        overall_score: number; creativity_score: number; originality_score: number; usefulness_relevance_score: number;
        clarity_score: number; level_of_detail_elaboration_score: number; feasibility_score: number;
        creativity_reasoning: string; originality_reasoning: string; usefulness_relevance_reasoning: string;
        clarity_reasoning: string; level_of_detail_elaboration_reasoning: string; feasibility_reasoning: string;
        instructor_feedback: string;
    }; error?: string;
}
interface PerPersonaICC { persona_id: string; persona_name: string; icc: number | null; label: string }
interface ResultData {
    id: string; submitter_name?: string; image_url: string; description: string;
    creativity_score: number; originality_score: number; usefulness_relevance_score: number;
    clarity_score: number; level_of_detail_elaboration_score: number; feasibility_score: number; overall_score: number;
    creativity_reasoning: string; originality_reasoning: string; usefulness_relevance_reasoning: string;
    clarity_reasoning: string; level_of_detail_elaboration_reasoning: string; feasibility_reasoning: string;
    instructor_feedback_intro: string; instructor_feedback_pivot: string; instructor_feedback_next_step: string;
    expert_panel?: AgentResult[];
    stats?: {
        overall_icc: { score: number | null; label: string; message: string; bg: string; color: string; border: string };
        per_persona_icc: PerPersonaICC[];
        kendalls_w?: { W: number | null };
        variance_analysis?: { per_dimension: Record<string, number>; average_variance: number };
        variance_message: string;
    };
}

/* ───────────────────── SMALL COMPONENTS ───────────────────── */

const MiniScoreBar: React.FC<{ label: string; score: number; reasoning?: string; dark?: boolean; invertTooltip?: boolean }> = ({ label, score, reasoning, dark, invertTooltip }) => {
    const [showTip, setShowTip] = useState(false);
    const pct = (score / 5) * 100;
    let color = "bg-blue-500";
    if (score >= 4.5) color = "bg-emerald-500"; else if (score <= 3.0) color = "bg-red-500"; else if (score < 4.0) color = "bg-amber-500";
    return (
        <div className="relative flex items-center justify-between text-[10px] mb-1.5 last:mb-0 hover:z-[100]" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
            <span className={`font-medium truncate w-16 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
            <div className={`flex-1 mx-2 h-1.5 rounded-full overflow-hidden ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`font-bold w-5 text-right ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{score.toFixed(1)}</span>
            {reasoning && showTip && (
                <div className={`absolute left-1/2 -translate-x-1/2 w-52 p-3 text-[10px] leading-relaxed rounded-lg shadow-2xl border z-[300] pointer-events-none opacity-100 ${dark ? 'bg-white text-gray-800 border-gray-200' : 'bg-gray-900 text-gray-100 border-gray-800'} ${invertTooltip ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                    <div className={`font-bold mb-1 ${dark ? 'text-blue-600' : 'text-blue-400'}`}>{label}</div>
                    <div className="font-medium">{reasoning}</div>
                    
                    {/* Outer border triangle */}
                    <div className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent ${invertTooltip ? `bottom-full ${dark ? 'border-b-gray-200' : 'border-b-gray-800'}` : `top-full ${dark ? 'border-t-gray-200' : 'border-t-gray-800'}`}`} />
                    {/* Inner fill triangle */}
                    <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${invertTooltip ? `bottom-full ${dark ? 'border-b-white' : 'border-b-gray-900'}` : `top-full ${dark ? 'border-t-white' : 'border-t-gray-900'}`}`} />
                </div>
            )}
        </div>
    );
};

const LLMIcon: React.FC<{ provider: string; size?: number }> = ({ provider, size = 16 }) => {
    if (provider === 'xAI') return <XAIIcon size={size} className="flex-shrink-0" />;
    if (provider === 'Claude') return <ClaudeIcon size={size} className="flex-shrink-0" />;
    return <OpenAIIcon size={size} className="flex-shrink-0" />;
};
const llmGradient = (p: string) => p === 'xAI' ? "from-red-500 to-rose-600" : p === 'Claude' ? "from-orange-400 to-amber-500" : "from-emerald-400 to-teal-500";

/* ─── DimBar ─── */
const DimBar: React.FC<{ label: string; score: number; reasoning: string; dark: boolean; invertTooltip?: boolean }> = ({ label, score, reasoning, dark, invertTooltip }) => {
    const [showTip, setShowTip] = useState(false);
    const pct = (score / 5) * 100;
    let color = "bg-blue-500";
    if (score >= 4.5) color = "bg-emerald-500"; else if (score <= 3.0) color = "bg-red-500"; else if (score < 4.0) color = "bg-amber-500";
    return (
        <div className="relative flex items-center gap-2 py-1 cursor-help hover:z-[100]" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
            <span className={`text-[10px] font-semibold w-14 truncate ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
            <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[11px] font-bold w-5 text-right ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{score}</span>
            {showTip && (
                <div className={`absolute left-1/2 -translate-x-1/2 w-56 p-3 text-[10px] leading-relaxed rounded-lg shadow-2xl border z-[300] pointer-events-none opacity-100 ${dark ? 'bg-white text-gray-800 border-gray-200' : 'bg-gray-900 text-gray-100 border-gray-800'} ${invertTooltip ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                    <div className={`font-bold mb-1 ${dark ? 'text-blue-600' : 'text-blue-400'}`}>{label} — {score}/5</div>
                    <div className="font-medium">{reasoning}</div>
                    
                    {/* Outer border triangle */}
                    <div className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent ${invertTooltip ? `bottom-full ${dark ? 'border-b-gray-200' : 'border-b-gray-800'}` : `top-full ${dark ? 'border-t-gray-200' : 'border-t-gray-800'}`}`} />
                    {/* Inner fill triangle */}
                    <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${invertTooltip ? `bottom-full ${dark ? 'border-b-white' : 'border-b-gray-900'}` : `top-full ${dark ? 'border-t-white' : 'border-t-gray-900'}`}`} />
                </div>
            )}
        </div>
    );
};

/* ─── LLM Card ─── */
const LLMCard: React.FC<{ agent: AgentResult; dark: boolean }> = ({ agent, dark }) => {
    const r = agent.result || {} as any;
    const grad = llmGradient(agent.model_provider);
    const cardBg = dark ? 'bg-[#1e2130] border-gray-700/50' : 'bg-white border-gray-200';
    return (
        <div className={`${cardBg} border rounded-xl shadow-sm hover:shadow-md transition-shadow group/card relative`}>
            {/* Gradient bar — rounded top to respect card radius */}
            <div className={`h-1 rounded-t-xl bg-gradient-to-r ${grad} opacity-80 group-hover/card:opacity-100 transition-opacity`} />
            <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5">
                        <LLMIcon provider={agent.model_provider} />
                        <span className={`font-bold text-sm ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{agent.model_provider}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className={`text-xl font-black leading-none ${dark ? 'text-gray-100' : 'text-gray-800'}`}>{(r.overall_score || 0).toFixed(1)}</div>
                        <div className={`text-[9px] uppercase font-bold ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Score</div>
                    </div>
                </div>
                {agent.error ? (
                    <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded"><strong>Error:</strong> {agent.error}</div>
                ) : (
                    <>
                        <div className="mb-3 space-y-0.5">
                            <MiniScoreBar label="Creativity" score={r.creativity_score || 0} reasoning={r.creativity_reasoning} dark={dark} invertTooltip />
                            <MiniScoreBar label="Originality" score={r.originality_score || 0} reasoning={r.originality_reasoning} dark={dark} invertTooltip />
                            <MiniScoreBar label="Usefulness" score={r.usefulness_relevance_score || 0} reasoning={r.usefulness_relevance_reasoning} dark={dark} invertTooltip />
                            <MiniScoreBar label="Clarity" score={r.clarity_score || 0} reasoning={r.clarity_reasoning} dark={dark} />
                            <MiniScoreBar label="Detail" score={r.level_of_detail_elaboration_score || 0} reasoning={r.level_of_detail_elaboration_reasoning} dark={dark} />
                            <MiniScoreBar label="Feasibility" score={r.feasibility_score || 0} reasoning={r.feasibility_reasoning} dark={dark} />
                        </div>
                        <div className={`rounded-lg p-2.5 border ${dark ? 'bg-[#12141c] border-gray-700/50' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-[10px] leading-relaxed font-medium max-h-20 overflow-y-auto ${dark ? 'text-gray-400' : 'text-gray-700'}`}>{r.instructor_feedback || 'No feedback.'}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

/* ─── Soft vertical divider component ─── */
const SoftDivider: React.FC<{ dark: boolean; className?: string }> = ({ dark, className = '' }) => (
    <div className={`hidden lg:flex items-center justify-center w-px ${className}`}>
        <div className={`w-px h-4/5 ${dark
            ? 'bg-gradient-to-b from-transparent via-gray-700/40 to-transparent'
            : 'bg-gradient-to-b from-transparent via-gray-200/80 to-transparent'
        }`} />
    </div>
);

/* ═════════════════════════════════════════════════════════════ */
/*                       MAIN COMPONENT                         */
/* ═════════════════════════════════════════════════════════════ */

const Results: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { dark } = useTheme();
    const [data, setData] = useState<ResultData | null>(location.state?.result || null);
    const [loading, setLoading] = useState(!data);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [pdfLoading, setPdfLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const cardBg = dark ? 'bg-[#181b23] border-gray-700/50' : 'bg-white border-gray-200';
    const subBg  = dark ? 'bg-[#12141c]' : 'bg-gray-50';
    const txt    = dark ? 'text-gray-100' : 'text-gray-800';
    const sub    = dark ? 'text-gray-400' : 'text-gray-500';
    const sub2   = dark ? 'text-gray-500' : 'text-gray-400';
    const divider = dark ? 'border-gray-700/50' : 'border-gray-100';
    const divider2 = dark ? 'border-gray-700/50' : 'border-gray-200';

    useEffect(() => {
        if (!data && id) {
            axios.get(`http://localhost:8000/results/${id}`)
                .then(res => { setData(res.data); setLoading(false); })
                .catch(err => { console.error(err); setLoading(false); });
        }
    }, [id, data]);

    const personaGroups = useMemo(() => {
        if (!data?.expert_panel) return [];
        const g: Map<string, { persona: PersonaInfo; results: AgentResult[] }> = new Map();
        for (const a of data.expert_panel) {
            const pid = a.persona?.persona_id || a.persona?.name || '?';
            if (!g.has(pid)) g.set(pid, { persona: a.persona, results: [] });
            g.get(pid)!.results.push(a);
        }
        return Array.from(g.values());
    }, [data?.expert_panel]);

    /**
     * PDF — builds a multi-page document directly from data using jsPDF.
     * No DOM capture needed, completely avoids oklch/oklab CSS issues.
     */
    const handleDownloadPDF = async () => {
        if (!data) return;
        setPdfLoading(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const W = pdf.internal.pageSize.getWidth();
            const H = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const contentW = W - margin * 2;
            let y = margin;

            const checkPage = (needed: number) => {
                if (y + needed > H - 14) {
                    pdf.addPage();
                    y = margin;
                }
            };

            const addLine = (text: string, size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [31, 41, 55], maxW?: number) => {
                pdf.setFontSize(size);
                pdf.setFont('helvetica', style);
                pdf.setTextColor(...color);
                const w = maxW ?? contentW;
                const lines = pdf.splitTextToSize(text, w);
                checkPage(lines.length * size * 0.5);
                pdf.text(lines, margin, y);
                y += lines.length * size * 0.45 + 2;
            };

            const addSep = () => {
                y += 2;
                checkPage(4);
                pdf.setDrawColor(215, 218, 228);
                pdf.setLineWidth(0.2);
                pdf.line(margin, y, W - margin, y);
                y += 5;
            };

            /* ── Section heading with accent bar ── */
            const addSection = (title: string) => {
                y += 3;
                checkPage(12);
                pdf.setFillColor(26, 35, 126);
                pdf.rect(margin, y, 2, 6, 'F');
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(26, 35, 126);
                pdf.text(title, margin + 5, y + 5);
                y += 11;
            };

            /* ── Table with visible column headers + alternating rows ── */
            const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
                const rowH = 8;
                const fs = 7;
                const accentClr: [number, number, number] = [26, 35, 126];
                const hdrBg: [number, number, number] = [232, 234, 248];
                const hdrBorder: [number, number, number] = [180, 185, 210];
                const cellBorder: [number, number, number] = [220, 222, 232];
                const txtClr: [number, number, number] = [55, 65, 81];
                const altBg: [number, number, number] = [248, 249, 253];

                checkPage(rowH * 2 + 6);

                // Header row
                pdf.setDrawColor(...hdrBorder);
                let xPos = margin;
                for (let c = 0; c < headers.length; c++) {
                    pdf.setFillColor(...hdrBg);
                    pdf.rect(xPos, y, colWidths[c], rowH, 'FD');
                    pdf.setFontSize(fs);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(...accentClr);
                    const hText = pdf.splitTextToSize(headers[c], colWidths[c] - 3);
                    pdf.text(hText[0] || headers[c], xPos + 1.5, y + rowH - 2.5);
                    xPos += colWidths[c];
                }
                y += rowH;

                // Data rows
                for (let ri = 0; ri < rows.length; ri++) {
                    const row = rows[ri];
                    checkPage(rowH + 2);
                    xPos = margin;
                    for (let c = 0; c < row.length; c++) {
                        pdf.setDrawColor(...cellBorder);
                        if (ri % 2 === 1) {
                            pdf.setFillColor(...altBg);
                            pdf.rect(xPos, y, colWidths[c], rowH, 'FD');
                        } else {
                            pdf.rect(xPos, y, colWidths[c], rowH);
                        }
                        pdf.setFontSize(fs);
                        pdf.setFont('helvetica', c === 0 ? 'bold' : 'normal');
                        pdf.setTextColor(...txtClr);
                        const cellText = pdf.splitTextToSize(row[c] || '', colWidths[c] - 3);
                        pdf.text(cellText[0] || '', xPos + 1.5, y + rowH - 2.5);
                        xPos += colWidths[c];
                    }
                    y += rowH;
                }
                y += 4;
            };

            /* ── Badge pill ── */
            const addBadge = (label: string, value: string, badge: string, clr: [number, number, number]) => {
                checkPage(8);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(75, 85, 99);
                pdf.text(label, margin, y);
                pdf.setTextColor(31, 41, 55);
                pdf.text(value, margin + 58, y);
                pdf.setFillColor(...clr);
                const bx = margin + 75;
                pdf.roundedRect(bx, y - 3, 20, 4.5, 1, 1, 'F');
                pdf.setFontSize(6);
                pdf.setTextColor(255, 255, 255);
                pdf.text(badge, bx + 10, y - 0.5, { align: 'center' });
                y += 7;
            };

            // ════════════════════════ HEADER BAR ════════════════════════
            pdf.setFillColor(26, 35, 126);
            pdf.rect(0, 0, W, 18, 'F');
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text('raati.ai — Evaluation Report', margin, 12);
            pdf.setFontSize(8);
            pdf.setTextColor(200, 205, 230);
            pdf.text(`ID: ${data.id}`, W - margin, 12, { align: 'right' });
            y = 24;

            // ════════════════════ IMAGE + OVERALL SCORE + DESCRIPTION ════════════════════
            try {
                const imgUrl = `http://localhost:8000${data.image_url}`;
                const resp = await fetch(imgUrl);
                const blob = await resp.blob();
                const imgData = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                checkPage(55);
                const imgW = 42;
                const imgH = 42;
                pdf.setFillColor(245, 246, 250);
                pdf.roundedRect(margin, y, imgW + 4, imgH + 4, 2, 2, 'F');
                pdf.addImage(imgData, 'JPEG', margin + 2, y + 2, imgW, imgH);

                const infoX = margin + imgW + 10;
                const infoW = contentW - imgW - 10;

                // Overall score badge
                pdf.setFillColor(26, 35, 126);
                pdf.roundedRect(infoX, y, 32, 14, 3, 3, 'F');
                pdf.setFontSize(18);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(255, 255, 255);
                pdf.text(`${data.overall_score}`, infoX + 16, y + 9, { align: 'center' });
                pdf.setFontSize(8);
                pdf.text('/5', infoX + 27, y + 9);
                pdf.setFontSize(6);
                pdf.setTextColor(200, 205, 230);
                pdf.text('COMPOSITE SCORE', infoX + 16, y + 13, { align: 'center' });

                // Description
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(26, 35, 126);
                pdf.text('Assignment Instructions', infoX, y + 20);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(75, 85, 99);
                pdf.setFontSize(7);
                const descLines = pdf.splitTextToSize(data.description || '', infoW);
                pdf.text(descLines.slice(0, 6), infoX, y + 25);
                y += imgH + 8;
            } catch {
                addLine(`Overall Composite Score: ${data.overall_score}/5`, 14, 'bold', [26, 35, 126]);
                y += 4;
            }

            addSep();

            // ════════════════════ RADAR CHART ════════════════════
            try {
                checkPage(75);
                addSection('Score Distribution');
                const cx = W / 2;
                const cy = y + 28;
                const radius = 25;
                const dims = ['Creativity', 'Originality', 'Usefulness', 'Clarity', 'Detail', 'Feasibility'];
                const scores = [
                    data.creativity_score, data.originality_score, data.usefulness_relevance_score,
                    data.clarity_score, data.level_of_detail_elaboration_score, data.feasibility_score
                ];
                const n = dims.length;

                pdf.setDrawColor(220, 225, 235);
                pdf.setLineWidth(0.12);
                for (let ring = 1; ring <= 5; ring++) {
                    const r = (ring / 5) * radius;
                    for (let i = 0; i < n; i++) {
                        const a1 = (Math.PI * 2 * i) / n - Math.PI / 2;
                        const a2 = (Math.PI * 2 * ((i + 1) % n)) / n - Math.PI / 2;
                        pdf.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
                    }
                }
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
                    pdf.line(cx, cy, cx + radius * Math.cos(a), cy + radius * Math.sin(a));
                }
                pdf.setDrawColor(59, 130, 246);
                pdf.setLineWidth(0.5);
                pdf.setFillColor(59, 130, 246);
                const points: [number, number][] = [];
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
                    const r = ((scores[i] || 0) / 5) * radius;
                    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
                }
                for (let i = 0; i < n; i++) {
                    const next = (i + 1) % n;
                    pdf.line(points[i][0], points[i][1], points[next][0], points[next][1]);
                }
                for (const [px, py] of points) pdf.circle(px, py, 0.7, 'F');
                pdf.setFontSize(6.5);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(55, 65, 81);
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
                    const lx = cx + (radius + 7) * Math.cos(a);
                    const ly = cy + (radius + 7) * Math.sin(a);
                    const align = Math.abs(Math.cos(a)) < 0.1 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
                    pdf.text(`${dims[i]} (${scores[i]}/5)`, lx, ly + 1, { align: align as any });
                }
                y = cy + radius + 10;
            } catch (e) { console.warn('Chart error:', e); }

            addSep();

            // ════════════════════ DIMENSION SCORES TABLE ════════════════════
            addSection('Dimension Scores');
            const dimHeaders = ['Dimension', 'Score', 'AI Reasoning'];
            const dimColWidths = [30, 14, contentW - 44];
            const dimRows: string[][] = [
                ['Creativity', `${data.creativity_score}/5`, data.creativity_reasoning || ''],
                ['Originality', `${data.originality_score}/5`, data.originality_reasoning || ''],
                ['Usefulness', `${data.usefulness_relevance_score}/5`, data.usefulness_relevance_reasoning || ''],
                ['Clarity', `${data.clarity_score}/5`, data.clarity_reasoning || ''],
                ['Detail', `${data.level_of_detail_elaboration_score}/5`, data.level_of_detail_elaboration_reasoning || ''],
                ['Feasibility', `${data.feasibility_score}/5`, data.feasibility_reasoning || ''],
            ];
            drawTable(dimHeaders, dimRows, dimColWidths);

            addSep();

            // ════════════════════ INSTRUCTOR FEEDBACK ════════════════════
            addSection('Instructor Feedback');
            if (data.instructor_feedback_intro) {
                addLine(data.instructor_feedback_intro, 8.5, 'normal', [55, 65, 81]);
                y += 3;
            }
            if (data.instructor_feedback_pivot) {
                checkPage(14);
                pdf.setFillColor(255, 248, 235);
                pdf.setDrawColor(245, 190, 80);
                pdf.roundedRect(margin, y, contentW, 12, 1.5, 1.5, 'FD');
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(180, 120, 20);
                pdf.text('\u25B8 PIVOT', margin + 3, y + 4.5);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 80, 40);
                const pivotLines = pdf.splitTextToSize(data.instructor_feedback_pivot, contentW - 8);
                pdf.text(pivotLines[0] || '', margin + 3, y + 9);
                y += 15;
            }
            if (data.instructor_feedback_next_step) {
                checkPage(14);
                pdf.setFillColor(235, 250, 240);
                pdf.setDrawColor(60, 180, 100);
                pdf.roundedRect(margin, y, contentW, 12, 1.5, 1.5, 'FD');
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(16, 125, 80);
                pdf.text('\u25B8 NEXT STEP', margin + 3, y + 4.5);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(40, 100, 60);
                const nextLines = pdf.splitTextToSize(data.instructor_feedback_next_step, contentW - 8);
                pdf.text(nextLines[0] || '', margin + 3, y + 9);
                y += 15;
            }

            addSep();

            // ════════════════════ EXPERT PANEL TABLES ════════════════════
            if (personaGroups.length > 0) {
                addSection(`Expert Panel \u2014 ${personaGroups.length} Personas \u00d7 3 LLMs`);

                for (const group of personaGroups) {
                    checkPage(25);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(59, 130, 246);
                    pdf.text(`${group.persona.name} \u2014 ${group.persona.title}`, margin, y);
                    y += 4;
                    pdf.setFontSize(7);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(130, 135, 150);
                    const stLines = pdf.splitTextToSize(`"${group.persona.sub_text}"`, contentW);
                    pdf.text(stLines[0] || '', margin, y);
                    y += 5;

                    const panelHeaders = ['LLM Provider', 'Overall', 'Creativity', 'Originality', 'Usefulness', 'Clarity', 'Detail', 'Feasibility'];
                    const panelColWidths = [24, 14, 18, 18, 20, 18, 18, 18];
                    const totalUsed = panelColWidths.reduce((a, b) => a + b, 0);
                    if (totalUsed < contentW) panelColWidths[panelColWidths.length - 1] += contentW - totalUsed;

                    const panelRows: string[][] = group.results.map(agent => {
                        const r = agent.result;
                        if (!r) return [agent.model_provider, 'Err', '-', '-', '-', '-', '-', '-'];
                        return [
                            agent.model_provider,
                            r.overall_score.toFixed(1),
                            String(r.creativity_score),
                            String(r.originality_score),
                            String(r.usefulness_relevance_score),
                            String(r.clarity_score),
                            String(r.level_of_detail_elaboration_score),
                            String(r.feasibility_score),
                        ];
                    });
                    drawTable(panelHeaders, panelRows, panelColWidths);
                }
                addSep();
            }

            // ════════════════════ STATISTICAL ANALYSIS ════════════════════
            if (data.stats) {
                addSection('Statistical Analysis');

                // ICC badge
                if (data.stats.overall_icc) {
                    const icc = data.stats.overall_icc;
                    const sc = icc.score;
                    const bClr: [number, number, number] = sc != null && sc >= 0.6 ? [34, 139, 34] : [200, 150, 20];
                    addBadge('Overall ICC (Inter-rater Reliability)', sc?.toFixed(2) ?? 'N/A', icc.label ?? 'N/A', bClr);
                    if (icc.message) {
                        addLine(icc.message, 7.5, 'normal', [100, 110, 125]);
                        y += 2;
                    }
                }

                // Kendall's W badge
                if (data.stats.kendalls_w?.W != null) {
                    const w = data.stats.kendalls_w.W;
                    const wL = w >= 0.7 ? 'Strong' : w >= 0.4 ? 'Moderate' : 'Weak';
                    const wC: [number, number, number] = w >= 0.7 ? [34, 139, 34] : w >= 0.4 ? [200, 150, 20] : [200, 60, 60];
                    addBadge("Kendall's W (Concordance)", w.toFixed(2), wL, wC);
                }

                // Variance badge
                if (data.stats.variance_analysis) {
                    const av = data.stats.variance_analysis.average_variance;
                    const avL = av != null ? (av <= 0.5 ? 'Low' : av <= 1.2 ? 'Moderate' : 'High') : 'N/A';
                    const avC: [number, number, number] = av != null && av <= 0.5 ? [34, 139, 34] : av != null && av <= 1.2 ? [200, 150, 20] : [200, 60, 60];
                    addBadge('Avg Dimension Variance', av?.toFixed(2) ?? 'N/A', avL, avC);
                }

                // Variance interpretation
                if (data.stats.variance_message) {
                    y += 1;
                    addLine(data.stats.variance_message, 7.5, 'normal', [100, 110, 125]);
                    y += 3;
                }

                // Per-Persona ICC table
                if (data.stats.per_persona_icc?.length) {
                    y += 2;
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(55, 65, 81);
                    pdf.text('Per-Persona ICC (Model Agreement per Expert)', margin, y);
                    y += 5;
                    const pHeaders = ['Persona Name', 'ICC Score', 'Reliability'];
                    const pColWidths = [contentW - 50, 25, 25];
                    const pRows = data.stats.per_persona_icc.map(p => [
                        p.persona_name,
                        p.icc?.toFixed(2) ?? 'N/A',
                        p.label,
                    ]);
                    drawTable(pHeaders, pRows, pColWidths);
                }

                // Per-Dimension Variance table
                if (data.stats.variance_analysis?.per_dimension && Object.keys(data.stats.variance_analysis.per_dimension).length > 0) {
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(55, 65, 81);
                    pdf.text('Per-Dimension Variance (Score Spread by Category)', margin, y);
                    y += 5;
                    const vHeaders = ['Dimension', 'Variance (\u03C3\u00B2)'];
                    const vColWidths = [contentW - 30, 30];
                    const vRows = Object.entries(data.stats.variance_analysis.per_dimension)
                        .sort((a, b) => b[1] - a[1])
                        .map(([dim, val]) => [dim.replace(/_/g, ' '), val.toFixed(3)]);
                    drawTable(vHeaders, vRows, vColWidths);
                }
            }

            // ════════════════════ FOOTER ════════════════════
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFillColor(245, 246, 250);
                pdf.rect(0, H - 10, W, 10, 'F');
                pdf.setFontSize(6.5);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(140, 145, 160);
                pdf.text('raati.ai \u2014 AI Creativity Assessment Platform', margin, H - 4);
                pdf.text(`Page ${i} of ${pageCount}`, W - margin, H - 4, { align: 'right' });
            }

            pdf.save(`raati-report-${data.id.slice(0, 8)}.pdf`);
        } catch (e) {
            console.error('PDF generation error:', e);
        } finally {
            setPdfLoading(false);
        }
    };

    if (loading) return <Layout title="Results"><div className="p-8">Loading...</div></Layout>;
    if (!data) return <Layout title="Results"><div className="p-8">Result not found</div></Layout>;

    const chartData = [
        { subject: 'Creativity', A: Number(data.creativity_score), fullMark: 5 },
        { subject: 'Originality', A: Number(data.originality_score), fullMark: 5 },
        { subject: 'Usefulness', A: Number(data.usefulness_relevance_score), fullMark: 5 },
        { subject: 'Clarity', A: Number(data.clarity_score), fullMark: 5 },
        { subject: 'Detail', A: Number(data.level_of_detail_elaboration_score), fullMark: 5 },
        { subject: 'Feasibility', A: Number(data.feasibility_score), fullMark: 5 },
    ];
    const totalResults = data.expert_panel?.length || 0;

    return (
        <Layout title="raati.ai — Evaluation Report">
            <div ref={reportRef} className="space-y-5 transition-colors duration-300">

                {/* ═══════════════════════════════════════════════════════ */}
                {/* ROW 1: ASSESSMENT SUMMARY                              */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className={`${cardBg} border rounded-xl shadow-sm`}>
                    {/* Section header */}
                    <div className={`px-5 py-3 border-b ${divider} flex items-center justify-between rounded-t-xl`}>
                        <h2 className={`text-xs font-bold uppercase tracking-widest ${txt}`}>Assessment Summary</h2>
                        <div className="flex items-center gap-4">
                            {data.submitter_name && (
                                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${sub}`}>
                                    <User size={13} strokeWidth={2.5} className="opacity-60" />
                                    {data.submitter_name.trim()}
                                </span>
                            )}
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${sub2}`}>
                                ID: {data.id?.slice(0, 8)}
                            </span>
                        </div>
                    </div>

                    {/* 3-column layout with soft gradient dividers */}
                    <div className="flex flex-col lg:flex-row">

                        {/* Col A: Image + Desc (≈3/12) */}
                        <div className="lg:w-3/12 p-5 flex-shrink-0">
                            <div
                                className={`group relative aspect-square rounded-lg overflow-hidden border cursor-pointer ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}
                                onClick={() => setIsModalOpen(true)}
                            >
                                <img src={`http://localhost:8000${data.image_url}`} alt="Sketch" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full text-white"><Maximize2 size={20} /></div>
                                </div>
                            </div>
                            <p className={`text-[11px] leading-relaxed mt-3 line-clamp-3 ${sub}`}>{data.description}</p>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={pdfLoading}
                                className={`mt-3 w-full py-1.5 border rounded-lg font-medium text-[10px] flex items-center justify-center gap-1.5 transition-colors ${
                                    dark ? 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10' : 'border-[#1a237e] text-[#1a237e] hover:bg-blue-50'
                                } ${pdfLoading ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                <span>{pdfLoading ? 'Generating...' : 'Download PDF'}</span>
                            </button>
                        </div>

                        {/* Soft divider 1 */}
                        <SoftDivider dark={dark} />

                        {/* Col B: Radar Chart (≈4/12) */}
                        <div className="lg:w-4/12 p-5 relative flex flex-col flex-shrink-0">
                            <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none ${dark ? 'bg-blue-500/10' : 'bg-blue-500/5'}`} />
                            
                            {/* Title container at the top */}
                            <div className="flex items-center justify-between relative z-10">
                                <h3 className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${sub}`}>
                                    <Users size={13} className="text-blue-500" /> Panel Consensus
                                </h3>
                                <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full border ${dark ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                    {totalResults} evals
                                </span>
                            </div>

                            {/* Centered chart container */}
                            <div className="flex-1 flex flex-col justify-center mt-4">
                                <div className="h-56 relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                            <PolarGrid stroke={dark ? '#374151' : '#e5e7eb'} />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: dark ? '#9ca3af' : '#6b7280', fontSize: 9, fontWeight: 500 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                            <Radar name="Score" dataKey="A" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorUv)" fillOpacity={0.4} />
                                            <defs>
                                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                </linearGradient>
                                            </defs>
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-center relative z-10 -mt-1">
                                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-indigo-700 tracking-tighter">{data.overall_score}</span>
                                    <span className={`text-xl font-bold ${sub2}`}>/5</span>
                                    <div className={`text-[9px] font-bold tracking-widest uppercase ${sub2}`}>Composite Score</div>
                                </div>
                            </div>
                        </div>

                        {/* Soft divider 2 */}
                        <SoftDivider dark={dark} />

                        {/* Col C: Feedback + Dimensions (≈5/12) */}
                        <div className="lg:w-5/12 p-5 flex flex-col flex-shrink-0">
                            <h3 className={`text-xs font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${sub}`}>
                                <span className="text-[13px]">💡</span> Instructor Feedback
                            </h3>
                            <p className={`text-[11px] leading-relaxed mb-5 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{data.instructor_feedback_intro}</p>

                            <h3 className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Dimension Scores</h3>
                            <div className="mb-3">
                                <DimBar label="Creativity" score={data.creativity_score} reasoning={data.creativity_reasoning} dark={dark} invertTooltip />
                                <DimBar label="Originality" score={data.originality_score} reasoning={data.originality_reasoning} dark={dark} invertTooltip />
                                <DimBar label="Usefulness" score={data.usefulness_relevance_score} reasoning={data.usefulness_relevance_reasoning} dark={dark} invertTooltip />
                                <DimBar label="Clarity" score={data.clarity_score} reasoning={data.clarity_reasoning} dark={dark} />
                                <DimBar label="Detail" score={data.level_of_detail_elaboration_score} reasoning={data.level_of_detail_elaboration_reasoning} dark={dark} />
                                <DimBar label="Feasibility" score={data.feasibility_score} reasoning={data.feasibility_reasoning} dark={dark} />
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className={`rounded-lg p-2.5 border flex flex-col h-[6.5rem] ${dark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 flex-shrink-0 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>
                                        <ArrowRight size={10} className="inline mr-0.5 -mt-0.5" />Pivot
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-1">
                                        <p className={`text-[10px] leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{data.instructor_feedback_pivot}</p>
                                    </div>
                                </div>
                                <div className={`rounded-lg p-2.5 border flex flex-col h-[6.5rem] ${dark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 flex-shrink-0 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        <ArrowRight size={10} className="inline mr-0.5 -mt-0.5" />Next Step
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-1">
                                        <p className={`text-[10px] leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{data.instructor_feedback_next_step}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* ROW 2: EXPERT PANEL + STATISTICS                       */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

                    {/* Expert Panel (8/12) */}
                    <div className="lg:col-span-8 flex flex-col">
                        <div className={`${cardBg} border rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col`}>
                            <div className={`${subBg} px-4 py-3 border-b ${divider2} flex items-center justify-between`}>
                                <h3 className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${txt}`}>
                                    <Users size={13} className="text-indigo-500" /> Expert Panel
                                </h3>
                                <span className={`text-[9px] rounded-full px-2.5 py-1 font-bold uppercase tracking-widest border ${dark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                    {personaGroups.length} Personas × 3 LLMs
                                </span>
                            </div>
                        {personaGroups.length > 0 ? (
                            <>
                                <div className={`flex border-b ${divider2}`}>
                                    {personaGroups.map((g, idx) => {
                                        const valid = g.results.filter(r => r.result);
                                        const avg = valid.length > 0 ? valid.reduce((s, r) => s + (r.result?.overall_score || 0), 0) / valid.length : 0;
                                        return (
                                            <button key={g.persona.persona_id || idx} onClick={() => setActiveTab(idx)}
                                                className={`flex-1 px-3 py-3 text-left transition-all border-b-2 ${activeTab === idx
                                                    ? `border-blue-500 ${dark ? 'bg-[#181b23]' : 'bg-white'}`
                                                    : `border-transparent ${dark ? 'hover:bg-[#1e2130] bg-[#12141c]' : 'hover:bg-gray-50 bg-gray-50/50'}`}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0">
                                                        <div className={`font-bold text-sm truncate ${activeTab === idx ? (dark ? 'text-gray-100' : 'text-gray-900') : sub}`}>{g.persona.name}</div>
                                                        <div className={`text-[10px] uppercase tracking-wider truncate mt-0.5 ${sub2}`}>{g.persona.title}</div>
                                                    </div>
                                                    <div className={`text-lg font-black ml-2 flex-shrink-0 ${activeTab === idx ? 'text-blue-500' : sub2}`}>{avg.toFixed(1)}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {personaGroups[activeTab] && (
                                    <div className={`flex-1 p-5 ${dark ? 'bg-[#181b23]' : 'bg-white'}`}>
                                        <p className={`text-xs italic mb-4 pb-3 border-b ${divider} ${sub}`}>"{personaGroups[activeTab].persona.sub_text}"</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {personaGroups[activeTab].results.map((a, i) => <LLMCard key={`${a.model_provider}-${i}`} agent={a} dark={dark} />)}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={`text-sm text-center py-8 flex-1 flex items-center justify-center ${sub}`}>No expert panel data.</div>
                        )}
                        </div>
                    </div>

                    {/* Statistics (4/12) */}
                    <div className="lg:col-span-4 flex flex-col">
                        <div className={`${cardBg} border rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col`}>
                            <div className={`${subBg} px-4 py-3 border-b ${divider2} flex items-center justify-between`}>
                                <h3 className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${txt}`}>
                                    <BarChart3 size={13} className="text-indigo-500" /> Statistics
                                </h3>
                                <span className={`text-[10px] font-mono ${sub}`}>N={totalResults}</span>
                            </div>
                            <div className={`p-4 border-b ${divider}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Overall ICC</div>
                                    {(() => {
                                        const icc = data.stats?.overall_icc;
                                        const score = icc?.score;
                                        let badgeBg = '', badgeText = '', badgeBorder = '';
                                        if (score != null && score >= 0.6) {
                                            badgeBg = dark ? 'bg-green-500/10' : 'bg-green-50';
                                            badgeText = dark ? 'text-green-400' : 'text-green-700';
                                            badgeBorder = dark ? 'border-green-500/30' : 'border-green-200';
                                        } else {
                                            badgeBg = dark ? 'bg-yellow-500/10' : 'bg-yellow-50';
                                            badgeText = dark ? 'text-yellow-400' : 'text-yellow-700';
                                            badgeBorder = dark ? 'border-yellow-500/30' : 'border-yellow-200';
                                        }
                                        return (
                                            <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeBg} ${badgeText} ${badgeBorder}`}>
                                                {icc?.label ?? '...'}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className={`text-3xl font-light mb-1 tracking-tight ${txt}`}>{data.stats?.overall_icc?.score != null ? data.stats.overall_icc.score.toFixed(2) : '—'}</div>
                                <p className={`text-[10px] leading-tight ${sub}`}>{data.stats?.overall_icc?.message ?? 'Measures agreement across evaluations.'}</p>
                            </div>
                            {data.stats?.kendalls_w?.W != null && (
                                <div className={`p-4 border-b ${divider}`}>
                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${sub}`}>Concordance & Variance</div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-[11px] ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Kendall's W</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[11px] font-bold ${txt}`}>{data.stats.kendalls_w.W.toFixed(2)}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                                data.stats.kendalls_w.W >= 0.7 ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 
                                                data.stats.kendalls_w.W >= 0.4 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30' : 
                                                'bg-red-500/10 text-red-400 border border-red-500/30'
                                            }`}>
                                                {data.stats.kendalls_w.W >= 0.7 ? 'Strong' : data.stats.kendalls_w.W >= 0.4 ? 'Moderate' : 'Weak'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-transparent mt-2">
                                        <span className={`text-[11px] ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Avg Dimension Variance</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[11px] font-bold ${txt}`}>{data.stats.variance_analysis?.average_variance?.toFixed(2) ?? '—'}</span>
                                            {data.stats.variance_analysis?.average_variance != null && (
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                                    data.stats.variance_analysis.average_variance <= 0.5 ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 
                                                    data.stats.variance_analysis.average_variance <= 1.2 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30' : 
                                                    'bg-red-500/10 text-red-400 border border-red-500/30'
                                                }`}>
                                                    {data.stats.variance_analysis.average_variance <= 0.5 ? 'Low' : data.stats.variance_analysis.average_variance <= 1.2 ? 'Moderate' : 'High'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {data.stats.variance_analysis?.per_dimension && Object.keys(data.stats.variance_analysis.per_dimension).length > 0 && (
                                        <div className="mt-2 text-[9px] text-gray-500 flex items-center justify-between">
                                            <span>Highest Var:</span>
                                            <span className="font-medium text-gray-400">{Object.entries(data.stats.variance_analysis.per_dimension).sort((a,b)=>b[1]-a[1])[0][0].replace(/_/g, ' ')}</span>
                                        </div>
                                    )}
                                    <p className={`text-[10px] mt-3 leading-tight ${sub}`}>
                                        {data.stats?.variance_message ?? 'Analyzing score variance across models...'}
                                    </p>
                                </div>
                            )}

                            {data.stats?.per_persona_icc && data.stats.per_persona_icc.length > 0 && (
                                <div className="p-4 flex-1">
                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${sub}`}>Per-Persona ICC3</div>
                                    <div className="space-y-2">
                                        {data.stats.per_persona_icc.map((item) => (
                                            <div key={item.persona_id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${dark ? 'bg-[#12141c] border-gray-700/50' : 'bg-gray-50 border-gray-100'}`}>
                                                <span className={`text-[10px] font-semibold truncate ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{item.persona_name}</span>
                                                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                                    <span className={`text-xs font-bold ${txt}`}>{item.icc != null ? item.icc.toFixed(2) : '—'}</span>
                                                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                                                        item.label === 'Excellent' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                                                        item.label === 'Good' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                                                        item.label === 'Moderate' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                                                        `${dark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} ${sub}`
                                                    }`}>{item.label}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Image Modal — hover-reveal caption ═══ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={() => setIsModalOpen(false)}>
                    {/* Close button */}
                    <button
                        className="absolute top-5 right-5 z-[60] text-white/70 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 rounded-full transition-all"
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
                    >
                        <X size={24} />
                    </button>

                    {/* Image with hover-reveal caption */}
                    <div className="group/modal relative max-w-5xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={`http://localhost:8000${data.image_url}`}
                            alt="Full Scale"
                            className="w-full max-h-[90vh] object-contain rounded-lg"
                        />
                        {/* Caption: hidden by default, shown on hover with dark semi-transparent background */}
                        <div className="absolute bottom-0 left-0 right-0 rounded-b-lg opacity-0 group-hover/modal:opacity-100 transition-opacity duration-300 bg-black/70 backdrop-blur-sm pt-4 pb-5 px-6">
                            <div className="max-h-28 overflow-y-auto">
                                <p className="text-white/95 text-sm leading-relaxed">{data.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Results;
