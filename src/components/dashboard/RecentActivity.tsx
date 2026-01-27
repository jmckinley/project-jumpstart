/**
 * @module components/dashboard/RecentActivity
 * @description Timeline/list of recent project activity events
 *
 * PURPOSE:
 * - Display a chronological list of recent project events
 * - Show placeholder state when no activity data is available
 * - Render icons, messages, and relative timestamps per event
 *
 * DEPENDENCIES:
 * - None (self-contained presentational component)
 *
 * EXPORTS:
 * - RecentActivity - Dashboard card component for activity feed
 * - Activity - TypeScript interface for activity items
 *
 * PATTERNS:
 * - Receives an optional activities array as props
 * - When activities is undefined or empty, shows a placeholder message
 * - Activity type determines the icon displayed (scan, edit, generate, health, default)
 *
 * CLAUDE NOTES:
 * - Activity timestamps are ISO strings; formatRelativeTime converts to human-readable
 * - Currently the app has no real activity feed, so the placeholder state is the default
 * - Icon mapping uses SVG paths for each activity type
 */

export interface Activity {
  type: string;
  message: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities?: Activity[];
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function ActivityIcon({ type }: { type: string }) {
  const baseClass = "h-4 w-4";

  switch (type) {
    case "scan":
      return (
        <svg
          className={`${baseClass} text-blue-400`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      );
    case "edit":
      return (
        <svg
          className={`${baseClass} text-green-400`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      );
    case "generate":
      return (
        <svg
          className={`${baseClass} text-purple-400`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "health":
      return (
        <svg
          className={`${baseClass} text-yellow-400`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      );
    default:
      return (
        <svg
          className={`${baseClass} text-neutral-400`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const hasActivities = activities && activities.length > 0;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        Recent Activity
      </h3>

      {!hasActivities ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg
            className="mb-3 h-10 w-10 text-neutral-700"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-neutral-400">No recent activity.</p>
          <p className="mt-1 text-xs text-neutral-600">
            Open a project to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {activities.map((activity, index) => (
            <li
              key={`${activity.timestamp}-${index}`}
              className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-800/50"
            >
              <div className="mt-0.5 shrink-0">
                <ActivityIcon type={activity.type} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-300">{activity.message}</p>
              </div>
              <span className="shrink-0 text-xs text-neutral-600">
                {formatRelativeTime(activity.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
