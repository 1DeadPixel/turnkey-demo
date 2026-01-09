'use client';

import { useState, useCallback } from 'react';

interface JsonTreeViewerProps {
  data: unknown;
  name?: string;
  defaultExpanded?: boolean;
  level?: number;
}

export function JsonTreeViewer({
  data,
  name,
  defaultExpanded = true,
  level = 0,
}: JsonTreeViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded && level < 2);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const indent = level * 16;

  // Handle null
  if (data === null) {
    return (
      <div style={{ marginLeft: indent }} className="font-mono text-sm">
        {name && <span className="text-purple-600">{name}: </span>}
        <span className="text-gray-500">null</span>
      </div>
    );
  }

  // Handle undefined
  if (data === undefined) {
    return (
      <div style={{ marginLeft: indent }} className="font-mono text-sm">
        {name && <span className="text-purple-600">{name}: </span>}
        <span className="text-gray-500">undefined</span>
      </div>
    );
  }

  // Handle primitives (string, number, boolean)
  if (typeof data !== 'object') {
    let valueClass = 'text-gray-800';
    let displayValue: string = String(data);

    if (typeof data === 'string') {
      valueClass = 'text-green-600';
      displayValue = `"${data}"`;
    } else if (typeof data === 'number') {
      valueClass = 'text-blue-600';
    } else if (typeof data === 'boolean') {
      valueClass = 'text-orange-600';
    }

    return (
      <div style={{ marginLeft: indent }} className="font-mono text-sm py-0.5">
        {name && <span className="text-purple-600">{name}: </span>}
        <span className={valueClass}>{displayValue}</span>
      </div>
    );
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div style={{ marginLeft: indent }} className="font-mono text-sm py-0.5">
          {name && <span className="text-purple-600">{name}: </span>}
          <span className="text-gray-500">[]</span>
        </div>
      );
    }

    return (
      <div style={{ marginLeft: indent }}>
        <button
          onClick={toggleExpanded}
          className="font-mono text-sm py-0.5 hover:bg-gray-100 rounded px-1 -ml-1 flex items-center gap-1"
        >
          <span className="text-gray-400 w-4 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
          {name && <span className="text-purple-600">{name}: </span>}
          <span className="text-gray-500">
            Array[{data.length}]
          </span>
        </button>
        {isExpanded && (
          <div className="border-l border-gray-200 ml-2">
            {data.map((item, index) => (
              <JsonTreeViewer
                key={index}
                data={item}
                name={`[${index}]`}
                defaultExpanded={level < 1}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle objects
  const entries = Object.entries(data as Record<string, unknown>);

  if (entries.length === 0) {
    return (
      <div style={{ marginLeft: indent }} className="font-mono text-sm py-0.5">
        {name && <span className="text-purple-600">{name}: </span>}
        <span className="text-gray-500">{'{}'}</span>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: indent }}>
      <button
        onClick={toggleExpanded}
        className="font-mono text-sm py-0.5 hover:bg-gray-100 rounded px-1 -ml-1 flex items-center gap-1"
      >
        <span className="text-gray-400 w-4 text-center">
          {isExpanded ? '▼' : '▶'}
        </span>
        {name && <span className="text-purple-600">{name}: </span>}
        <span className="text-gray-500">
          {'{'}...{'}'} ({entries.length} keys)
        </span>
      </button>
      {isExpanded && (
        <div className="border-l border-gray-200 ml-2">
          {entries.map(([key, value]) => (
            <JsonTreeViewer
              key={key}
              data={value}
              name={key}
              defaultExpanded={level < 1}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper component with expand/collapse all controls
interface JsonTreeViewerWithControlsProps {
  data: unknown;
  title?: string;
}

export function JsonTreeViewerWithControls({
  data,
  title,
}: JsonTreeViewerWithControlsProps) {
  const [key, setKey] = useState(0);
  const [defaultExpanded, setDefaultExpanded] = useState(true);

  const expandAll = useCallback(() => {
    setDefaultExpanded(true);
    setKey((k) => k + 1);
  }, []);

  const collapseAll = useCallback(() => {
    setDefaultExpanded(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        {title && (
          <h3 className="font-semibold text-gray-700">{title}</h3>
        )}
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
          >
            Collapse All
          </button>
        </div>
      </div>
      <div className="p-4 overflow-auto max-h-[600px]">
        <JsonTreeViewer key={key} data={data} defaultExpanded={defaultExpanded} />
      </div>
    </div>
  );
}

