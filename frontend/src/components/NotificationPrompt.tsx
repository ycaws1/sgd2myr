"use client";

import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle } from "lucide-react";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

export function NotificationPrompt() {
    const { permission, isLoading, requestPermission, isSupported } = useNotificationPermission();
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Ensure component only renders on client
    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render on server or before mount
    if (!mounted) return null;

    // Don't show if notifications not supported
    if (!isSupported) return null;

    // Don't show if already granted
    if (permission === "granted") return null;

    // Don't show if user dismissed
    if (dismissed) return null;

    const handleAllow = async () => {
        await requestPermission();
    };

    const handleDismiss = () => {
        setDismissed(true);
    };

    return (
        <div className="fixed top-16 left-0 right-0 z-40 px-3">
            <div className="max-w-lg mx-auto">
                <div className="relative bg-gradient-to-r from-accent-primary/10 to-purple-500/10 border border-accent-primary/20 rounded-2xl p-4 backdrop-blur-md shadow-lg shadow-accent-primary/5 animate-slide-down">
                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-3 pr-6">
                        {/* Icon */}
                        <div className="flex-shrink-0 p-2.5 bg-accent-primary/20 rounded-xl">
                            <Bell className="w-5 h-5 text-accent-primary" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white text-sm mb-1">
                                Enable Notifications
                            </h3>
                            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                Get instant alerts when exchange rates hit your target. Never miss the best time to exchange!
                            </p>

                            {permission === "denied" ? (
                                <div className="flex items-center gap-2 text-xs text-amber-400">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Notifications blocked. Enable in browser settings.</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleAllow}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-black font-semibold text-xs rounded-xl hover:bg-accent-primary/90 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <div className="w-3 h-3 border-2 border-black border-t-transparent animate-spin rounded-full" />
                                        ) : (
                                            <Bell className="w-3 h-3" />
                                        )}
                                        <span>Allow Notifications</span>
                                    </button>
                                    <button
                                        onClick={handleDismiss}
                                        className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
                                    >
                                        Not Now
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
