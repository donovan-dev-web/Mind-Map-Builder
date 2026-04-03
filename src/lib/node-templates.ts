
import { Position } from 'reactflow';

type BorderRadius = {
    tl: number;
    tr: number;
    br: number;
    bl: number;
};

export type DesignerElement = {
    type: 'rectangle' | 'text' | 'image' | 'line' | 'circle';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    rx?: number; // Kept for SVG rect property
    borderRadius?: BorderRadius | string; // Can be object or string for CSS
    content?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    src?: string;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    // Added for text and image elements to be used as dynamic fields
    dataKey?: string; 
  };
  
export type HandleElement = {
    id: string;
    type: 'handle';
    x: number;
    y: number;
    position: Position;
    handleType: 'source' | 'target';
};

export type CustomNodeLayout = {
    name: string;
    width: number;
    height: number;
    elements: DesignerElement[];
    handles: HandleElement[];
};

export type NodeData = {
  label: string;
  style?: React.CSSProperties;
  layout?: CustomNodeLayout;
  isPreview?: boolean;
  [key: string]: any;
};

export type SvgElement = {
    type: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    rx?: number; // Kept for SVG rect property
    borderRadius?: BorderRadius | string; // Can be object or string for CSS
    content?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    src?: string;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    // Added for text and image elements to be used as dynamic fields
    dataKey?: string; 
  };
