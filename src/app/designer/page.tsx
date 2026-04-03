

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, View, Square, Circle, Type, Plus, Save, GripVertical, Trash2, Image as ImageIcon, Minus as LineIcon, Layers, Text, Edit, ArrowUp, ArrowDown, FolderOpen, Bold, Italic, Upload, Database, FilePlus, AlertTriangle, AlignHorizontalJustifyCenter, AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ReactFlow, { Node, Position, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from '@/components/canvas/nodes/custom-node';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CustomNodeLayout, HandleElement, SvgElement } from '@/lib/node-templates';
import { saveNodeTemplate, getNodeTemplates, deleteNodeTemplate, importSvgFile } from '@/services/node-template.service';
import { defaultTemplates } from '@/lib/default-node-templates';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { closeCurrentWindow } from '@/services/window.service';
import { useConfig } from '@/hooks/use-config';
import { translations } from '@/config/translations';
import { isTauri } from '@/services/utils';

const nodeTypes = { custom: CustomNode };
const gridSize = 15;

type BaseElement = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

type BorderRadius = {
    tl: number;
    tr: number;
    br: number;
    bl: number;
};

type RectangleElement = BaseElement & {
    type: 'rectangle';
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    borderRadius?: BorderRadius;
};

type CircleElement = BaseElement & {
    type: 'circle';
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
};

type FieldElement = {
    dataKey: string;
};

type TextElement = BaseElement & FieldElement & {
    type: 'text';
    content: string; // This will now be a template string like '{{data.title}}'
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
};

type ImageElement = BaseElement & FieldElement & {
    type: 'image';
    src: string; // Default placeholder, will be templated like '{{data.avatar}}'
    borderRadius?: BorderRadius;
};


type LineElement = {
    id:string;
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke?: string;
    strokeWidth?: number;
};


type ShapeElement = RectangleElement | CircleElement;

// A discriminated union for all possible elements on the canvas
type DesignerElement = ShapeElement | TextElement | ImageElement | HandleElement | LineElement;

type DraggingState = {
    isDragging: boolean;
    elementId: string | null;
    handleType?: 'start' | 'end'; // For line handles
};

type SelectionRect = {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
} | null;

const PreviewCanvas = ({ layout, className, translations: t }: { layout: CustomNodeLayout | null, className?: string, translations: any }) => {
    if (!layout) return null;

    const previewNode: Node = {
        id: 'preview-node',
        type: 'custom',
        position: { x: 10, y: 10 },
        data: {
            // Provide some default dummy data for previewing template fields
            label: t.designerPreviewLabel || 'Label',
            name: t.designerPreviewName || 'John Doe',
            title: t.designerPreviewTitleText || 'Sample Title',
            description: t.designerPreviewDescriptionText || 'This is a description.',
            poste: t.designerPreviewPoste || 'Position/Role',
            avatar: 'https://placehold.co/100x100/ced4da/212529?text=IMG',
            cover_image: 'https://placehold.co/600x400/ced4da/212529?text=Cover',
            layout: {
                width: layout.width,
                height: layout.height,
                elements: layout.elements,
                handles: layout.handles
            }
        }
    };

    return (
        <div className={cn("w-full h-full rounded-lg border bg-muted/20", className)}>
            <ReactFlowProvider>
                <ReactFlow
                    nodes={[previewNode]}
                    nodeTypes={nodeTypes}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={false}
                    panOnDrag={false}
                />
            </ReactFlowProvider>
        </div>
    );
};

function DesignerPageComponent() {
  const { config } = useConfig();
  const t = translations[config.language];
  const [nodeElements, setNodeElements] = useState<DesignerElement[]>([]);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [nodeName, setNodeName] = useState(t.designerMyNode);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isModelLibraryOpen, setIsModelLibraryOpen] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<CustomNodeLayout | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<CustomNodeLayout[]>([]);
  const { toast } = useToast();
    const searchParams = useSearchParams();

  const lastSelectedId = selectedElementIds.length > 0 ? selectedElementIds[selectedElementIds.length - 1] : null;
  const selectedElement = nodeElements.find(el => el.id === lastSelectedId) || null;
  const fieldElements = nodeElements.filter(el => el.type === 'text' || el.type === 'image') as Array<TextElement | ImageElement>;
  const selectedElements = nodeElements.filter(el => selectedElementIds.includes(el.id) && 'x' in el) as Array<BaseElement>;


  const [draggingState, setDraggingState] = useState<DraggingState>({ isDragging: false, elementId: null });
  const [selectionRect, setSelectionRect] = useState<SelectionRect>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);

