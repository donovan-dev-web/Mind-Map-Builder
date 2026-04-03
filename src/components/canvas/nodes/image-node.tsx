

import React from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { cn } from '@/lib/utils';

interface ImageNodeData {
  src?: string;
  width?: number;
  height?: number;
}

function ImageNode({ data, selected }: NodeProps<ImageNodeData>) {
  const imageUrl = data.src || 'https://placehold.co/300x200/e2e8f0/e2e8f0?text=Image';
  const width = data.width || 256;
  const height = data.height || 192;

  return (
    <>
      <NodeResizer 
        isVisible={selected} 
        minWidth={50} 
        minHeight={50} 
      />
      <div 
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        className={cn(
          "bg-background/80 rounded-md shadow-lg",
          selected ? 'ring-2 ring-primary' : ''
        )}
      />
    </>
  );
}

export default ImageNode;
