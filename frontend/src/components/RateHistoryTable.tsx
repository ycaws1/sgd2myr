"use client";

import { SourceHistory } from "@/types";

interface RateHistoryTableProps {
    history: SourceHistory[];
}

export function RateHistoryTable({ history }: RateHistoryTableProps) {
    if (!history || history.length === 0) return null;

    // Extract all source names for columns
    const sourceNames = history.map(h => h.source_name).sort();

    // Determine max rows (should be 5 based on backend, but safe to check)
    const maxRows = Math.max(...history.map(h => h.recent_rates.length));

    // Generate rows
    const rows = Array.from({ length: maxRows }, (_, index) => {
        // Find a valid timestamp for this row (use the first available one)
        const timestampStr = history.find(h => h.recent_rates[index])?.recent_rates[index].timestamp;

        return {
            index,
            timestamp: timestampStr ? new Date(timestampStr) : null,
            rates: sourceNames.map(source => {
                const sourceData = history.find(h => h.source_name === source);
                const rateData = sourceData?.recent_rates[index];
                return rateData ? rateData.rate : null;
            })
        };
    });

    return (
        <section className="px-4 py-4 border-t border-dark-border">
            <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Last 5 Records</h2>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-dark-card border-b border-dark-border">
                        <tr>
                            <th className="px-2 py-2 md:px-4 md:py-3 sticky left-0 bg-dark-card z-10">Time</th>
                            {sourceNames.map(source => (
                                <th key={source} className="px-2 py-2 md:px-4 md:py-3 text-right">{source}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.index}
                                className="border-b border-dark-border last:border-0 hover:bg-dark-card/50 transition-colors"
                            >
                                <td className="px-2 py-2 md:px-4 md:py-3 text-gray-500 whitespace-nowrap text-xs md:text-sm sticky left-0 bg-dark-bg/95 md:bg-transparent">
                                    {row.timestamp ? row.timestamp.toLocaleTimeString('en-SG', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        timeZone: 'Asia/Singapore'
                                    }) : "-"}
                                </td>
                                {row.rates.map((rate, i) => (
                                    <td key={i} className="px-2 py-2 md:px-4 md:py-3 text-right font-mono text-white text-xs md:text-sm">
                                        {rate ? rate.toFixed(4) : "-"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
