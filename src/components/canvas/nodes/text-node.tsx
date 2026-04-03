
import React from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function TextNode({ data, selected }: NodeProps<{ text?: string, width?: number, height?: number }>) {
  const width = data.width || 192;
  const height = data.height || 48;
  
  return (
    <div 
        style={{ width: `${width}px`, height: `${height}px` }}
        className={cn(
            "p-2 bg-background/80 rounded-md shadow-lg flex flex-col",
            selected && "ring-2 ring-primary"
        )}
    >
      <NodeResizer isVisible={selected} minWidth={100} minHeight={40} />
      <Textarea 
          defaultValue={data.text}
          className="nodrag resize-none w-full flex-1 bg-transparent border-none focus-visible:ring-0 p-0"
      />
    </div>
  );
}
