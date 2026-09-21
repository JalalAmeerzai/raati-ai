import React, { useState, useEffect, useCallback } from 'react';
import Layout, { useTheme } from '../components/Layout';
import { UploadCloud, User, BookUser, Plus, Trash2, CheckSquare, Square, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface SavedPersona {
    persona_id: string;
    name: string;
    title: string;
    sub_text: string;
    prompt: string;
    source_reference: string;
    created_at: string;
}

const Evaluate: React.FC = () => {
    const navigate = useNavigate();
    const { dark } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [submitterName, setSubmitterName] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Recruiter mode
    const [recruiterMode, setRecruiterMode] = useState<'dynamic' | 'custom' | 'saved'>('dynamic');

    // Custom persona state
    const [personaFile, setPersonaFile] = useState<File | null>(null);
    const [personaText, setPersonaText] = useState('');

    // Saved Persona Panel state
    const [savedPersonas, setSavedPersonas] = useState<SavedPersona[]>([]);
    const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set());
    const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);

    // Generate section state (within Saved Panel)
    const [genFile, setGenFile] = useState<File | null>(null);
    const [genText, setGenText] = useState('');
    const [numPersonas, setNumPersonas] = useState(3);
    const [showGenerateSection, setShowGenerateSection] = useState(true);

    const fetchPersonas = useCallback(async () => {
        setIsLoadingPersonas(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/personas`);
            setSavedPersonas(res.data.personas || []);
        } catch {
            // ignore
        } finally {
            setIsLoadingPersonas(false);
        }
    }, []);

    useEffect(() => {
        if (recruiterMode === 'saved') fetchPersonas();
    }, [recruiterMode, fetchPersonas]);

    const togglePersona = (id: string) => {
        setSelectedPersonaIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleDeletePersona = async (id: string) => {
        try {
            await axios.delete(`${API_BASE_URL}/personas/${id}`);
            setSavedPersonas(p => p.filter(x => x.persona_id !== id));
            setSelectedPersonaIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        } catch { alert('Failed to delete persona.'); }
    };

    const handleGenerateAndSave = async () => {
        setIsGenerating(true);
        setGenerateSuccess(null);
        setGenerateError(null);
        try {
            const fd = new FormData();
            fd.append('num_personas', String(numPersonas));
            fd.append('persona_text', genText);
            if (genFile) fd.append('persona_file', genFile);
            const res = await axios.post(`${API_BASE_URL}/personas/generate`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setGenerateSuccess(`✅ ${res.data.count} personas generated and saved to library!`);
            await fetchPersonas();
        } catch (err: any) {
            setGenerateError(err?.response?.data?.detail || 'Failed to generate personas.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragLeave = () => setIsDragOver(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
    };
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const isSubmitDisabled = () => {
        if (isLoading || !file || !description || !submitterName.trim()) return true;
        if (recruiterMode === 'saved' && selectedPersonaIds.size < 3) return true;
        return false;
    };

    const handleSubmit = async () => {
        if (isSubmitDisabled()) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append('image', file!);
        formData.append('description', description);
        formData.append('submitter_name', submitterName.trim());
        formData.append('recruiter_mode', recruiterMode);
        if (recruiterMode === 'custom') {
            if (personaFile) formData.append('persona_file', personaFile);
            if (personaText) formData.append('persona_text', personaText);
        }
        if (recruiterMode === 'saved') {
            formData.append('selected_persona_ids', Array.from(selectedPersonaIds).join(','));
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/evaluate`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            navigate(`/results/${response.data.id}`, { state: { result: response.data } });
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Failed to analyze design. Please check backend.');
        } finally {
            setIsLoading(false);
        }
    };

    const cardBg  = dark ? 'bg-[#181b23] border-gray-700/50' : 'bg-white border-gray-200';
    const inputBg = dark ? 'bg-[#12141c] border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900';
    const dropBg  = isDragOver
        ? (dark ? 'border-blue-400 bg-blue-500/10' : 'border-blue-500 bg-blue-50')
        : (dark ? 'border-gray-700 hover:bg-[#12141c]' : 'border-gray-300 hover:bg-gray-50');
    const labelClr = dark ? 'text-gray-300' : 'text-gray-700';
    const panelBg = dark ? 'border-gray-700 bg-[#151821]' : 'border-gray-300 bg-gray-50';

    const modeCard = (mode: 'dynamic' | 'custom' | 'saved', label: string, desc: string, icon: React.ReactNode) => (
        <button
            type="button"
            onClick={() => setRecruiterMode(mode)}
            className={`p-4 rounded-lg border-2 text-left flex items-start space-x-3 transition-colors ${
                recruiterMode === mode
                    ? (dark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50')
                    : (dark ? 'border-gray-700 hover:border-gray-600 bg-[#12141c]' : 'border-gray-200 hover:border-gray-300 bg-white')
            }`}
        >
            <div className={`mt-0.5 rounded-full p-1 flex-shrink-0 ${recruiterMode === mode ? 'bg-blue-500 text-white' : (dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')}`}>
                {icon}
            </div>
            <div>
                <h4 className={`font-medium ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{label}</h4>
                <p className={`text-sm mt-1 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{desc}</p>
            </div>
        </button>
    );

    return (
        <Layout title="Run Evaluation">
            <div className={`max-w-4xl mx-auto ${cardBg} border rounded-xl shadow-sm p-8 transition-colors`}>

                {/* Upload Area */}
                <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Student Sketch</label>
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${dropBg}`}
                    >
                        <UploadCloud size={48} className={dark ? 'text-gray-600 mb-4' : 'text-gray-400 mb-4'} />
                        <p className={`font-medium mb-1 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>Drag & drop your design sketch image here</p>
                        <p className={`text-sm mb-4 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>or <label className="text-blue-500 hover:text-blue-400 cursor-pointer font-medium">browse files<input type="file" className="hidden" onChange={handleFileSelect} accept="image/*" /></label></p>
                        <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>(Supports .jpg, .png, .pdf)</p>
                        {file && (
                            <div className={`mt-4 p-2 rounded text-sm font-medium ${dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                Selected: {file.name}
                            </div>
                        )}
                    </div>
                </div>

                {/* Name Field */}
                <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Your Name</label>
                    <div className="relative">
                        <User size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-600' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            value={submitterName}
                            onChange={(e) => setSubmitterName(e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-blue-500 focus:border-blue-500 transition-colors ${inputBg}`}
                            placeholder="Enter your full name (e.g., Jalal Ghaffar)"
                        />
                    </div>
                </div>

                {/* Text Area */}
                <div className="mb-8">
                    <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Design Description/Rationale</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-blue-500 focus:border-blue-500 transition-colors ${inputBg}`}
                        rows={4}
                        placeholder="Briefly describe the concept, intent, and creative choices behind your sketch..."
                    />
                </div>

                {/* Recruiter Agent Mode */}
                <div className="mb-8">
                    <label className={`block text-sm font-medium mb-3 ${labelClr}`}>Recruiter Agent Mode</label>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {modeCard('dynamic', 'Dynamic Generation', 'Automatically infers expert personas from your design description.',
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        )}
                        {modeCard('custom', 'Custom Persona', 'Upload a resume/MD or paste details to anchor personas to a specific background.',
                            <User size={16} />
                        )}
                        {modeCard('saved', 'Saved Persona Panel', 'Select 3+ personas from your persistent library, skipping the recruiter model call.',
                            <BookUser size={16} />
                        )}
                    </div>

                    {/* Custom Persona Inputs */}
                    {recruiterMode === 'custom' && (
                        <div className={`p-5 rounded-lg border border-dashed mt-4 ${panelBg}`}>
                            <div className="mb-4">
                                <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Upload Persona File (Resume/PDF/MD)</label>
                                <div className="flex items-center space-x-4">
                                    <label className={`cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded border transition-colors ${dark ? 'border-gray-600 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-white text-gray-700'}`}>
                                        <UploadCloud size={16} />
                                        <span className="text-sm">Choose File</span>
                                        <input type="file" className="hidden" onChange={(e) => setPersonaFile(e.target.files?.[0] || null)} accept=".pdf,.md,.txt,.doc,.docx" />
                                    </label>
                                    {personaFile
                                        ? <span className={`text-sm font-medium ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{personaFile.name}</span>
                                        : <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-500'}`}>No file chosen</span>
                                    }
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${labelClr}`}>Paste Persona Details</label>
                                <textarea
                                    value={personaText}
                                    onChange={(e) => setPersonaText(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg border focus:ring-blue-500 focus:border-blue-500 transition-colors ${inputBg}`}
                                    rows={3}
                                    placeholder="Optional: Paste text description or profile details for the recruiter agent..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Saved Persona Panel */}
                    {recruiterMode === 'saved' && (
                        <div className={`rounded-lg border mt-4 overflow-hidden ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                            {/* Generate Section */}
                            <div className={`${dark ? 'bg-[#1c2030] border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
                                <button
                                    type="button"
                                    onClick={() => setShowGenerateSection(s => !s)}
                                    className={`w-full px-5 py-3 flex items-center justify-between ${dark ? 'text-gray-200' : 'text-gray-700'}`}
                                >
                                    <span className="flex items-center space-x-2 text-sm font-semibold">
                                        <Sparkles size={15} className="text-blue-400" />
                                        <span>Generate New Personas</span>
                                    </span>
                                    {showGenerateSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {showGenerateSection && (
                                    <div className="px-5 pb-5">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className={`block text-xs font-medium mb-1.5 ${labelClr}`}>Upload Profile File (PDF/MD/TXT)</label>
                                                <label className={`cursor-pointer inline-flex items-center space-x-2 px-3 py-2 rounded border text-sm transition-colors ${dark ? 'border-gray-600 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-white text-gray-700'}`}>
                                                    <UploadCloud size={14} />
                                                    <span>{genFile ? genFile.name : 'Choose File'}</span>
                                                    <input type="file" className="hidden" onChange={(e) => setGenFile(e.target.files?.[0] || null)} accept=".pdf,.md,.txt,.doc,.docx" />
                                                </label>
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-medium mb-1.5 ${labelClr}`}>Number to Generate</label>
                                                <select
                                                    value={numPersonas}
                                                    onChange={(e) => setNumPersonas(Number(e.target.value))}
                                                    className={`w-full px-3 py-2 rounded border text-sm ${inputBg}`}
                                                >
                                                    {[3, 4, 5].map(n => <option key={n} value={n}>{n} Personas</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label className={`block text-xs font-medium mb-1.5 ${labelClr}`}>Paste Persona Profile (optional)</label>
                                            <textarea
                                                value={genText}
                                                onChange={(e) => setGenText(e.target.value)}
                                                className={`w-full px-3 py-2 rounded border text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors ${inputBg}`}
                                                rows={3}
                                                placeholder="Paste a resume, bio, or role description for the recruiter agent to base personas on..."
                                            />
                                        </div>
                                        {generateSuccess && <p className="text-sm text-emerald-500 mb-3">{generateSuccess}</p>}
                                        {generateError && <p className="text-sm text-red-400 mb-3">{generateError}</p>}
                                        <button
                                            type="button"
                                            onClick={handleGenerateAndSave}
                                            disabled={isGenerating || (!genFile && !genText.trim())}
                                            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isGenerating || (!genFile && !genText.trim()) ? (dark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed') : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                        >
                                            {isGenerating ? <><RefreshCw size={14} className="animate-spin" /><span>Generating...</span></> : <><Plus size={14} /><span>Generate & Save to Library</span></>}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Library List */}
                            <div className={`p-5 ${dark ? 'bg-[#181b23]' : 'bg-white'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-sm font-semibold ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                                        Persona Library
                                        {selectedPersonaIds.size > 0 && (
                                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${selectedPersonaIds.size >= 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {selectedPersonaIds.size} selected {selectedPersonaIds.size < 3 ? `(need ${3 - selectedPersonaIds.size} more)` : '✓'}
                                            </span>
                                        )}
                                    </span>
                                    <button type="button" onClick={fetchPersonas} className={`text-xs flex items-center space-x-1 ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <RefreshCw size={12} className={isLoadingPersonas ? 'animate-spin' : ''} />
                                        <span>Refresh</span>
                                    </button>
                                </div>

                                {isLoadingPersonas ? (
                                    <div className={`text-sm text-center py-8 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Loading library...</div>
                                ) : savedPersonas.length === 0 ? (
                                    <div className={`text-sm text-center py-8 rounded-lg border border-dashed ${dark ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-300'}`}>
                                        <BookUser size={24} className="mx-auto mb-2 opacity-40" />
                                        <p>No personas saved yet.</p>
                                        <p className="text-xs mt-1">Use the generator above to create and save your first personas.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                        {savedPersonas.map(p => {
                                            const selected = selectedPersonaIds.has(p.persona_id);
                                            return (
                                                <div
                                                    key={p.persona_id}
                                                    onClick={() => togglePersona(p.persona_id)}
                                                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected
                                                        ? (dark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50')
                                                        : (dark ? 'border-gray-700 hover:border-gray-600 bg-[#12141c]' : 'border-gray-200 hover:border-gray-300 bg-white')
                                                    }`}
                                                >
                                                    <div className={`mt-0.5 flex-shrink-0 ${selected ? 'text-blue-500' : (dark ? 'text-gray-600' : 'text-gray-400')}`}>
                                                        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className={`font-medium text-sm truncate ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{p.name}</p>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePersona(p.persona_id); }}
                                                                className={`ml-2 flex-shrink-0 p-1 rounded hover:text-red-400 transition-colors ${dark ? 'text-gray-600 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                        <p className={`text-xs ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{p.title}</p>
                                                        <p className={`text-xs mt-0.5 truncate ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{p.sub_text}</p>
                                                        <p className={`text-xs mt-1 ${dark ? 'text-gray-700' : 'text-gray-400'}`}>{p.source_reference} · {new Date(p.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="relative group">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled()}
                        className={`w-full py-4 rounded-lg text-white font-medium text-lg flex items-center justify-center space-x-2 shadow-sm transition-all ${
                            isSubmitDisabled()
                                ? (dark ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-400 cursor-not-allowed')
                                : (dark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#1a237e] hover:bg-[#151b60]')
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Evaluating with AI...</span>
                            </>
                        ) : (
                            <span>Submit for AI Assessment</span>
                        )}
                    </button>
                    {recruiterMode === 'saved' && selectedPersonaIds.size < 3 && !isLoading && (
                        <p className={`text-center text-xs mt-2 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>
                            Select at least 3 personas from the library to enable submission
                        </p>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Evaluate;
