import React, { useState } from 'react';
import Layout from '../components/Layout';
import { UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file || !description) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('description', description);

        try {
            const response = await axios.post('http://localhost:8000/evaluate', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Navigate to results with the ID returned from backend
            navigate(`/results/${response.data.id}`, { state: { result: response.data } });
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Failed to analyze design. Please check backend.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout title="Student Sketch Upload Dashboard">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                {/* Upload Area */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student Sketch</label>
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                        <UploadCloud size={48} className="text-gray-400 mb-4" />
                        <p className="text-gray-900 font-medium mb-1">Drag & drop your design sketch image here</p>
                        <p className="text-gray-500 text-sm mb-4">or <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">browse files<input type="file" className="hidden" onChange={handleFileSelect} accept="image/*" /></label></p>
                        <p className="text-xs text-gray-400">(Supports .jpg, .png, .pdf)</p>
                        {file && (
                            <div className="mt-4 p-2 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                                Selected: {file.name}
                            </div>
                        )}
                    </div>
                </div>

                {/* Text Area */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Design Description/Rationale</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        rows={4}
                        placeholder="Briefly describe the concept, intent, and creative choices behind your sketch..."
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !file || !description}
                    className={`w-full py-4 rounded-lg text-white font-medium text-lg flex items-center justify-center space-x-2 shadow-sm transition-all ${isLoading || !file || !description ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1a237e] hover:bg-[#151b60]'}`}
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

export default Dashboard;
