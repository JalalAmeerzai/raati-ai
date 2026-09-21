import React, { useState, useEffect, useCallback } from 'react';
import Layout, { useTheme } from '../components/Layout';
import { BookUser, Trash2, RefreshCw, Sparkles, Plus, UploadCloud, ChevronDown, ChevronUp, Search } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

interface SavedPersona {
    persona_id: string;
    name: string;
    title: string;
    sub_text: string;
    prompt: string;
    source_reference: string;
    created_at: string;
}

const PersonaLibrary: React.FC = () => {
    const { dark } = useTheme();
    const navigate = useNavigate();
    const [personas, setPersonas] = useState<SavedPersona[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genFile, setGenFile] = useState<File | null>(null);
    const [genText, setGenText] = useState('');
    const [numPersonas, setNumPersonas] = useState(3);
    const [showGenerator, setShowGenerator] = useState(false);
    const [genSuccess, setGenSuccess] = useState<string | null>(null);
    const [genError, setGenError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const inputBg = dark ? 'bg-[#12141c] border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900';
    const labelClr = dark ? 'text-gray-300' : 'text-gray-700';

    const fetchPersonas = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/personas`);
            setPersonas(res.data.personas || []);
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this persona from the library?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/personas/${id}`);
            setPersonas(p => p.filter(x => x.persona_id !== id));
        } catch { alert('Failed to delete persona.'); }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenSuccess(null);
        setGenError(null);
        try {
            const fd = new FormData();
            fd.append('num_personas', String(numPersonas));
            fd.append('persona_text', genText);
            if (genFile) fd.append('persona_file', genFile);
            const res = await axios.post(`${API_BASE_URL}/personas/generate`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setGenSuccess(`✅ ${res.data.count} new personas added to the library.`);
            setGenText('');
            setGenFile(null);
            await fetchPersonas();
        } catch (err: any) {
            setGenError(err?.response?.data?.detail || 'Failed to generate personas.');
        } finally {
            setIsGenerating(false);
        }
    };

    const filtered = personas.filter(p =>
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.sub_text.toLowerCase().includes(search.toLowerCase())
    );

    const cardBg = dark ? 'bg-[#181b23] border-gray-700/50' : 'bg-white border-gray-200';

    return (
        <Layout title="Persona Library">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header bar */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={`text-xl font-bold ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
                            Persona Library
                        </h2>
                        <p className={`text-sm mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {personas.length} saved persona{personas.length !== 1 ? 's' : ''} — select during evaluation to skip the recruiter agent.
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={fetchPersonas}
                            className={`p-2 rounded-lg border transition-colors ${dark ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setShowGenerator(s => !s)}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus size={15} />
                            <span>Generate Personas</span>
                        </button>
                        <button
                            onClick={() => navigate('/evaluate')}
                            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <BookUser size={15} />
                            <span>Use in Evaluation</span>
                        </button>
                    </div>
                </div>

                {/* Generator Panel */}
                {showGenerator && (
                    <div className={`${cardBg} border rounded-xl p-6`}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center space-x-2">
                                <Sparkles size={18} className="text-blue-400" />
                                <h3 className={`font-semibold ${dark ? 'text-gray-200' : 'text-gray-800'}`}>Generate New Personas</h3>
                            </div>
                            <button onClick={() => setShowGenerator(false)} className={dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}>
                                <ChevronUp size={18} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-5 mb-5">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Upload Profile File (PDF/MD/TXT)</label>
                                <label className={`cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg border text-sm transition-colors w-full ${dark ? 'border-gray-600 hover:bg-gray-800 text-gray-300 bg-[#12141c]' : 'border-gray-300 hover:bg-gray-50 text-gray-700 bg-white'}`}>
                                    <UploadCloud size={16} />
                                    <span className="truncate">{genFile ? genFile.name : 'Choose File'}</span>
                                    <input type="file" className="hidden" onChange={(e) => setGenFile(e.target.files?.[0] || null)} accept=".pdf,.md,.txt,.doc,.docx" />
                                </label>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Number of Personas to Generate</label>
                                <select
                                    value={numPersonas}
                                    onChange={(e) => setNumPersonas(Number(e.target.value))}
                                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${inputBg}`}
                                >
                                    <option value={3}>3 Personas</option>
                                    <option value={4}>4 Personas</option>
                                    <option value={5}>5 Personas</option>
                                </select>
                            </div>
                        </div>
                        <div className="mb-5">
                            <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Paste Profile Details (optional)</label>
                            <textarea
                                value={genText}
                                onChange={(e) => setGenText(e.target.value)}
                                className={`w-full px-4 py-3 rounded-lg border text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors ${inputBg}`}
                                rows={4}
                                placeholder="Paste a resume, bio, or role description. The recruiter agent will use this profile to generate related expert personas..."
                            />
                        </div>
                        {genSuccess && <p className="text-sm text-emerald-500 mb-4">{genSuccess}</p>}
                        {genError && <p className="text-sm text-red-400 mb-4">{genError}</p>}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || (!genFile && !genText.trim())}
                            className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${isGenerating || (!genFile && !genText.trim()) ? (dark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed') : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        >
                            {isGenerating
                                ? <><RefreshCw size={15} className="animate-spin" /><span>Generating with Claude Sonnet...</span></>
                                : <><Sparkles size={15} /><span>Generate & Save to Library</span></>
                            }
                        </button>
                    </div>
                )}

                {/* Search Bar */}
                {personas.length > 0 && (
                    <div className="relative">
                        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, title, or focus area..."
                            className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm ${inputBg}`}
                        />
                    </div>
                )}

                {/* Persona Cards */}
                {isLoading ? (
                    <div className={`text-center py-16 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <RefreshCw size={28} className="mx-auto mb-3 animate-spin opacity-50" />
                        <p>Loading library...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={`${cardBg} border rounded-xl p-16 text-center`}>
                        <BookUser size={40} className="mx-auto mb-4 opacity-30" />
                        <p className={`font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {personas.length === 0 ? 'No personas saved yet' : 'No personas match your search'}
                        </p>
                        {personas.length === 0 && (
                            <p className={`text-sm mt-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                                Click "Generate Personas" above to create and save your first expert personas.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {filtered.map(p => {
                            const expanded = expandedId === p.persona_id;
                            return (
                                <div key={p.persona_id} className={`${cardBg} border rounded-xl overflow-hidden transition-all`}>
                                    <div
                                        className="flex items-start justify-between p-4 cursor-pointer"
                                        onClick={() => setExpandedId(expanded ? null : p.persona_id)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className={`font-semibold ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{p.name}</p>
                                                    <p className={`text-sm ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{p.title}</p>
                                                </div>
                                            </div>
                                            <p className={`text-sm mt-2 ml-12 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{p.sub_text}</p>
                                            <p className={`text-xs mt-1 ml-12 ${dark ? 'text-gray-700' : 'text-gray-400'}`}>
                                                {p.source_reference} · {new Date(p.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(p.persona_id); }}
                                                className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-gray-600 hover:text-red-400 hover:bg-gray-800' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            {expanded ? <ChevronUp size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} /> : <ChevronDown size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} />}
                                        </div>
                                    </div>
                                    {expanded && (
                                        <div className={`px-5 pb-5 border-t ${dark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                                            <p className={`text-xs font-medium uppercase tracking-wider mt-4 mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Evaluation Prompt</p>
                                            <p className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{p.prompt}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PersonaLibrary;
