

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { NodeProps } from 'reactflow';

export function MindMapNode({ data }: NodeProps<{ label: string }>) {
  return (
    <Card
      className="cursor-grab active:cursor-grabbing shadow-lg"
      style={{
        width: 172,
        height: 40,
      }}
    >
      <CardContent className="p-2 flex items-center justify-center h-full">
        <p className="text-center text-sm">{data.label}</p>
      </CardContent>
    </Card>
  );
}
