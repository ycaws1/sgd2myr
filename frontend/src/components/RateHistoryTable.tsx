"use client";

import { SourceHistory } from "@/types";
import { History } from "lucide-react";

interface RateHistoryTableProps {
    history: SourceHistory[];
}

export function RateHistoryTable({ history }: RateHistoryTableProps) {
    if (!history || history.length === 0) return null;

    const sourceNames = history.map(h => h.source_name).sort();
    const allTimestamps = new Set<string>();
    history.forEach(h => {
        h.recent_rates.forEach(r => {
            allTimestamps.add(new Date(r.timestamp).toISOString());
        });
    });

    const sortedTimestamps = Array.from(allTimestamps)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 5);

    const rows = sortedTimestamps.map((ts, index) => {
        const timestamp = new Date(ts);
        return {
            index,
            timestamp,
            rates: sourceNames.map(source => {
                const sourceData = history.find(h => h.source_name === source);
                const rateData = sourceData?.recent_rates.find(r =>
                    new Date(r.timestamp).toISOString() === ts
                );
                return rateData ? rateData.rate : null;
            })
        };
    });

    return (
        <section className="px-6 py-8">
            <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-accent-primary opacity-70" />
                <h2 className="text-lg font-semibold text-white">Execution Logs</h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.03]">
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 whitespace-nowrap">Timestamp</th>
                                {sourceNames.map(source => (
                                    <th key={source} className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right border-b border-white/5">{source}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rows.map((row) => (
                                <tr key={row.index} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3 text-[11px] font-medium text-gray-400 font-mono">
                                        {row.timestamp ? row.timestamp.toLocaleTimeString('en-SG', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false,
                                            timeZone: 'Asia/Singapore'
                                        }) : "-"}
                                    </td>
                                    {row.rates.map((rate, i) => (
                                        <td key={i} className="px-4 py-3 text-right">
                                            <span className={`text-[11px] font-mono font-medium ${rate ? 'text-white' : 'text-gray-700'}`}>
                                                {rate ? rate.toFixed(4) : "—"}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="mt-3 text-[10px] text-gray-600 px-1 italic">
                * Showing last 5 synchronization events across all tracked sources.
            </div>
        </section>
    );
}
