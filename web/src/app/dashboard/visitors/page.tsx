"use client";

import { useVisitorSummary } from "@/hooks/use-visitor-summary";

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  PERSON: { icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", color: "text-blue-500" },
  DOORBELL: { icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0", color: "text-orange-500" },
  MOTION: { icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", color: "text-purple-500" },
  SOUND: { icon: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z", color: "text-green-500" },
};

export default function VisitorsPage() {
  const { summary, isLoading } = useVisitorSummary();

  if (isLoading) {
    return <div className="py-20 text-center text-zinc-500">Loading summary...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visitors</h1>

      {summary && (
        <>
          <p className="text-sm text-zinc-500">{summary.date}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-zinc-900 p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{summary.total_person_events}</div>
              <div className="mt-1 text-xs text-zinc-500">People</div>
            </div>
            <div className="rounded-xl bg-zinc-900 p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{summary.total_doorbell_presses}</div>
              <div className="mt-1 text-xs text-zinc-500">Doorbell</div>
            </div>
            <div className="rounded-xl bg-zinc-900 p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{summary.total_motion_events}</div>
              <div className="mt-1 text-xs text-zinc-500">Motion</div>
            </div>
          </div>

          {/* Timeline */}
          {summary.events.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400">Event Timeline</h2>
              {summary.events.map((event, i) => {
                const meta = EVENT_ICONS[event.event_type] ?? EVENT_ICONS.MOTION;
                const time = event.timestamp.includes("T")
                  ? event.timestamp.split("T")[1]?.slice(0, 8)
                  : event.timestamp;

                return (
                  <div key={`${event.device_id}-${event.timestamp}-${i}`} className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3">
                    <svg className={`h-5 w-5 ${meta.color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{event.event_type}</div>
                      <div className="text-xs text-zinc-500">
                        {event.device_name || event.device_id}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600">{time}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-600">
              No visitor events recorded today
            </div>
          )}
        </>
      )}
    </div>
  );
}
