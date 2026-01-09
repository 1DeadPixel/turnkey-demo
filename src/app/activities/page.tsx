'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { getSubOrgActivities, TurnkeyActivity } from '@/modules/turnkey/actions';
import { JsonTreeViewerWithControls } from '@/app/components/JsonTreeViewer';
import { ActivityTypeFilter, ACTIVITY_TYPES } from '@/app/components/ActivityTypeFilter';

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success';
      activities: TurnkeyActivity[];
      totalCount: number;
      filteredCount: number;
    }
  | { status: 'error'; message: string; rawError?: string };

export default function ActivitiesPage() {
  // Form state
  const [subOrgId, setSubOrgId] = useState('');
  const [solanaPrivateKey, setSolanaPrivateKey] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
  ]);

  // Fetch state
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });

  // Error details toggle
  const [showRawError, setShowRawError] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!subOrgId || !solanaPrivateKey) {
        setFetchState({
          status: 'error',
          message: 'Please fill in all required fields.',
        });
        return;
      }

      if (selectedTypes.length === 0) {
        setFetchState({
          status: 'error',
          message: 'Please select at least one activity type to filter.',
        });
        return;
      }

      setFetchState({ status: 'loading' });

      try {
        const result = await getSubOrgActivities(
          subOrgId,
          solanaPrivateKey,
          selectedTypes
        );

        if (result.success && result.activities) {
          setFetchState({
            status: 'success',
            activities: result.activities,
            totalCount: result.totalCount ?? 0,
            filteredCount: result.filteredCount ?? 0,
          });
        } else {
          setFetchState({
            status: 'error',
            message: result.error ?? 'Failed to fetch activities',
            rawError: result.rawError,
          });
        }
      } catch (error) {
        setFetchState({
          status: 'error',
          message: 'An unexpected error occurred',
          rawError: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [subOrgId, solanaPrivateKey, selectedTypes]
  );

  const handleClear = useCallback(() => {
    setSubOrgId('');
    setSolanaPrivateKey('');
    setSelectedTypes(['ACTIVITY_TYPE_SIGN_TRANSACTION_V2']);
    setFetchState({ status: 'idle' });
    setShowRawError(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Sub-Org Activity Viewer
            </h1>
            <p className="text-gray-600 mt-1">
              Fetch and view Turnkey sub-organization activities
            </p>
          </div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Credentials Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            🔐 Authentication Credentials
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter your sub-org ID and Solana wallet private key (the wallet that was used to create the sub-org).
            Credentials are not stored and must be re-entered each time for security.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="subOrgId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Sub-Organization ID *
              </label>
              <input
                id="subOrgId"
                type="text"
                value={subOrgId}
                onChange={(e) => setSubOrgId(e.target.value)}
                placeholder="e.g., de9c525d-1495-482e-a4b5-6ac2bdb17bcd"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label
                htmlFor="solanaPrivateKey"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Solana Wallet Private Key *
              </label>
              <input
                id="solanaPrivateKey"
                type="password"
                value={solanaPrivateKey}
                onChange={(e) => setSolanaPrivateKey(e.target.value)}
                placeholder="Base58-encoded Solana private key (e.g., 3R3pup...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            {/* Activity Type Filter */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Types to Fetch
              </label>
              <ActivityTypeFilter
                selectedTypes={selectedTypes}
                onChange={setSelectedTypes}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={fetchState.status === 'loading'}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                {fetchState.status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Fetching...
                  </span>
                ) : (
                  'Fetch Activities'
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md transition-colors"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {fetchState.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl">❌</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700">{fetchState.message}</p>

                {fetchState.rawError && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowRawError(!showRawError)}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      {showRawError ? 'Hide' : 'Show'} technical details
                    </button>
                    {showRawError && (
                      <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 overflow-auto max-h-32">
                        {fetchState.rawError}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {fetchState.status === 'success' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <h3 className="font-semibold text-green-800">
                    Activities Fetched Successfully
                  </h3>
                  <p className="text-green-700">
                    Showing {fetchState.filteredCount} of {fetchState.totalCount} total activities
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Filters: {selectedTypes.map((t) => {
                      const found = ACTIVITY_TYPES.find((at) => at.value === t);
                      return found?.label ?? t;
                    }).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Activities List */}
            {fetchState.activities.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <span className="text-4xl">📭</span>
                <h3 className="font-semibold text-yellow-800 mt-2">
                  No Activities Found
                </h3>
                <p className="text-yellow-700 mt-1">
                  No activities match the selected filters. Try selecting different activity types.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fetchState.activities.map((activity, index) => (
                  <div key={activity.id} className="bg-white rounded-lg shadow">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            Activity #{index + 1}
                          </span>
                          <h3 className="font-semibold text-gray-800">
                            {activity.type.replace('ACTIVITY_TYPE_', '').replace(/_/g, ' ')}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              activity.status === 'ACTIVITY_STATUS_COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : activity.status === 'ACTIVITY_STATUS_FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {activity.status.replace('ACTIVITY_STATUS_', '')}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            ID: {activity.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <JsonTreeViewerWithControls
                        data={activity}
                        title="Activity Details"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {fetchState.status === 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <span className="text-4xl">🔍</span>
            <h3 className="font-semibold text-blue-800 mt-2">
              Ready to Fetch Activities
            </h3>
            <p className="text-blue-700 mt-1">
              Enter your credentials and select activity types to view sub-organization activities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

