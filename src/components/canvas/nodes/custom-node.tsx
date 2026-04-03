

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { NodeData, DesignerElement } from '@/lib/node-templates';

function renderText(text: string, data: NodeData) {
  if (!text) return '';
  // This regex will find all occurrences of {{data.key}}
  return text.replace(/\{\{data\.(\w+)\}\}/g, (match, key) => {
    // If the key exists in data and is not null/undefined, return it. Otherwise, return an empty string to signify it should be replaced.
    return data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined ? data[key] : '';
  });
}


function getBorderRadiusStyle(borderRadius: any): React.CSSProperties {
    if (typeof borderRadius === 'object' && borderRadius !== null) {
        return {
            borderRadius: `${borderRadius.tl}px ${borderRadius.tr}px ${borderRadius.br}px ${borderRadius.bl}px`
        };
    }
    if (typeof borderRadius === 'string') {
        return { borderRadius };
    }
    return {};
}


export function CustomNode({ data, selected }: NodeProps<NodeData>) {
  if (!data.layout) {
    return (
      <div className={cn("p-2 border rounded bg-red-100", selected && "ring-2 ring-red-500")}>
        Error: No layout data provided.
      </div>
    );
  }

  const { width, height, elements, handles } = data.layout;
  const isPreview = data.isPreview;

  return (
    <div 
        style={{ width, height }} 
        className={cn(
            "relative bg-transparent outline-none", 
            selected && "ring-2 ring-primary ring-offset-background ring-offset-2"
        )}
    >
        {/* Transparent div for reliable event handling */}
        <div 
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: 'all' }}
        />

      {/* Visual elements rendered as HTML divs */}
      {elements.map((el, index) => {
          const elKey = `${el.type}-${index}`;
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.width}px`,
            height: `${el.height}px`,
            pointerEvents: 'none', // IMPORTANT: This prevents internal elements from capturing mouse events
          };

          switch (el.type) {
            case 'rectangle':
            case 'circle':
              return (
                <div
                  key={elKey}
                  style={{
                    ...baseStyle,
                    backgroundColor: el.fill,
                    border: `${el.strokeWidth || 0}px solid ${el.stroke || 'transparent'}`,
                    ...getBorderRadiusStyle(el.type === 'circle' ? '50%' : el.borderRadius),
                  }}
                />
              );
            
            case 'text':
              const renderedContent = renderText(el.content || '', data);
              const textToRender = renderedContent || el.content || '';
              return (
                <div
                  key={elKey}
                  style={{
                    ...baseStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    color: el.fill,
                    fontSize: el.fontSize,
                    fontFamily: el.fontFamily,
                    fontWeight: el.fontWeight as React.CSSProperties['fontWeight'],
                    fontStyle: el.fontStyle as React.CSSProperties['fontStyle'],
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  {textToRender}
                </div>
              );

            case 'image':
              const renderedUrl = renderText(el.src || '', data);
              const imageUrl = renderedUrl || 'https://placehold.co/100x100/ced4da/748ffc?text=IMG';
              return (
                <div key={elKey} style={{ ...baseStyle, ...getBorderRadiusStyle(el.borderRadius), overflow: 'hidden' }}>
                    <img 
                        src={imageUrl}
                        alt={el.dataKey || 'placeholder'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                </div>
              );

            case 'line':
              const length = Math.sqrt(Math.pow((el.x2 || 0) - (el.x1 || 0), 2) + Math.pow((el.y2 || 0) - (el.y1 || 0), 2));
              const angle = Math.atan2((el.y2 || 0) - (el.y1 || 0), (el.x2 || 0) - (el.x1 || 0)) * 180 / Math.PI;
              return (
                <div 
                  key={elKey}
                  style={{
                    position: 'absolute',
                    left: `${el.x1}px`,
                    top: `${el.y1}px`,
                    width: `${length}px`,
                    height: `${el.strokeWidth}px`,
                    backgroundColor: el.stroke,
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '0 0',
                    pointerEvents: 'none',
                  }}
                />
              );

            default:
              return null;
          }
      })}
      
      {/* Handles for connections */}
      {handles.map(handle => (
            <Handle
                key={handle.id}
                id={handle.id}
                type={handle.handleType}
                position={handle.position}
                style={{
                    left: handle.x,
                    top: handle.y,
                    width: '8px',
                    height: '8px',
                    transform: `translate(-4px, -4px)`,
                }}
                className={cn("!bg-primary", isPreview && "opacity-0")}
            />
      ))}
       
      {/* Default handles in case none are defined in the layout */}
      {handles.length === 0 && (
        <React.Fragment>
            <Handle type="target" position={Position.Top} className={cn("!bg-primary", isPreview && "opacity-0")} />
            <Handle type="source" position={Position.Top} className={cn("!bg-primary", isPreview && "opacity-0")} />
            <Handle type="target" position={Position.Bottom} className={cn("!bg-primary", isPreview && "opacity-0")} />
            <Handle type="source" position={Position.Bottom} className={cn("!bg-primary", isPreview && "opacity-0")} />
            <Handle type="target" position={Position.Left} className={cn("!bg-primary", isPreview && "opacity-0")} />
            <Handle type="source" position={Position.Left} className={cn("!bg-primary", isPreview && "opacity-0")} />
            <Handle type="target" position={Position.Right} className={cn("!bg-primary", isPreview && "opacity-0")} />
            <Handle type="source" position={Position.Right} className={cn("!bg-primary", isPreview && "opacity-0")} />
        </React.Fragment>
      )}
    </div>
  );
}
