import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        // Simulate Haka login redirect
        setTimeout(() => {
            navigate('/dashboard');
        }, 800);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">Creativity Assessment Tool</h1>
                </div>

                <div className="space-y-6">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1 ml-1 bg-white absolute -top-2.5 left-2 px-1">
                            Select Home Organization
                        </label>
                        <select className="block w-full px-4 py-3 text-base text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 appearance-none">
                            <option>University of Oulu</option>
                            <option>Aalto University</option>
                            <option>University of Helsinki</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>

                    <button
                        onClick={handleLogin}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Login with Haka
                    </button>
                </div>
            </div>



            <p className="mt-4 text-xs text-gray-400">© 2024 University of Oulu, Thesis Project.</p>
        </div>
    );
};

export default Login;