useEffect(() => {
  async function testAppWindow() {
    if (!isTauri()) return;
    try {
      const TauriWindow = await import('@tauri-apps/api/window');
      console.log('TauriWindow.appWindow:', TauriWindow.appWindow);
    } catch (e) {
      console.error('Erreur import appWindow:', e);
    }
  }

  testAppWindow();
}, []);
  
    useEffect(() => {
        // Correction : useSearchParams retourne [params, setParams]
        const params = searchParams[0];
        const isEditMode = params.get('edit') === 'true';
        if (isEditMode) {
            const layoutJson = sessionStorage.getItem('edit-node-layout');
            if (layoutJson) {
                try {
                    const layout = JSON.parse(layoutJson);
                    handleLoadTemplate(layout, false);
                    // Clean up sessionStorage
                    sessionStorage.removeItem('edit-node-layout');
                } catch (e) {
                    console.error("Failed to parse layout from session storage", e);
                    toast({
                        variant: "destructive",
                        title: t.designerErrorLoad,
                        description: t.designerErrorLoadDescription,
                    });
                }
            }
        }
    }, [searchParams, t]);

  useEffect(() => {
    async function loadTemplates() {
        if (isModelLibraryOpen) {
            const templates = await getNodeTemplates();
            setSavedTemplates(templates);
        }
    }
    loadTemplates();
  }, [isModelLibraryOpen]);
  
  const handleNewCanvas = () => {
    setNodeElements([]);
    setNodeName(t.designerMyNode);
    setSelectedElementIds([]);
    setIsNewProjectDialogOpen(false);
  };


  const addElement = (type: DesignerElement['type']) => {
    if (!canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;
    
    let newElement: DesignerElement;
    const now = Date.now();
    const defaultBorderRadius = { tl: 0, tr: 0, br: 0, bl: 0 };

    switch(type) {
        case 'handle': {
            newElement = { id: `handle-${now}`, type: 'handle', x: canvasCenterX, y: canvasCenterY, position: Position.Left, handleType: 'source' };
            break;
        }
        case 'rectangle': {
            const width = 150, height = 80;
            newElement = { id: `rect-${now}`, type, x: canvasCenterX - width/2, y: canvasCenterY - height/2, width, height, fill: '#e9ecef', stroke: '#495057', strokeWidth: 1, borderRadius: defaultBorderRadius };
            break;
        }
        case 'circle': {
            const width = 80, height = 80;
            newElement = { id: `circle-${now}`, type, x: canvasCenterX - width/2, y: canvasCenterY - height/2, width, height, fill: '#e9ecef', stroke: '#495057', strokeWidth: 1 };
            break;
        }
        case 'text': {
            const width = 100, height = 20;
            const dataKey = `text_${fieldElements.length + 1}`;
            newElement = { id: `text-${now}`, type, x: canvasCenterX - width/2, y: canvasCenterY - height/2, width, height, dataKey, content: '{{data.label}}', fill: '#000000', fontSize: 14, fontFamily: 'sans-serif', fontWeight: 'normal', fontStyle: 'normal' };
            break;
        }
        case 'image': {
            const width = 60, height = 60;
            const dataKey = `image_${fieldElements.length + 1}`;
            newElement = { id: `image-${now}`, type, x: canvasCenterX - width/2, y: canvasCenterY - height/2, width, height, dataKey, src: '{{data.avatar}}', borderRadius: defaultBorderRadius };
            break;
        }
        case 'line': {
            const length = 100;
            newElement = { id: `line-${now}`, type, x1: canvasCenterX - length/2, y1: canvasCenterY, x2: canvasCenterX + length/2, y2: canvasCenterY, stroke: '#495057', strokeWidth: 2 };
            break;
        }
    }
    
    setNodeElements(prev => [...prev, newElement]);
    setSelectedElementIds([newElement.id]);
  };
  
  const importSvg = async () => {
    const svgContent = await importSvgFile();
    if (svgContent) {
        // TODO: Implement parsing logic for the SVG content
        console.log("SVG content received, parsing to be implemented:", svgContent);
        toast({
            title: t.designerSvgImported,
            description: t.designerSvgImportedDescription,
        });
    }
  };

    const updateSelectedElement = (props: Partial<DesignerElement>) => {
        if (selectedElementIds.length === 0) return;
        setNodeElements(prev =>
            prev.map(el =>
                selectedElementIds.includes(el.id)
                    ? { ...el, ...props } as DesignerElement
                    : el
            )
        );
    };
  
  const updateBorderRadius = (corner: keyof BorderRadius, value: number) => {
    if (!selectedElement || (selectedElement.type !== 'rectangle' && selectedElement.type !== 'image')) return;
    
    const newBorderRadius = {
      ...((selectedElement as RectangleElement | ImageElement).borderRadius || { tl: 0, tr: 0, br: 0, bl: 0 }),
      [corner]: value,
    };

    updateSelectedElement({ borderRadius: newBorderRadius });
  }


  const deleteSelectedElements = () => {
    if (selectedElementIds.length === 0) return;
    setNodeElements(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
    setSelectedElementIds([]);
  };

  const moveElementInStack = (elementId: string, direction: 'up' | 'down', list: 'elements' | 'fields') => {
    const sourceArray = list === 'elements' ? nodeElements : fieldElements;
    const index = sourceArray.findIndex(el => el.id === elementId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index + 1 : index - 1;

    if (newIndex < 0 || newIndex >= sourceArray.length) return;

    const elementToMove = sourceArray[index];
    const mainIndex = nodeElements.findIndex(el => el.id === elementToMove.id);
    
    const elementToSwapWith = sourceArray[newIndex];
    const mainSwapIndex = nodeElements.findIndex(el => el.id === elementToSwapWith.id);
    
    const newElements = [...nodeElements];
    
    const temp = newElements[mainIndex];
    newElements[mainIndex] = newElements[mainSwapIndex];
    newElements[mainSwapIndex] = temp;

    setNodeElements(newElements);
};

  const alignSelectedElements = (type: 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom') => {
    if (selectedElements.length < 2) return;
    
    const newElements = [...nodeElements];
    const bbox = selectedElements.reduce((acc, el) => {
        return {
            minX: Math.min(acc.minX, el.x),
            minY: Math.min(acc.minY, el.y),
            maxX: Math.max(acc.maxX, el.x + el.width),
            maxY: Math.max(acc.maxY, el.y + el.height),
        }
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const hCenter = bbox.minX + (bbox.maxX - bbox.minX) / 2;
    const vCenter = bbox.minY + (bbox.maxY - bbox.minY) / 2;

    selectedElementIds.forEach(id => {
        const index = newElements.findIndex(el => el.id === id);
        if (index !== -1 && 'x' in newElements[index]) {
            const el = newElements[index] as BaseElement;
            switch(type) {
                case 'left': el.x = bbox.minX; break;
                case 'right': el.x = bbox.maxX - el.width; break;
                case 'h-center': el.x = hCenter - el.width / 2; break;
                case 'top': el.y = bbox.minY; break;
                case 'bottom': el.y = bbox.maxY - el.height; break;
                case 'v-center': el.y = vCenter - el.height / 2; break;
            }
        }
    });
    setNodeElements(newElements);
  };

  const distributeSelectedElements = (type: 'horizontal' | 'vertical') => {
    if (selectedElements.length < 3) return;

    const newElements = [...nodeElements];
    const sorted = [...selectedElements].sort((a, b) => type === 'horizontal' ? a.x - b.x : a.y - b.y);

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
    const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
    
    const range = type === 'horizontal' ? (last.x + last.width) - first.x : (last.y + last.height) - first.y;
    const totalSize = type === 'horizontal' ? totalWidth : totalHeight;
    const spacing = (range - totalSize) / (sorted.length - 1);

    let currentPos = type === 'horizontal' ? first.x + first.width : first.y + first.height;

    for (let i = 1; i < sorted.length - 1; i++) {
        const elId = sorted[i].id;
        const index = newElements.findIndex(el => el.id === elId);
        if (index !== -1) {
            const el = newElements[index] as BaseElement;
            currentPos += spacing;
            if (type === 'horizontal') el.x = currentPos;
            else el.y = currentPos;
            currentPos += type === 'horizontal' ? el.width : el.height;
        }
    }
    setNodeElements(newElements);
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeElTag = document.activeElement?.tagName;
        const isInputFocused = activeElTag === 'INPUT' || activeElTag === 'TEXTAREA' || activeElTag === 'SELECT';

        if (e.key === 'Backspace' && isInputFocused) {
            return;
        }

        if (isInputFocused) {
            if (e.key === 'Escape') {
                (document.activeElement as HTMLElement)?.blur();
            }
            return;
        }
        
        if (selectedElementIds.length === 0) return;


        if (e.key === 'Delete') {
            e.preventDefault();
            deleteSelectedElements();
            return;
        }

        let dx = 0;
        let dy = 0;
        
        const moveAmount = e.shiftKey ? gridSize : 1;

        switch (e.key) {
            case 'ArrowUp':
                dy = -moveAmount;
                break;
            case 'ArrowDown':
                dy = moveAmount;
                break;
            case 'ArrowLeft':
                dx = -moveAmount;
                break;
            case 'ArrowRight':
                dx = moveAmount;
                break;
            default:
                return;
        }

        e.preventDefault();

        setNodeElements(prev =>
            prev.map(el => {
                if (selectedElementIds.includes(el.id)) {
                    if ('x' in el) {
                        return { ...el, x: el.x + dx, y: el.y + dy };
                    }
                    if ('x1' in el) { // It's a line
                        return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
                    }
                }
                return el;
            })
        );
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementIds, nodeElements]);

  const handleMouseDown = (e: React.MouseEvent, el?: DesignerElement, handleType?: 'start' | 'end') => {
    e.stopPropagation();

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const clientX = e.clientX - canvasRect.left;
    const clientY = e.clientY - canvasRect.top;
    
    if (el) {
        const isSelected = selectedElementIds.includes(el.id);
        
        if (e.shiftKey) {
            setSelectedElementIds(prev =>
                isSelected ? prev.filter(id => id !== el.id) : [...prev, el.id]
            );
        } else if (!isSelected) {
            setSelectedElementIds([el.id]);
        }
        
        if (selectedElementIds.includes(el.id) || !isSelected) {
             setDraggingState({ isDragging: true, elementId: el.id, handleType });

            if (el.type === 'line' && handleType) {
                const x = handleType === 'start' ? el.x1 : el.x2;
                const y = handleType === 'start' ? el.y1 : el.y2;
                dragOffset.current = { x: clientX - x, y: clientY - y };
            } else if ('x' in el) {
                dragOffset.current = { x: clientX - el.x, y: clientY - el.y };
            }
        }
       
    } else { 
        if (!e.shiftKey) {
            setSelectedElementIds([]);
        }
        setSelectionRect({ startX: clientX, startY: clientY, currentX: clientX, currentY: clientY });
        setDraggingState({ isDragging: false, elementId: null });
    }
};


  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const clientX = e.clientX - canvasRect.left;
    const clientY = e.clientY - canvasRect.top;

    if (selectionRect) {
        setSelectionRect(prev => prev ? { ...prev, currentX: clientX, currentY: clientY } : null);
        return;
    }
    
    if (!draggingState.isDragging || !draggingState.elementId) return;
    
    const elementBeingDragged = nodeElements.find(el => el.id === draggingState.elementId);
    if (!elementBeingDragged || !('x' in elementBeingDragged || 'x1' in elementBeingDragged)) return;

    let dx = 0;
    let dy = 0;
    
    if ('x' in elementBeingDragged) {
        dx = clientX - dragOffset.current.x - elementBeingDragged.x;
        dy = clientY - dragOffset.current.y - elementBeingDragged.y;
    }

    setNodeElements(prev =>
        prev.map(el => {
            if (el.id === draggingState.elementId) {
                if (el.type === 'line' && draggingState.handleType) {
                    if (draggingState.handleType === 'start') {
                        return { ...el, x1: clientX - dragOffset.current.x, y1: clientY - dragOffset.current.y };
                    } else {
                        return { ...el, x2: clientX - dragOffset.current.x, y2: clientY - dragOffset.current.y };
                    }
                } else if ('x' in el) {
                    return { ...el, x: clientX - dragOffset.current.x, y: clientY - dragOffset.current.y };
                }
            } else if (selectedElementIds.includes(el.id) && el.id !== draggingState.elementId) {
                 if ('x' in el) {
                    return { ...el, x: el.x + dx, y: el.y + dy };
                 }
                 if ('x1' in el) {
                    return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
                 }
            }
            return el;
        })
    );
};


  const handleMouseUp = () => {
    if (selectionRect) {
        const { startX, startY, currentX, currentY } = selectionRect;
        const selectionX1 = Math.min(startX, currentX);
        const selectionY1 = Math.min(startY, currentY);
        const selectionX2 = Math.max(startX, currentX);
        const selectionY2 = Math.max(startY, currentY);

        const idsToAdd: string[] = [];

        nodeElements.forEach(el => {
            let elX1, elY1, elX2, elY2;

            if ('x' in el) {
                elX1 = (el.x ?? 0);
                elY1 = (el.y ?? 0);
                // Only access width/height if present (not HandleElement)
                if ('width' in el && 'height' in el) {
                    elX2 = (el.x ?? 0) + (el.width ?? 0);
                    elY2 = (el.y ?? 0) + (el.height ?? 0);
                } else {
                    elX2 = elX1;
                    elY2 = elY1;
                }
            } else if ('x1' in el) { // Line
                elX1 = Math.min(el.x1, el.x2);
                elY1 = Math.min(el.y1, el.y2);
                elX2 = Math.max(el.x1, el.x2);
                elY2 = Math.max(el.y1, el.y2);
            } else {
                return;
            }

            if (selectionX1 < elX2 && selectionX2 > elX1 && selectionY1 < elY2 && selectionY2 > elY1) {
                idsToAdd.push(el.id);
            }
        });
        
        setSelectedElementIds(prev => [...new Set([...prev, ...idsToAdd])]);
        setSelectionRect(null);
    }
    setDraggingState({ isDragging: false, elementId: null });
  };

  const generateNodeLayout = (): CustomNodeLayout | null => {
      const layoutElements = nodeElements.filter(el => el.type !== 'handle') as Array<ShapeElement | TextElement | ImageElement | LineElement>;
      const handles = nodeElements.filter(el => el.type === 'handle') as HandleElement[];
  
      if (layoutElements.length === 0) {
          toast({
              variant: "destructive",
              title: t.designerSaveError,
              description: t.designerSaveErrorDescription,
          });
          return null;
      }
      
            const movableElements = nodeElements.filter(el => 'x' in el && typeof el.x === 'number' && typeof el.y === 'number') as Array<ShapeElement | TextElement | ImageElement | HandleElement>;
            const lineElements = nodeElements.filter(el => el.type === 'line' && typeof (el as LineElement).x1 === 'number' && typeof (el as LineElement).y1 === 'number' && typeof (el as LineElement).x2 === 'number' && typeof (el as LineElement).y2 === 'number') as Array<LineElement>;

            const allXCoords = [
                ...movableElements.flatMap(el => [el.x, ('width' in el && typeof el.width === 'number') ? el.x + el.width : el.x]),
                ...lineElements.flatMap(l => [l.x1, l.x2])
            ];
            const allYCoords = [
                ...movableElements.flatMap(el => [el.y, ('height' in el && typeof el.height === 'number') ? el.y + el.height : el.y]),
                ...lineElements.flatMap(l => [l.y1, l.y2])
            ];

            if (allXCoords.length === 0 || allYCoords.length === 0) {
                return {
                     name: nodeName,
                     width: 0,
                     height: 0,
                     elements: [],
                     handles: []
                }
            }

            const minX = Math.min(...allXCoords);
            const minY = Math.min(...allYCoords);
            const maxX = Math.max(...allXCoords);
            const maxY = Math.max(...allYCoords);
      
            const finalElements = layoutElements.map(el => {
                const { id, ...rest } = el;
                if ('x' in rest && typeof rest.x === 'number' && 'y' in rest && typeof rest.y === 'number') {
                        return { ...rest, x: rest.x - minX, y: rest.y - minY };
                }
                if ('x1' in rest && typeof rest.x1 === 'number' && 'y1' in rest && typeof rest.y1 === 'number' && 'x2' in rest && typeof rest.x2 === 'number' && 'y2' in rest && typeof rest.y2 === 'number') {
                        return { ...rest, x1: rest.x1 - minX, y1: rest.y1 - minY, x2: rest.x2 - minX, y2: rest.y2 - minY };
                }
                return rest;
            }) as CustomNodeLayout['elements'];
      
            const convertedElements = finalElements.map(el => {
                if ((el.type === 'rectangle' || el.type === 'image') && el.borderRadius && typeof el.borderRadius === 'object') {
                    const { borderRadius, ...rest } = el as any;
                    return {
                        ...rest,
                        rx: borderRadius.tl,
                        borderRadius: `${borderRadius.tl}px ${borderRadius.tr}px ${borderRadius.br}px ${borderRadius.bl}px`,
                    };
                }
                return el;
            });

            return {
                    name: nodeName,
                    width: maxX - minX,
                    height: maxY - minY,
                    elements: convertedElements as any[], // Correction typage SvgElement/DesignerElement
                    handles: handles.map(h => ({
                            ...h,
                            x: h.x - minX,
                            y: h.y - minY,
                    }))
            };
    };
  

  const handleSaveNode = async () => {
    const nodeLayout = generateNodeLayout();
    if (nodeLayout) {
        await saveNodeTemplate(nodeLayout);
        toast({
            title: t.designerTemplateSaved,
            description: t.designerTemplateSavedDescription.replace('{name}', nodeLayout.name),
        });
    }
  };

  const handleLoadTemplate = (template: CustomNodeLayout, showToast = true) => {
    if (!canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;

    const offsetX = canvasCenterX - template.width / 2;
    const offsetY = canvasCenterY - template.height / 2;

    const newElements: DesignerElement[] = template.elements.map((el, index) => {
        const now = Date.now();
        const id = `${el.type}-${now}-${index}`;
        if ('x' in el) {
            const baseEl = { ...el, id, x: (el.x ??0) + offsetX, y: (el.y ??0) + offsetY };
            if ((baseEl.type === 'rectangle' || baseEl.type === 'image') && typeof baseEl.borderRadius === 'string') {
                const parts = baseEl.borderRadius.replace(/px/g, '').split(' ').map(Number);
                baseEl.borderRadius = {
                    tl: parts[0] || 0,
                    tr: parts[1] || parts[0] || 0,
                    br: parts[2] || parts[0] || 0,
                    bl: parts[3] || parts[1] || parts[0] || 0
                };
            }
            if ((baseEl.type === 'text' || baseEl.type === 'image') && !baseEl.dataKey) {
                baseEl.dataKey = `${baseEl.type}_${now}_${index}`;
            }

            return baseEl as ShapeElement | TextElement | ImageElement;
        }
        if ('x1' in el) {
             return { ...el, id, x1: (el.x1 ?? 0) + offsetX, y1: (el.y1 ?? 0) + offsetY, x2: (el.x2 ?? 0) + offsetX, y2: (el.y2 ?? 0) + offsetY } as LineElement;
        }
        return { ...el, id } as DesignerElement;
    });

    const newHandles: HandleElement[] = template.handles.map((h, index) => ({
        ...h,
        id: `${h.type}-${Date.now()}-${index}`,
        x: h.x + offsetX,
        y: h.y + offsetY
    }));

    setNodeName(template.name);
    setNodeElements([...newElements, ...newHandles]);
    setIsModelLibraryOpen(false);
    
    if (showToast) {
        toast({
            title: t.designerTemplateLoaded,
            description: t.designerTemplateLoadedDescription.replace('{name}', template.name),
        });
    }
  };

  const handleDeleteTemplate = async (templateName: string) => {
    await deleteNodeTemplate(templateName);
    const updatedTemplates = await getNodeTemplates();
    setSavedTemplates(updatedTemplates);
    toast({
        variant: "destructive",
        title: t.designerTemplateDeleted,
        description: t.designerTemplateDeletedDescription.replace('{name}', templateName),
    });
  };

  const handlePreview = () => {
    const layout = generateNodeLayout();
    if (layout) {
        setPreviewLayout(layout);
        setIsPreviewOpen(true);
    }
  }

  const getElementIcon = (type: DesignerElement['type']) => {
    switch (type) {
        case 'rectangle': return <Square className="h-4 w-4" />;
        case 'circle': return <Circle className="h-4 w-4" />;
        case 'text': return <Text className="h-4 w-4" />;
        case 'image': return <ImageIcon className="h-4 w-4" />;
        case 'line': return <LineIcon className="h-4 w-4" />;
        case 'handle': return <GripVertical className="h-4 w-4" />;
        default: return <Edit className="h-4 w-4" />;
    }
  };

  return (
    <TooltipProvider>
        <div className="flex h-screen w-screen flex-col bg-muted/40" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-4">
            <Tooltip><TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={closeCurrentWindow}> 
                    <X className="mr-2 h-4 w-4" />
                    {t.designerClose}
                </Button>
            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerClose}</p></TooltipContent></Tooltip>
            <h1 className="text-lg font-semibold">{t.designerTitle}</h1>
            <Tooltip><TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setIsNewProjectDialogOpen(true)}>
                    <FilePlus className="mr-2 h-4 w-4" />
                    {t.designerNew}
                </Button>
            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerNew}</p></TooltipContent></Tooltip>
            <AlertDialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.designerConfirmNewTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.designerConfirmNewDescription}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleNewCanvas}>{t.designerContinue}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
            <div className="flex items-center gap-2">
                <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" onClick={handlePreview} disabled={nodeElements.length === 0}>
                        <View className="mr-2 h-4 w-4" />
                        {t.designerPreview}
                    </Button>
                </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerPreview}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setIsModelLibraryOpen(true)}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {t.designerOpen}
                    </Button>
                </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerOpen}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                    <Button onClick={handleSaveNode} disabled={nodeElements.length === 0}>
                        <Save className="mr-2 h-4 w-4" />
                        {t.designerSave}
                    </Button>
                </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerSave}</p></TooltipContent></Tooltip>
            </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
            {/* Left Panel: Design Tools */}
            <aside className="flex w-64 flex-col gap-4 border-r bg-background p-4">
                <h2 className="text-lg font-semibold">{t.designerTools}</h2>
                <Separator />
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{t.designerBasicShapes}</h3>
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" className="justify-start" onClick={() => addElement('rectangle')}>
                            <Square className="mr-2 h-4 w-4" /> {t.designerRectangle}
                        </Button>
                    </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerAddRectangle}</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" className="justify-start" onClick={() => addElement('circle')}>
                            <Circle className="mr-2 h-4 w-4" /> {t.designerCircle}
                        </Button>
                    </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerAddCircle}</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" className="justify-start" onClick={() => addElement('text')}>
                            <Type className="mr-2 h-4 w-4" /> {t.designerText}
                        </Button>
                    </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerAddText}</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" className="justify-start" onClick={() => addElement('image')}>
                            <ImageIcon className="mr-2 h-4 w-4" /> {t.designerImage}
                        </Button>
                    </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerAddImage}</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" className="justify-start" onClick={() => addElement('line')}>
                            <LineIcon className="mr-2 h-4 w-4" /> {t.designerLine}
                        </Button>
                    </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerAddLine}</p></TooltipContent></Tooltip>
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{t.designerComponents}</h3>
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" className="justify-start" onClick={() => addElement('handle')}>
                            <Plus className="mr-2 h-4 w-4" /> {t.designerHandle}
                        </Button>
                    </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerAddHandle}</p></TooltipContent></Tooltip>
                </div>
                 <Separator />
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{t.designerImport}</h3>
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" className="justify-start" onClick={importSvg}>
                            <Upload className="mr-2 h-4 w-4" /> {t.designerImportSVG}
                        </Button>
                    </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerImportSVG}</p></TooltipContent></Tooltip>
                </div>
            </aside>

            {/* Center Panel: Canvas */}
            <div className="flex flex-1 items-center justify-center p-8 bg-[#2a3a59]">
            <div 
                ref={canvasRef} 
                className="relative h-full w-full rounded-lg shadow-inner" 
                onMouseDown={(e) => handleMouseDown(e)}
                style={{ 
                  userSelect: draggingState.isDragging || !!selectionRect ? 'none' : 'auto',
                  background: `
                    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: `${gridSize}px ${gridSize}px`,
                }}
            >
                {/* Render non-line elements */}
                {nodeElements.filter(el => el.type !== 'line').map(el => {
                    const isSelected = selectedElementIds.includes(el.id);
                                        let borderRadiusStyle = {};
                                        if ((el.type === 'rectangle' || el.type === 'image') && el.borderRadius) {
                                                borderRadiusStyle = { borderRadius: `${el.borderRadius.tl}px ${el.borderRadius.tr}px ${el.borderRadius.br}px ${el.borderRadius.bl}px` };
                                        } else if (el.type === 'circle') {
                                                borderRadiusStyle = { borderRadius: '50%' };
                                        }
                                        // Sécurisation width/height/x/y
                                        const x = 'x' in el && typeof el.x === 'number' ? el.x : 0;
                                        const y = 'y' in el && typeof el.y === 'number' ? el.y : 0;
                                        const width = 'width' in el && typeof el.width === 'number' ? el.width : 0;
                                        const height = 'height' in el && typeof el.height === 'number' ? el.height : 0;
                                        switch (el.type) {
                                            case 'handle':
                                                return (
                                                    <div
                                                            key={el.id}
                                                            onMouseDown={(e) => handleMouseDown(e, el)}
                                                            className={cn(
                                                                    "absolute cursor-grab w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground flex items-center justify-center",
                                                                    draggingState.isDragging && "cursor-grabbing",
                                                                    isSelected && "ring-2 ring-primary ring-offset-2"
                                                            )}
                                                            style={{ left: `${x - 8}px`, top: `${y - 8}px` }}
                                                            title={`Handle: ${el.position}`}
                                                    >
                                                            <GripVertical className="h-3 w-3 text-primary-foreground" />
                                                    </div>
                                                );
                                            case 'image':
                                                return (
                                                     <div
                                                        key={el.id}
                                                        onMouseDown={(e) => handleMouseDown(e, el)}
                                                        className={cn( "absolute cursor-grab", draggingState.isDragging && "cursor-grabbing", isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-[#2a3a59]" )}
                                                        style={{ left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, ...borderRadiusStyle }}
                                                    >
                                                        <img src={(el as ImageElement).src.includes('{{') ? 'https://placehold.co/100x100/ced4da/748ffc?text=IMG' : el.src} alt="placeholder" style={borderRadiusStyle} />
                                                    </div>
                                                );
                                            default: // rectangle, circle, text
                                                return (
                                                    <div
                                                        key={el.id}
                                                        onMouseDown={(e) => handleMouseDown(e, el)}
                                                        className={cn( "absolute cursor-grab", draggingState.isDragging && "cursor-grabbing", isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-[#2a3a59]" )}
                                                        style={{
                                                                left: `${x}px`,
                                                                top: `${y}px`,
                                                                width: `${width}px`,
                                                                height: `${height}px`,
                                                                backgroundColor: el.type !== 'text' ? (el as ShapeElement).fill : 'transparent',
                                                                borderColor: el.type === 'rectangle' || el.type === 'circle' ? (el as ShapeElement).stroke : 'transparent',
                                                                borderWidth: el.type === 'rectangle' || el.type === 'circle' ? `${(el as ShapeElement).strokeWidth}px` : '0',
                                                                ...borderRadiusStyle
                                                        }}
                                                    >
                                                    {el.type === 'text' && (
                                                            <span 
                                                                    style={{ 
                                                                            color: el.fill, 
                                                                            fontSize: `${el.fontSize}px`,
                                                                            fontFamily: el.fontFamily,
                                                                            fontWeight: el.fontWeight,
                                                                            fontStyle: el.fontStyle,
                                                                    }}
                                                                    className="pointer-events-none w-full h-full flex items-center justify-center"
                                                            >
                                                                    {el.content}
                                                            </span>
                                                    )}
                                                    </div>
                                                );
                                        }
                })}
                {/* Render lines and their handles */}
                {nodeElements.filter(el => el.type === 'line').map(el => {
                    const lineEl = el as LineElement;
                    const isSelected = selectedElementIds.includes(lineEl.id);
                    return (
                        <React.Fragment key={lineEl.id}>
                            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                <g className="pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, lineEl)}>
                                    <line
                                        x1={lineEl.x1} y1={lineEl.y1}
                                        x2={lineEl.x2} y2={lineEl.y2}
                                        stroke="transparent"
                                        strokeWidth={(lineEl.strokeWidth || 0) + 10}
                                        className="cursor-pointer"
                                    />
                                    <line
                                        x1={lineEl.x1} y1={lineEl.y1}
                                        x2={lineEl.x2} y2={lineEl.y2}
                                        stroke={isSelected ? 'hsl(var(--primary))' : lineEl.stroke}
                                        strokeWidth={lineEl.strokeWidth}
                                    />
                                </g>
                            </svg>
                            {isSelected && (
                                <>
                                    <div 
                                        onMouseDown={(e) => handleMouseDown(e, lineEl, 'start')}
                                        className="absolute w-3 h-3 rounded-full bg-background border-2 border-primary cursor-grab pointer-events-auto"
                                        style={{ left: lineEl.x1 - 6, top: lineEl.y1 - 6 }}
                                    />
                                    <div 
                                        onMouseDown={(e) => handleMouseDown(e, lineEl, 'end')}
                                        className="absolute w-3 h-3 rounded-full bg-background border-2 border-primary cursor-grab pointer-events-auto"
                                        style={{ left: lineEl.x2 - 6, top: lineEl.y2 - 6 }}
                                    />
                                </>
                            )}
                        </React.Fragment>
                    );
                })}
                {/* Render selection rectangle */}
                {selectionRect && (
                    <div
                        className="absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
                        style={{
                            left: Math.min(selectionRect.startX, selectionRect.currentX),
                            top: Math.min(selectionRect.startY, selectionRect.currentY),
                            width: Math.abs(selectionRect.startX - selectionRect.currentX),
                            height: Math.abs(selectionRect.startY - selectionRect.currentY),
                        }}
                    />
                )}
            </div>
            </div>

            {/* Right Panel: Properties */}
            <aside className="w-80 border-l bg-background p-4 overflow-y-auto">
                <Card className="h-full">
                <Tabs defaultValue="properties">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="properties">
                            <Edit className="mr-2 h-4 w-4"/> {t.designerProperties}
                        </TabsTrigger>
                        <TabsTrigger value="layers">
                            <Layers className="mr-2 h-4 w-4"/> {t.designerLayers}
                        </TabsTrigger>
                        <TabsTrigger value="fields">
                            <Database className="mr-2 h-4 w-4"/> {t.designerFields}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="properties">
                        <CardHeader>
                            <CardTitle className="text-lg">{t.designerProperties}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="node-name">{t.designerNodeName}</Label>
                                <Input 
                                    id="node-name" 
                                    placeholder={t.designerMyNode} 
                                    value={nodeName}
                                    onChange={(e) => setNodeName(e.target.value)}
                                />
                            </div>
                            <Separator/>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">{t.designerSelectionProperties}</h3>
                                {selectedElementIds.length > 1 ? (
                                    <div className="space-y-4">
                                        <p className='text-sm'>{t.designerElementsSelected.replace('{count}', String(selectedElementIds.length))}</p>
                                        <div>
                                            <h4 className='text-sm font-medium text-muted-foreground mb-2'>{t.designerAlignment}</h4>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => alignSelectedElements('left')}><AlignHorizontalJustifyStart className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent><p>{t.designerAlignLeft}</p></TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => alignSelectedElements('h-center')}><AlignHorizontalJustifyCenter className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent><p>{t.designerAlignCenterH}</p></TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => alignSelectedElements('right')}><AlignHorizontalJustifyEnd className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent><p>{t.designerAlignRight}</p></TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => alignSelectedElements('top')}><AlignVerticalJustifyStart className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent><p>{t.designerAlignTop}</p></TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => alignSelectedElements('v-center')}><AlignVerticalJustifyCenter className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent><p>{t.designerAlignCenterV}</p></TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => alignSelectedElements('bottom')}><AlignVerticalJustifyEnd className='h-4 w-4' /></Button></TooltipTrigger><TooltipContent><p>{t.designerAlignBottom}</p></TooltipContent></Tooltip>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className='text-sm font-medium text-muted-foreground mb-2'>{t.designerDistribution}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" className="w-full" onClick={() => distributeSelectedElements('horizontal')} disabled={selectedElements.length < 3}><AlignHorizontalSpaceAround className='mr-2 h-4 w-4' /> {t.designerDistributeH}</Button></TooltipTrigger><TooltipContent><p>{t.designerDistributeH}</p></TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="outline" className="w-full" onClick={() => distributeSelectedElements('vertical')} disabled={selectedElements.length < 3}><AlignVerticalSpaceAround className='mr-2 h-4 w-4' /> {t.designerDistributeV}</Button></TooltipTrigger><TooltipContent><p>{t.designerDistributeV}</p></TooltipContent></Tooltip>
                                            </div>
                                        </div>
                                        <Separator />
                                         <div>
                                            <Tooltip><TooltipTrigger asChild>
                                                <Button variant="destructive" className="w-full" onClick={deleteSelectedElements}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {t.designerDeleteElements}
                                                </Button>
                                            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerDeleteElements}</p></TooltipContent></Tooltip>
                                        </div>
                                    </div>
                                ) : selectedElement ? (
                                    <div className="space-y-4">
                                        { (selectedElement.type === 'text' || selectedElement.type === 'image') && 'dataKey' in selectedElement && (
                                            <div>
                                                <Label htmlFor="prop-datakey">{t.designerDataKey}</Label>
                                                <Input id="prop-datakey" value={selectedElement.dataKey} onChange={(e) => updateSelectedElement({ dataKey: e.target.value })} />
                                            </div>
                                        )}
                                        
                                        { (selectedElement.type !== 'line') && 'x' in selectedElement && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label htmlFor="prop-x">X</Label>
                                                    <Input id="prop-x" type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })} />
                                                </div>
                                                <div>
                                                    <Label htmlFor="prop-y">Y</Label>
                                                    <Input id="prop-y" type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })} />
                                                </div>
                                            </div>
                                        )}

                                        { (selectedElement.type === 'rectangle' || selectedElement.type === 'circle' || selectedElement.type === 'text' || selectedElement.type === 'image') && 'width' in selectedElement && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label htmlFor="prop-width">{t.designerWidth}</Label>
                                                    <Input id="prop-width" type="number" value={selectedElement.width} onChange={(e) => updateSelectedElement({ width: parseInt(e.target.value) || 0 })} />
                                                </div>
                                                <div>
                                                    <Label htmlFor="prop-height">{t.designerHeight}</Label>
                                                    <Input id="prop-height" type="number" value={selectedElement.height} onChange={(e) => updateSelectedElement({ height: parseInt(e.target.value) || 0 })} />
                                                </div>
                                            </div>
                                        )}

                                        { (selectedElement.type === 'rectangle' || selectedElement.type === 'image') && (
                                            <div>
                                                <Label>{t.designerCornerRadius}</Label>
                                                <div className="grid grid-cols-4 gap-2">
                                                     <Input type="number" min="0" value={(selectedElement.borderRadius || {tl:0}).tl} onChange={(e) => updateBorderRadius('tl', parseInt(e.target.value) || 0)} />
                                                     <Input type="number" min="0" value={(selectedElement.borderRadius || {tr:0}).tr} onChange={(e) => updateBorderRadius('tr', parseInt(e.target.value) || 0)} />
                                                     <Input type="number" min="0" value={(selectedElement.borderRadius || {br:0}).br} onChange={(e) => updateBorderRadius('br', parseInt(e.target.value) || 0)} />
                                                     <Input type="number" min="0" value={(selectedElement.borderRadius || {bl:0}).bl} onChange={(e) => updateBorderRadius('bl', parseInt(e.target.value) || 0)} />
                                                </div>
                                            </div>
                                        )}

                                        {selectedElement.type === 'text' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="prop-content">{t.designerContent}</Label>
                                                    <Input id="prop-content" value={selectedElement.content} onChange={(e) => updateSelectedElement({ content: e.target.value })} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label htmlFor="prop-fontsize">{t.designerFontSise}</Label>
                                                        <Input id="prop-fontsize" type="number" min="1" value={selectedElement.fontSize} onChange={e => updateSelectedElement({ fontSize: parseInt(e.target.value) })}/>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="prop-fill">{t.designerColor}</Label>
                                                        <Input id="prop-fill" type="color" value={selectedElement.fill} onChange={(e) => updateSelectedElement({ fill: e.target.value })} className="p-1 w-full" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label>{t.designerFont}</Label>
                                                     <Select 
                                                        value={selectedElement.fontFamily} 
                                                        onValueChange={(value: string) => updateSelectedElement({ fontFamily: value })}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sans-serif">Sans Serif</SelectItem>
                                                            <SelectItem value="serif">Serif</SelectItem>
                                                            <SelectItem value="monospace">Monospace</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>{t.designerStyle}</Label>
                                                    <ToggleGroup 
                                                        type="multiple"
                                                        variant="outline" 
                                                        value={[selectedElement.fontWeight || '', selectedElement.fontStyle || '']}
                                                        onValueChange={(value) => {
                                                            updateSelectedElement({
                                                                fontWeight: value.includes('bold') ? 'bold' : 'normal',
                                                                fontStyle: value.includes('italic') ? 'italic' : 'normal',
                                                            })
                                                        }}
                                                        className="w-full"
                                                    >
                                                        <ToggleGroupItem value="bold" className="w-full"><Bold className="h-4 w-4" /></ToggleGroupItem>
                                                        <ToggleGroupItem value="italic" className="w-full"><Italic className="h-4 w-4" /></ToggleGroupItem>
                                                    </ToggleGroup>
                                                </div>
                                            </div>
                                        )}
                                        
                                         {selectedElement.type === 'image' && (
                                            <div>
                                                <Label htmlFor="prop-src">{t.designerSource}</Label>
                                                <Input id="prop-src" value={selectedElement.src} onChange={(e) => updateSelectedElement({ src: e.target.value })} />
                                            </div>
                                        )}

                                        { (selectedElement.type === 'rectangle' || selectedElement.type === 'circle') && 'fill' in selectedElement && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label htmlFor="prop-fill">{t.designerFill}</Label>
                                                        <Input id="prop-fill" type="color" value={selectedElement.fill} onChange={(e) => updateSelectedElement({ fill: e.target.value })} className="p-1" />
                                                    </div>
                                                     <div>
                                                        <Label htmlFor="prop-stroke">{t.designerStroke}</Label>
                                                        <Input id="prop-stroke" type="color" value={selectedElement.stroke} onChange={(e) => updateSelectedElement({ stroke: e.target.value })} className="p-1" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label htmlFor="prop-stroke-width">{t.designerStrokeWidth}</Label>
                                                    <Input id="prop-stroke-width" type="number" min="0" value={selectedElement.strokeWidth} onChange={(e) => updateSelectedElement({ strokeWidth: parseInt(e.target.value) || 0 })} />
                                                </div>
                                            </div>
                                        )}

                                        {selectedElement.type === 'line' && (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Label htmlFor="prop-x1" className="col-span-2">{t.designerStartPoint}</Label>
                                                    <Input id="prop-x1" type="number" value={selectedElement.x1} onChange={e => updateSelectedElement({ x1: parseInt(e.target.value) })}/>
                                                    <Input id="prop-y1" type="number" value={selectedElement.y1} onChange={e => updateSelectedElement({ y1: parseInt(e.target.value) })}/>
                                                    <Label htmlFor="prop-x2" className="col-span-2">{t.designerEndPoint}</Label>
                                                    <Input id="prop-x2" type="number" value={selectedElement.x2} onChange={e => updateSelectedElement({ x2: parseInt(e.target.value) })}/>
                                                    <Input id="prop-y2" type="number" value={selectedElement.y2} onChange={e => updateSelectedElement({ y2: parseInt(e.target.value) })}/>
                                                </div>
                                                 <Separator />
                                                <div className="space-y-2">
                                                    <div>
                                                        <Label htmlFor="prop-stroke">{t.designerColor}</Label>
                                                        <Input id="prop-stroke" type="color" value={selectedElement.stroke} onChange={(e) => updateSelectedElement({ stroke: e.target.value })} className="p-1 w-full" />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="prop-strokeWidth">{t.designerThickness}</Label>
                                                        <Input id="prop-strokeWidth" type="number" min="1" value={selectedElement.strokeWidth} onChange={e => updateSelectedElement({ strokeWidth: parseInt(e.target.value) })}/>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        { selectedElement.type === 'handle' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="handle-pos">{t.designerSidePosition}</Label>
                                                    <Select 
                                                        value={selectedElement.position} 
                                                        onValueChange={(value: Position) => updateSelectedElement({ position: value })}
                                                    >
                                                        <SelectTrigger id="handle-pos"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value={Position.Top}>{t.designerPositionTop}</SelectItem>
                                                            <SelectItem value={Position.Bottom}>{t.designerPositionBottom}</SelectItem>
                                                            <SelectItem value={Position.Left}>{t.designerPositionLeft}</SelectItem>
                                                            <SelectItem value={Position.Right}>{t.designerPositionRight}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label htmlFor="handle-type">{t.designerType}</Label>
                                                    <Select 
                                                        value={selectedElement.handleType} 
                                                        onValueChange={(value: 'source' | 'target') => updateSelectedElement({ handleType: value })}
                                                    >
                                                        <SelectTrigger id="handle-type"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value='source'>{t.designerSourceType}</SelectItem>
                                                            <SelectItem value='target'>{t.designerTargetType}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}
                                        <Separator />
                                        <div>
                                            <Tooltip><TooltipTrigger asChild>
                                                <Button variant="destructive" className="w-full" onClick={deleteSelectedElements}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {selectedElementIds.length > 1 ? t.designerDeleteSelectedElements : t.designerDeleteElement}
                                                </Button>
                                            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerDeleteElement}</p></TooltipContent></Tooltip>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-center text-muted-foreground p-4 border rounded-md">
                                        {t.designerNoElementSelected}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="layers">
                         <CardHeader>
                            <CardTitle className="text-lg">{t.designerLayers}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {nodeElements.length > 0 ? (
                                [...nodeElements].reverse().map((el, index, arr) => (
                                    <div 
                                        key={el.id}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-md cursor-pointer border",
                                            selectedElementIds.includes(el.id) ? "bg-accent" : "bg-transparent hover:bg-muted/50"
                                        )}
                                        onClick={(e) => {
                                            if (e.shiftKey) {
                                                setSelectedElementIds(prev =>
                                                    prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]
                                                );
                                            } else {
                                                setSelectedElementIds([el.id]);
                                            }
                                        }}
                                    >
                                        {getElementIcon(el.type)}
                                        <span className="flex-1 text-sm capitalize truncate">{el.id}</span>
                                        <div className="flex gap-1">
                                            <Tooltip><TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6" 
                                                    disabled={index === 0}
                                                    onClick={(e) => { e.stopPropagation(); moveElementInStack(el.id, 'up', 'elements'); }}
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerMoveUp}</p></TooltipContent></Tooltip>
                                            <Tooltip><TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6" 
                                                    disabled={index === arr.length - 1}
                                                    onClick={(e) => { e.stopPropagation(); moveElementInStack(el.id, 'down', 'elements'); }}
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerMoveDown}</p></TooltipContent></Tooltip>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                 <div className="text-xs text-center text-muted-foreground p-4 border rounded-md">
                                    {t.designerNoLayer}
                                </div>
                            )}
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="fields">
                         <CardHeader>
                            <CardTitle className="text-lg">{t.designerFields}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {fieldElements.length > 0 ? (
                                [...fieldElements].reverse().map((el, index, arr) => (
                                    <div 
                                        key={el.id}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-md cursor-pointer border",
                                            selectedElementIds.includes(el.id) ? "bg-accent" : "bg-transparent hover:bg-muted/50"
                                        )}
                                        onClick={(e) => {
                                            if (e.shiftKey) {
                                                setSelectedElementIds(prev =>
                                                    prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]
                                                );
                                            } else {
                                                setSelectedElementIds([el.id]);
                                            }
                                        }}
                                    >
                                        {getElementIcon(el.type)}
                                        <span className="flex-1 text-sm truncate">{el.dataKey}</span>
                                        <div className="flex gap-1">
                                            <Tooltip><TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6" 
                                                    disabled={index === 0}
                                                    onClick={(e) => { e.stopPropagation(); moveElementInStack(el.id, 'up', 'fields'); }}
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerMoveUp}</p></TooltipContent></Tooltip>
                                            <Tooltip><TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6" 
                                                    disabled={index === arr.length - 1}
                                                    onClick={(e) => { e.stopPropagation(); moveElementInStack(el.id, 'down', 'fields'); }}
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerMoveDown}</p></TooltipContent></Tooltip>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                 <div className="text-xs text-center text-muted-foreground p-4 border rounded-md">
                                    {t.designerNoField}
                                </div>
                            )}
                        </CardContent>
                    </TabsContent>
                </Tabs>
                </Card>
            </aside>
        </main>
        
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{(t.designerPreviewTitle || "Preview of template '{name}'").replace('{name}', previewLayout?.name || '')}</DialogTitle>
                    <DialogDescription>
                        {t.designerPreviewDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className="h-96">
                    <PreviewCanvas layout={previewLayout} translations={t} />
                </div>
            </DialogContent>
        </Dialog>
        <Dialog open={isModelLibraryOpen} onOpenChange={setIsModelLibraryOpen}>
            <DialogContent className="max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>{t.designerModelLibrary}</DialogTitle>
                    <DialogDescription>
                        {t.designerModelLibraryDescription}
                    </DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="user-templates">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="user-templates">{t.designerMyTemplates}</TabsTrigger>
                        <TabsTrigger value="default-templates">{t.designerDefaultTemplates}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="user-templates">
                        <div className="py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
                            {savedTemplates.length > 0 ? (
                                savedTemplates.map(template => (
                                    <Card key={template.name}>
                                        <CardHeader>
                                            <CardTitle className="text-base truncate">{template.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="h-40">
                                              <PreviewCanvas layout={template} className="h-full w-full" translations={t}/>
                                            </div>
                                            <div className="flex gap-2">
                                                <Tooltip><TooltipTrigger asChild>
                                                    <Button className="w-full" onClick={() => handleLoadTemplate(template)}>{t.designerLoad}</Button>
                                                </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerLoadTemplate}</p></TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild>
                                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteTemplate(template.name)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerDeleteTemplate}</p></TooltipContent></Tooltip>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <p className="col-span-full text-center text-muted-foreground">{t.designerNoTemplate}</p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="default-templates">
                        <div className="py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
                            {defaultTemplates.map(template => (
                                <Card key={template.name}>
                                    <CardHeader>
                                        <CardTitle className="text-base truncate">{template.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="h-40">
                                            <PreviewCanvas layout={template} className="h-full w-full" translations={t}/>
                                        </div>
                                        <Tooltip><TooltipTrigger asChild>
                                            <Button className="w-full" onClick={() => handleLoadTemplate(template)}>{t.designerLoad}</Button>
                                        </TooltipTrigger><TooltipContent><p>{t.tooltipDesignerLoadTemplate}</p></TooltipContent></Tooltip>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
        </div>
    </TooltipProvider>
  );
}

// Wrapping the component to suspend it, which allows useSearchParams() to work
export default function DesignerPage() {
    const { isLoaded, config } = useConfig();
    const t = translations[config.language];

    if (!isLoaded) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">{t.loading}</p>
            </div>
        );
    }

    const LoadingComponent = () => (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">{t.loading}</p>
        </div>
    );

    return (
        <React.Suspense fallback={<LoadingComponent />}>
            <DesignerPageComponent />
        </React.Suspense>
    );
}

    