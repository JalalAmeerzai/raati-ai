import React, { useState } from 'react';
import Layout, { useTheme } from '../components/Layout';
import { UploadCloud, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Evaluate: React.FC = () => {
    const navigate = useNavigate();
    const { dark } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [submitterName, setSubmitterName] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragLeave = () => setIsDragOver(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
    };
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = async () => {
        if (!file || !description || !submitterName.trim()) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('description', description);
        formData.append('submitter_name', submitterName.trim());
        try {
            const response = await axios.post('http://localhost:8000/evaluate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !file || !description || !submitterName.trim()}
                    className={`w-full py-4 rounded-lg text-white font-medium text-lg flex items-center justify-center space-x-2 shadow-sm transition-all ${
                        isLoading || !file || !description || !submitterName.trim()
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
            </div>
        </Layout>
    );
};

export default Evaluate;
