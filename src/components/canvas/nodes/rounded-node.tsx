

import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NodeData } from '@/lib/node-templates';

export function RoundedNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <>
        <NodeResizer isVisible={selected} minWidth={100} minHeight={40} />
        <Card 
            style={{ ...data.style, width: data.style?.width, height: data.style?.height }}
            className={cn("rounded-lg shadow-lg flex items-center justify-center", selected && "ring-2 ring-primary")}
        >
            <Handle type="target" position={Position.Top} className={cn("!bg-primary", data.isPreview && "opacity-0")} />
            <CardContent className="p-2 w-full h-full flex items-center justify-center">
                <p 
                  className="text-sm text-center" 
                  style={{ 
                    color: data.style?.color,
                    fontFamily: data.style?.fontFamily,
                    fontSize: data.style?.fontSize,
                    fontWeight: data.style?.fontWeight as React.CSSProperties['fontWeight'],
                    fontStyle: data.style?.fontStyle as React.CSSProperties['fontStyle'],
                  }}
                >
                  {data.label}
                </p>
            </CardContent>
            <Handle type="source" position={Position.Bottom} className={cn("!bg-primary", data.isPreview && "opacity-0")} />
        </Card>
    </>
  );
}
