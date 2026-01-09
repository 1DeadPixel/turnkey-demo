'use client';

import { useState, useCallback } from 'react';

// Hardcoded list of common Turnkey activity types
export const ACTIVITY_TYPES = [
  {
    value: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
    label: 'Sign Transaction',
    description: 'Transaction signing activities',
  },
  {
    value: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',
    label: 'Sign Raw Payload',
    description: 'Raw payload signing activities',
  },
  {
    value: 'ACTIVITY_TYPE_CREATE_POLICY',
    label: 'Create Policy',
    description: 'Policy creation activities',
  },
  {
    value: 'ACTIVITY_TYPE_DELETE_POLICY',
    label: 'Delete Policy',
    description: 'Policy deletion activities',
  },
  {
    value: 'ACTIVITY_TYPE_CREATE_USERS',
    label: 'Create Users',
    description: 'User creation activities',
  },
  {
    value: 'ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION',
    label: 'Create Sub-Organization',
    description: 'Sub-org creation activities',
  },
  {
    value: 'ACTIVITY_TYPE_CREATE_WALLET',
    label: 'Create Wallet',
    description: 'Wallet creation activities',
  },
  {
    value: 'ACTIVITY_TYPE_EXPORT_WALLET_ACCOUNT',
    label: 'Export Wallet Account',
    description: 'Wallet export activities',
  },
  {
    value: 'ACTIVITY_TYPE_CREATE_API_KEYS',
    label: 'Create API Keys',
    description: 'API key creation activities',
  },
  {
    value: 'ACTIVITY_TYPE_DELETE_API_KEYS',
    label: 'Delete API Keys',
    description: 'API key deletion activities',
  },
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number]['value'];

interface ActivityTypeFilterProps {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

export function ActivityTypeFilter({
  selectedTypes,
  onChange,
}: ActivityTypeFilterProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = useCallback(
    (type: string) => {
      if (selectedTypes.includes(type)) {
        onChange(selectedTypes.filter((t) => t !== type));
      } else {
        onChange([...selectedTypes, type]);
      }
    },
    [selectedTypes, onChange]
  );

  const selectAll = useCallback(() => {
    onChange(ACTIVITY_TYPES.map((t) => t.value));
  }, [onChange]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="font-medium text-gray-700">Activity Type Filters</span>
          <span className="text-sm text-gray-500">
            ({selectedTypes.length} selected)
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-white">
          <div className="flex gap-2 mb-3">
            <button
              onClick={selectAll}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ACTIVITY_TYPES.map((activityType) => (
              <label
                key={activityType.value}
                className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                  selectedTypes.includes(activityType.value)
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(activityType.value)}
                  onChange={() => handleToggle(activityType.value)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800">
                    {activityType.label}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {activityType.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

