'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, LayoutDashboard, Settings, Bell, Search, User } from 'lucide-react';
import Link from 'next/link';

type Message = {
    id: string;
    user: string;
    text: string;
    timestamp: number;
};

export default function SupplierDashboard() {
    const [messages, setMessages] = useState<Message[]>([]);

    // Poll for new messages (simulating real-time)
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await fetch('/api/chat');
                const data = await res.json();
                setMessages(data.messages);
            } catch (error) {
                console.error('Failed to fetch messages', error);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-slate-800">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6">
                    <h2 className="text-2xl font-bold tracking-tighter text-indigo-600">3DSFERA</h2>
                    <p className="text-xs text-gray-400 font-medium tracking-widest uppercase mt-1">Supplier Portal</p>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700">
                        <MessageSquare size={18} /> Live Chat
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 transition">
                        <LayoutDashboard size={18} /> Analytics
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 transition">
                        <Settings size={18} /> Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                            <User size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Nike Official</p>
                            <p className="text-xs text-gray-500">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                    <h1 className="text-lg font-semibold text-gray-800">Live Inquiries</h1>
                    <div className="flex items-center gap-4">
                        <button className="text-gray-400 hover:text-gray-600">
                            <Search size={20} />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 relative">
                            <Bell size={20} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                    </div>
                </header>

                {/* Chat Feed */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {messages.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <MessageSquare size={32} />
                                </div>
                                <h3 className="text-gray-900 font-medium">No messages yet</h3>
                                <p className="text-gray-500 text-sm mt-1">Waiting for users to connect...</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                                {msg.user.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{msg.user}</p>
                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online now
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="pl-11">
                                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none inline-block">
                                            {msg.text}
                                        </p>
                                    </div>

                                    <div className="mt-4 pl-11 flex gap-3">
                                        <button className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
                                            Reply
                                        </button>
                                        <button className="text-sm px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                                            Mark as Resolved
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}
