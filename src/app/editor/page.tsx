
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useConfig } from "@/hooks/use-config";
import { translations } from "@/config/translations";
import { Button } from "@/components/ui/button";
import {
  File,
  Home,
  Settings,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  Maximize,
  Book,
  Info,
  Pin,
  PinOff,
  BrainCircuit,
  FilePlus,
  FileSpreadsheet,
  Upload,
  FileImage,
  FileText,
  PlusSquare,
  CornerDownRight,
  ArrowRight,
  Trash2,
  Unlink,
  Link as LinkIcon,
  Pencil,
  ClipboardType,
  Scissors,
  Clipboard,
  ClipboardPaste,
  Move,
  Combine,
  GitBranch,
  ArrowDownToLine,
  AlignHorizontalDistributeCenter,
  Grid,
  MousePointer,
  View,
  Palette,
  FileEdit,
  CheckSquare,
  Map,
  Lock,
  LocateFixed,
  Keyboard,
  FileTerminal,
  ArrowRightLeft,
  Star,
  Calendar,
  Network,
  Projector,
  Spline,
  Minus,
  RectangleHorizontal,
Circle,
Eraser,
AlignHorizontalJustifyStart,
AlignVerticalJustifyStart,
Layers,
MoveUpRight,
Square,
PencilRuler,
ChevronDown,
Paintbrush,
CaseSensitive,
Type,
Baseline,
Pilcrow,
Heading1,
Heading2,
Bold,
Italic,
MinusSquare,
ArrowLeft,
DownloadCloud,
Search,
X,
Loader2,
Download
} from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';
import { NewProjectModal } from "@/components/new-project-modal";
import { SettingsModal, Category as SettingsCategory } from "@/components/settings-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MindMapCanvas, MindMapCanvasHandles, SelectionMode, ProjectConfig } from "@/components/canvas/mind-map-canvas";
import { ReactFlowProvider, useReactFlow, Node, Edge, NodeTypes, EdgeTypes, useStoreApi } from "reactflow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cva } from "class-variance-authority";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { HistoryEntry } from "@/hooks/use-history";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { HelpModal } from "@/components/help-modal";
import { CustomNodeLayout } from "@/lib/node-templates";
import { getNodeTemplates } from "@/services/node-template.service";
import { defaultTemplates } from "@/lib/default-node-templates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { openProject, saveProject, importImageForNode, listenForOpenFile, exportAs } from "@/services/project-manager";
import { useToast } from "@/hooks/use-toast";
import { useUpdater } from "@/hooks/use-updater";


const CustomNodePropertiesPanel = ({ node, onUpdateData, translations: t }: { node: Node, onUpdateData: (nodeId: string, data: any) => void, translations: any }) => {
    const layout = node.data.layout as CustomNodeLayout;
    if (!layout) return null;

    const dataFields = layout.elements.filter(el => (el.type === 'text' || el.type === 'image') && el.dataKey)
        .reduce((acc, el) => {
            if (el.dataKey && !acc.some(field => field.dataKey === el.dataKey)) {
                acc.push({ dataKey: el.dataKey, type: el.type });
            }
            return acc;
        }, [] as { dataKey: string, type: 'text' | 'image' | 'rectangle' | 'circle' | 'line' }[]);

    if (dataFields.length === 0) {
        return (
            <div className="p-4 text-sm text-center text-muted-foreground">
                {t.propertiesCustomNodeNoData}
            </div>
        )
    }
    
    const handleImportImage = async (dataKey: string) => {
        const imageUrl = await importImageForNode();
        if (imageUrl) {
            onUpdateData(node.id, { [dataKey]: imageUrl });
        }
    };


    const handleChange = (dataKey: string, value: string) => {
        onUpdateData(node.id, { [dataKey]: value });
    }

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">{t.propertiesNodeData}</h3>
            <Separator />
            {dataFields.map(({ dataKey, type }) => (
                <div key={dataKey} className="space-y-2">
                    <Label htmlFor={`prop-${dataKey}`} className="capitalize">{dataKey.replace(/_/g, ' ')}</Label>
                    {type === 'image' ? (
                         <div className="space-y-2">
                            <Input
                                id={`prop-${dataKey}`}
                                value={node.data[dataKey] || ''}
                                onChange={(e) => handleChange(dataKey, e.target.value)}
                                placeholder={t.propertiesImageURL}
                            />
                             <Button variant="outline" className="w-full" onClick={() => handleImportImage(dataKey)}>
                                <FileImage className="mr-2 h-4 w-4" />
                                {t.propertiesImportImage}
                            </Button>
                        </div>
                    ) : (
                        <Textarea
                            id={`prop-${dataKey}`}
                            value={node.data[dataKey] || ''}
                            onChange={(e) => handleChange(dataKey, e.target.value)}
                            placeholder={t.propertiesTextPlaceholder}
                            rows={dataKey.toLowerCase().includes('description') ? 3 : 1}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}

const ListButton = ({ icon, label, tooltipLabel, disabled, onClick, variant = "ghost" }: { icon: React.ElementType, label: string, tooltipLabel?: string, disabled?: boolean, onClick?: () => void, variant?: "ghost" | "default" | "outline" }) => {
    const content = (
        <Button 
            variant={variant} 
            className="w-full justify-start px-2 py-1 h-auto text-sm"
            disabled={disabled} 
            onClick={onClick}
        >
            {React.createElement(icon, { className: "h-4 w-4 mr-2"})}
            <span>{label}</span>
        </Button>
    );

    if (!tooltipLabel) return content;

    return (
      <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
              <p>{tooltipLabel}</p>
          </TooltipContent>
      </Tooltip>
    );
};

const ribbonButtonVariants = cva(
    "flex flex-col h-auto items-center justify-center gap-1 ribbon-btn",
    {
        variants: {
            size: {
                small: "p-1 w-12",
                medium: "p-1.5 w-16",
                large: "p-2 h-full w-20",
            },
        },
        defaultVariants: {
            size: "small",
        },
    }
);

const ribbonIconContainerVariants = cva(
    "flex items-center justify-center",
    {
        variants: {
            size: {
                small: "h-4 w-4",
                medium: "h-5 w-5",
                large: "h-8 w-8",
            },
        },
        defaultVariants: {
            size: "medium",
        },
    }
);

const ribbonIconVariants = cva(
    "",
    {
        variants: {
            size: {
                small: "h-4 w-4",
                medium: "h-5 w-5",
                large: "h-7 w-7",
            },
        },
        defaultVariants: {
            size: "medium",
        },
    }
);


  const RibbonButton = ({ 
      icon, 
      label, 
      tooltipLabel, 
      disabled, 
      onClick, 
      size = "small", 
      variant = "ghost",   // valeur par défaut
      children 
  }: { 
      icon?: React.ElementType, 
      label: string, 
      tooltipLabel?: string, 
      disabled?: boolean, 
      onClick?: () => void, 
      size?: "small" | "medium" | "large", 
      variant?: "ghost" | "default" | "outline", 
      children?: React.ReactNode 
  }) => {
    const content = (
        <Button 
            variant={variant} 
            className={cn(ribbonButtonVariants({ size }))}
            disabled={disabled} 
            onClick={onClick}
        >
            <div className={cn(ribbonIconContainerVariants({ size }))}>
                {icon && React.createElement(icon, { className: cn(ribbonIconVariants({ size })) })}
                {children}
            </div>
            <span className="text-center w-full text-[10px] leading-tight">{label}</span>
        </Button>
    );

    if (!tooltipLabel) return content;

    return (
      <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
              <p>{tooltipLabel}</p>
          </TooltipContent>
      </Tooltip>
    );
};


const RibbonGroup = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className="flex flex-col justify-start h-full relative px-1">
    <span className="text-xs text-muted-foreground w-full text-center pb-1">{title}</span>
    <div className={cn("flex items-start justify-center gap-0.5", className)}>
      {children}
    </div>
  </div>
);

const ColorPalettePopover = ({ title, description, color, onColorChange }: { title: string, description: string, color: string, onColorChange: (color: string) => void }) => {
    const palette = [
        "#000000", "#444444", "#888888", "#cccccc", "#ffffff",
        "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
        "#3b82f6", "#8b5cf6", "#ec4899"
    ];
    const [hexValue, setHexValue] = useState(color);

    useEffect(() => {
        setHexValue(color);
    }, [color]);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHexValue(e.target.value);
    };
    
    const handleHexBlur = () => {
        if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
            onColorChange(hexValue);
        } else {
            setHexValue(color);
        }
    };
    
    const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHexValue(e.target.value);
        onColorChange(e.target.value);
    };

    return (
        <PopoverContent className="w-64 p-2">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">{title}</h4>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="color-hex">Hex</Label>
                        <Input
                            id="color-hex"
                            value={hexValue}
                            onChange={handleHexChange}
                            onBlur={handleHexBlur}
                            className="col-span-2 h-8"
                        />
                    </div>
                     <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="color-picker">Color</Label>
                        <Input
                            id="color-picker"
                            type="color"
                            value={color}
                            onChange={handleColorInputChange}
                            className="col-span-2 h-8 p-1"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-1">
                    {palette.map((paletteColor) => (
                        <Button
                            key={paletteColor}
                            variant="outline"
                            className={cn(
                                "h-8 w-8 rounded-md p-0 border",
                                color?.toLowerCase() === paletteColor.toLowerCase() && "ring-2 ring-ring"
                            )}
                            style={{ backgroundColor: paletteColor }}
                            onClick={() => onColorChange(paletteColor)}
                        />
                    ))}
                </div>
            </div>
        </PopoverContent>
    );
}

function EditorUI({ projectConfig, loadedProject, onProjectLoad }: { projectConfig: ProjectConfig | null; loadedProject: any | null; onProjectLoad: (data: any) => void; }) {
  const { config } = useConfig();
  const { updateAvailable } = useUpdater();
  const t = translations[config.language];
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const headerRef = useRef<HTMLHeadElement>(null);
  const canvasRef = useRef<MindMapCanvasHandles>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialSettingsCategory, setInitialSettingsCategory] = useState<SettingsCategory>('general');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [initialHelpCategory, setInitialHelpCategory] = useState<'guide' | 'tutoriel'>('guide');

  const [activeTab, setActiveTab] = useState("home");
  const [isRibbonPinned, setIsRibbonPinned] = useState(true);
  const [isRibbonOpen, setIsRibbonOpen] = useState(isRibbonPinned);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("click");
  const [edgeType, setEdgeType] = useState<keyof EdgeTypes>("default");
  const [userTemplates, setUserTemplates] = useState<CustomNodeLayout[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);


  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [historyState, setHistoryState] = useState<{ canUndo: boolean, canRedo: boolean, past: HistoryEntry[] }>({ canUndo: false, canRedo: false, past: [] });
  const [clipboardState, setClipboardState] = useState<{ hasItems: boolean }>({ hasItems: false });
  
  // Node Style states
  const [nodeFillColor, setNodeFillColor] = useState("#ffffff");
  const [nodeBorderColor, setNodeBorderColor] = useState("#000000");
  const [nodeBorderWidth, setNodeBorderWidth] = useState(1);
  const [nodeTextColor, setNodeTextColor] = useState("#000000");
  const [nodeFontFamily, setNodeFontFamily] = useState("sans-serif");
  const [nodeFontSize, setNodeFontSize] = useState(14);
  const [nodeFontWeight, setNodeFontWeight] = useState<"normal" | "bold">("normal");
  const [nodeFontStyle, setNodeFontStyle] = useState<"normal" | "italic">("normal");

  // Edge Style states
  const [edgeColor, setEdgeColor] = useState("#000000");
  const [edgeWidth, setEdgeWidth] = useState(1);
  const [edgeLineStyle, setEdgeLineStyle] = useState<"solid" | "dashed">("solid");
  const [sourceMarker, setSourceMarker] = useState<boolean>(false);
  const [targetMarker, setTargetMarker] = useState<boolean>(false);


  const [showMinimap, setShowMinimap] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;
  const isSingleNodeSelected = selectedNodes.length === 1;
  const isSingleCustomNodeSelected = isSingleNodeSelected && selectedNodes[0].type === 'custom';
  const isSingleImageNodeSelected = isSingleNodeSelected && selectedNodes[0].type === 'image';
  const isSingleTextNodeSelected = isSingleNodeSelected && selectedNodes[0].type === 'text';

  const canEditCustomNode = selectedNodes.length === 1 && selectedNodes[0].type === 'custom';

  const allNodes = reactFlowInstance.getNodes();
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return allNodes.filter(node => 
        node.data.label && 
        typeof node.data.label === 'string' &&
        node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allNodes]);

  useEffect(() => {
    async function loadTemplates() {
        setUserTemplates(await getNodeTemplates());
    }
    loadTemplates();
  }, []);

  useEffect(() => {
    if (isSingleNodeSelected && !isSingleCustomNodeSelected) {
      const firstNode = selectedNodes[0];
      const nodeStyle = firstNode.data.style || {};

      setNodeFillColor(nodeStyle.backgroundColor || "#ffffff");
      setNodeBorderColor(nodeStyle.borderColor || "#000000");
      setNodeTextColor(nodeStyle.color || "#000000");

      const borderWidth = parseInt(String(nodeStyle.borderWidth || '1').replace('px', ''), 10);
      setNodeBorderWidth(borderWidth);

      setNodeFontFamily(nodeStyle.fontFamily || "sans-serif");
      const fontSize = parseInt(String(nodeStyle.fontSize || '14').replace('px', ''), 10);
      setNodeFontSize(fontSize);
      setNodeFontWeight(nodeStyle.fontWeight || "normal");
      setNodeFontStyle(nodeStyle.fontStyle || "normal");
    } else if (selectedEdges.length > 0) {
        const firstEdge = selectedEdges[0];
        const edgeStyle = firstEdge.style || {};
        setEdgeType(firstEdge.type || 'default');
        setEdgeColor(edgeStyle.stroke || "#000000");
        setEdgeWidth(Number(edgeStyle.strokeWidth) || 1);
        setEdgeLineStyle(edgeStyle.strokeDasharray ? "dashed" : "solid");
        setSourceMarker(!!firstEdge.markerStart);
        setTargetMarker(!!firstEdge.markerEnd);
    }
  }, [selectedNodes, selectedEdges, isSingleNodeSelected, isSingleCustomNodeSelected]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
            }
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSearchOpen]);
  
  useEffect(() => {
        const setupListener = async () => {
            const unlisten = await listenForOpenFile((projectData) => {
                onProjectLoad(projectData);
            });
            return unlisten;
        };

        const unlistenPromise = setupListener();

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, [onProjectLoad]);

  const openHelpModal = (category: 'guide' | 'tutoriel') => {
    setInitialHelpCategory(category);
    setIsHelpModalOpen(true);
  };

  const openSettingsModal = (category: SettingsCategory) => {
    setInitialSettingsCategory(category);
    setIsSettingsOpen(true);
  }

  const onSelectionChange = useCallback((params: { nodes: Node[], edges: Edge[] }) => {
    setSelectedNodes(params.nodes);
    setSelectedEdges(params.edges);
  }, []);
  
  const onHistoryChange = useCallback((history: { canUndo: boolean, canRedo: boolean, past: HistoryEntry[] }) => {
    setHistoryState(history);
  }, []);
  
  const onClipboardChange = useCallback((clipboard: { hasItems: boolean }) => {
    setClipboardState(clipboard);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleTabDoubleClick = () => {
    setIsRibbonPinned(!isRibbonPinned);
    if (!isRibbonPinned) {
        setIsRibbonOpen(true);
    }
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (headerRef.current && !headerRef.current.contains(e.target as HTMLElement)) {
      if (!isRibbonPinned) {
        setIsRibbonOpen(false);
      }
    }
  };

  const handleHeaderMouseEnter = () => {
    if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
    }
    if (!isRibbonOpen) {
        setIsRibbonOpen(true);
    }
  };

  const handleHeaderMouseLeave = () => {
    if (!isRibbonPinned) {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsRibbonOpen(false);
        }, 300);
    }
  };

  const handleSetNodeType = (type: keyof NodeTypes) => {
    canvasRef.current?.updateSelectedNodesType(type);
  };
  
  const handleSetCustomNodeType = (layout: CustomNodeLayout) => {
    canvasRef.current?.updateSelectedNodesType('custom', layout);
  };

  const handleSetEdgeType = (type: keyof EdgeTypes) => {
    setEdgeType(type);
    if (selectedEdges.length > 0) {
        canvasRef.current?.updateSelectedEdgesType(type);
    } else {
        canvasRef.current?.updateAllEdgesType(type);
    }
  };
  
  const handleUpdateNodeData = (nodeId: string, data: any) => {
    canvasRef.current?.updateNodeData(nodeId, data);
  };
  
  const handleUpdateNodeDimensions = (nodeId: string, width: number, height: number) => {
      canvasRef.current?.updateNodeDimensions(nodeId, width, height);
  };

  const onAddNode = () => {
    canvasRef.current?.addNode();
  };
  
  const onAddTextNode = () => {
    canvasRef.current?.addTextNode();
  };
  
  const onAddImageNode = () => {
      canvasRef.current?.addImageNode();
  };

  const onAddSubNode = () => {
    canvasRef.current?.addSubNode();
  };
  
  const onAddSiblingNode = () => {
    canvasRef.current?.addSiblingNode();
  };
  
  const onDeleteSelected = () => {
    canvasRef.current?.deleteSelected();
  };
  
  const onCut = () => canvasRef.current?.cut();
  const onCopy = () => canvasRef.current?.copy();
  const onPaste = () => canvasRef.current?.paste();

  const centerView = () => {
    canvasRef.current?.centerView();
  };

  const handleLayout = (direction: 'TB' | 'LR' | 'RADIAL') => {
    canvasRef.current?.applyLayout(direction);
  }

  const handleAlign = (axis: 'x' | 'y') => {
    canvasRef.current?.alignSelectedNodes(axis);
  }

  const handleDistribute = (axis: 'x' | 'y') => {
    canvasRef.current?.distributeSelectedNodes(axis);
  }
  
  const handleUndo = () => {
    canvasRef.current?.undo();
  }
  
  const handleRedo = () => {
    canvasRef.current?.redo();
  }
  
  const handleUndoTo = (index: number) => {
    canvasRef.current?.undoTo(index);
  }
  
  const handleNodeStyleChange = (style: React.CSSProperties) => {
    canvasRef.current?.updateSelectedNodesStyle(style);
  }
  
  const handleEdgeStyleChange = (style: React.CSSProperties) => {
    canvasRef.current?.updateSelectedEdgesStyle(style);
  }
  
  const handleEdgeMarkerChange = (marker: "source" | "target", hasMarker: boolean) => {
    canvasRef.current?.updateSelectedEdgesMarkers(marker, hasMarker);
  }
  
  const handleNodeBorderWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = e.target.valueAsNumber;
    setNodeBorderWidth(width);
    if (!isNaN(width)) {
        handleNodeStyleChange({ borderWidth: `${width}px` });
    }
  }
  
  const handleNodeFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = e.target.valueAsNumber;
    setNodeFontSize(size);
    if (!isNaN(size)) {
        handleNodeStyleChange({ fontSize: `${size}px` });
    }
  }

  const handleNodeFontFamilyChange = (family: string) => {
    setNodeFontFamily(family);
    handleNodeStyleChange({ fontFamily: family });
  }

  const toggleFontWeight = () => {
    const newWeight = nodeFontWeight === "bold" ? "normal" : "bold";
    setNodeFontWeight(newWeight);
    handleNodeStyleChange({ fontWeight: newWeight });
  }

  const toggleFontStyle = () => {
    const newStyle = nodeFontStyle === "italic" ? "normal" : "italic";
    setNodeFontStyle(newStyle);
    handleNodeStyleChange({ fontStyle: newStyle });
  }
  
  const handleEdgeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = e.target.valueAsNumber;
    setEdgeWidth(width);
    if (!isNaN(width)) {
        handleEdgeStyleChange({ strokeWidth: width });
    }
  }
  
  const toggleEdgeLineStyle = () => {
    const newStyle = edgeLineStyle === "solid" ? "dashed" : "solid";
    setEdgeLineStyle(newStyle);
    handleEdgeStyleChange({ strokeDasharray: newStyle === "dashed" ? "5 5" : undefined });
  };
  
  const toggleSourceMarker = () => {
    const newHasMarker = !sourceMarker;
    setSourceMarker(newHasMarker);
    handleEdgeMarkerChange("source", newHasMarker);
  }

  const toggleTargetMarker = () => {
      const newHasMarker = !targetMarker;
      setTargetMarker(newHasMarker);
      handleEdgeMarkerChange("target", newHasMarker);
  }
  
  const handleEditCustomNode = () => {
    if (!canEditCustomNode) return;
    const nodeToEdit = selectedNodes[0];
    const layoutToEdit = nodeToEdit.data.layout;
    if (layoutToEdit) {
      sessionStorage.setItem('edit-node-layout', JSON.stringify(layoutToEdit));
      window.location.href = "/designer";
    }
  };

  const onSaveProject = async () => {
    const projectData = reactFlowInstance.toObject();
    await saveProject(projectData);
  };

  const onOpenProject = async () => {
    const projectData = await openProject();
    if (projectData && canvasRef.current) {
        canvasRef.current.restore(projectData);
    }
  };

  const onExport = () => {
    const diagramState = reactFlowInstance.toObject();
    sessionStorage.setItem('export-diagram-state', JSON.stringify(diagramState));
    window.location.href = "/export";
  };

  const currentNodeType = selectedNodes.length > 0 ? selectedNodes[0].type : null;
  
  const handleSearchResultClick = (nodeId: string) => {
    reactFlowInstance.fitView({ nodes: [{ id: nodeId }], duration: 800, maxZoom: 1.5 });
    reactFlowInstance.setNodes(prev => prev.map(n => ({...n, selected: n.id === nodeId})));
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  const handleImportImageForNode = async (nodeId: string) => {
    const imageUrl = await importImageForNode();
    if (imageUrl) {
        handleUpdateNodeData(nodeId, { src: imageUrl });
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-muted/40" onClick={handleCanvasClick}>
        <header className="bg-background border-b sticky top-0 z-50" 
          ref={headerRef}
          onMouseEnter={handleHeaderMouseEnter}
          onMouseLeave={handleHeaderMouseLeave}
        >
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="flex h-10 items-center gap-1 px-4">
              <Link to="/" className="mr-2">
                <Button variant="ghost" className="flex items-center gap-1 h-auto px-1 py-0.5">
                  <BrainCircuit className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span className="font-semibold text-sm">{t.title}</span>
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-8" />
              <TabsList onDoubleClick={handleTabDoubleClick} className="rounded-none justify-start p-0 bg-transparent gap-0 h-auto">
                <TabsTrigger value="file" className="rounded-sm text-sm px-2 py-1.5 data-[state=inactive]:hover:bg-accent">{t.editorFile}</TabsTrigger>
                <Separator orientation="vertical" className="h-6" />
                <TabsTrigger value="home" className="rounded-sm text-sm px-2 py-1.5 data-[state=inactive]:hover:bg-accent">{t.editorMainTab}</TabsTrigger>
                <Separator orientation="vertical" className="h-6" />
                <TabsTrigger value="layout" className="rounded-sm text-sm px-2 py-1.5 data-[state=inactive]:hover:bg-accent">{t.layout}</TabsTrigger>
                <Separator orientation="vertical" className="h-6" />
                <TabsTrigger value="designer" className="text-primary font-semibold rounded-sm text-sm px-2 py-1.5 data-[state=inactive]:hover:bg-accent">{t.editorDesigner}</TabsTrigger>
                <Separator orientation="vertical" className="h-6" />
                <TabsTrigger value="view" className="rounded-sm text-sm px-2 py-1.5 data-[state=inactive]:hover:bg-accent">{t.editorView}</TabsTrigger>
                <Separator orientation="vertical" className="h-6" />
                <TabsTrigger value="help" className="rounded-sm text-sm px-2 py-1.5 data-[state=inactive]:hover:bg-accent">{t.editorHelp}</TabsTrigger>
              </TabsList>
              <div className="flex-1"></div>
              <Separator orientation="vertical" className="h-8" />
               <div className="flex items-center gap-0.5">
                 <div className="flex rounded-md border">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none border-r" disabled={!historyState.canUndo} onClick={handleUndo}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 px-1 rounded-l-none" disabled={!historyState.canUndo}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {historyState.past.slice(-10).reverse().map((entry, index) => (
                        <DropdownMenuItem key={index} onSelect={() => handleUndoTo(historyState.past.length - 1 - index)}>
                          {entry.actionName}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                 </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!historyState.canRedo} onClick={handleRedo}>
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSaveProject}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenProject}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1 mx-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCut} disabled={!hasSelection}>
                      <Scissors className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy} disabled={!hasSelection}>
                      <Clipboard className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPaste} disabled={!clipboardState.hasItems}>
                      <ClipboardPaste className="h-4 w-4" />
                  </Button>
              </div>
              {updateAvailable && (
                  <Button variant="outline" size="sm" className="text-primary border-primary animate-pulse" onClick={() => openSettingsModal('about')}>
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      {t.updateAvailable}
                  </Button>
              )}
            </div>
            <Separator/>
            <div className={cn("p-1 bg-background min-h-[110px] border-b shadow-neu-pressed bg-neu-bg relative transition-all duration-300 ease-in-out overflow-hidden flex items-start",
              isRibbonOpen ? "opacity-100" : "opacity-0 h-0 min-h-0 p-0 border-none"
            )}>
              <div className="flex gap-2 h-full w-full">
                <TabsContent value="file" className="m-0 p-1 flex-1 h-full">
                  <div className="flex items-start gap-0 h-full">
                      <div className="flex items-center h-full">
                        <RibbonGroup title="">
                            <Link to="/" className="h-full">
                                <RibbonButton icon={Home} label={t.ribbonBack} tooltipLabel={t.tooltipBackToHome} size="large"/>
                            </Link>
                        </RibbonGroup>
                      </div>
                      <Separator orientation="vertical" className="h-20"/>

                      <RibbonGroup title={t.ribbonGroupFile} className="grid grid-cols-2">
                          <RibbonButton icon={FilePlus} label={t.new} tooltipLabel={t.tooltipNewProject} onClick={() => setIsNewProjectOpen(true)} />
                          <RibbonButton icon={FolderOpen} label={t.ribbonOpen} tooltipLabel={t.tooltipOpenProject} onClick={onOpenProject} />
                          <RibbonButton icon={Save} label={t.ribbonSave} tooltipLabel={t.tooltipSave} onClick={onSaveProject} />
                          <RibbonButton icon={Save} label={t.ribbonSaveAs} tooltipLabel={t.tooltipSaveAs} onClick={() => onSaveProject()} />
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                      <RibbonGroup title={t.ribbonGroupExport}>
                        <RibbonButton icon={Download} label={t.ribbonExport} tooltipLabel={t.tooltipExport} size="medium" onClick={onExport} />
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                      <div className="flex items-center h-full">
                        <RibbonGroup title={t.ribbonGroupApplication}>
                            <RibbonButton icon={Settings} label={t.settings} tooltipLabel={t.tooltipOpenSettings} onClick={() => openSettingsModal('general')} size="large" />
                        </RibbonGroup>
                      </div>
                  </div>
                </TabsContent>
                <TabsContent value="home" className="m-0 p-1 flex-1 h-full">
                    <div className="flex items-start gap-0 h-full">
                      <RibbonGroup title={t.ribbonGroupSelection} className="flex-col !items-stretch">
                          <ListButton icon={MousePointer} label={t.ribbonClick} tooltipLabel={t.tooltipSelectionClick} onClick={() => setSelectionMode('click')} variant={selectionMode === 'click' ? 'default' : 'ghost'} />
                          <ListButton icon={RectangleHorizontal} label={t.ribbonRectangle} tooltipLabel={t.tooltipSelectionRectangle} onClick={() => setSelectionMode('rect')} variant={selectionMode === 'rect' ? 'default' : 'ghost'} />
                          <ListButton icon={Layers} label={t.ribbonMultiple} tooltipLabel={t.tooltipSelectionMultiple} onClick={() => setSelectionMode('multi')} variant={selectionMode === 'multi' ? 'default' : 'ghost'}/>
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                      <RibbonGroup title={t.ribbonGroupAdd} className="flex-col !items-stretch">
                        <ListButton icon={PlusSquare} label={t.ribbonNode} tooltipLabel={t.tooltipAddNode} onClick={onAddNode} />
                        <ListButton icon={CornerDownRight} label={t.ribbonSubNode} tooltipLabel={t.tooltipAddSubNode} onClick={onAddSubNode} disabled={selectedNodes.length !== 1} />
                        <ListButton icon={ArrowRight} label={t.ribbonSibling} tooltipLabel={t.tooltipAddSiblingNode} onClick={onAddSiblingNode} disabled={selectedNodes.length !== 1} />
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                       <RibbonGroup title={t.ribbonGroupNodeType} className="grid grid-cols-2">
                          <RibbonButton icon={Square} label={t.nodeStyleRectangle} tooltipLabel={t.tooltipNodeStyleRectangle} onClick={() => handleSetNodeType("rectangle")} variant={currentNodeType === "rectangle" ? 'default' : 'ghost'} />
                          <RibbonButton icon={RectangleHorizontal} label={t.nodeStyleRounded} tooltipLabel={t.tooltipNodeStyleRounded} onClick={() => handleSetNodeType("rounded")} variant={currentNodeType === "rounded" ? 'default' : 'ghost'}/>
                          <RibbonButton icon={Circle} label={t.nodeStyleOval} tooltipLabel={t.tooltipNodeStyleOval}  onClick={() => handleSetNodeType("oval")} variant={currentNodeType === "oval" ? 'default' : 'ghost'} />
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div>
                                <RibbonButton icon={PencilRuler} label={t.nodeStyleCustom} tooltipLabel={t.tooltipNodeStyleCustom} variant={currentNodeType === 'custom' ? 'default' : 'ghost'} />
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>{t.designerMyTemplates}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {userTemplates.length > 0 ? userTemplates.map(template => (
                                    <DropdownMenuItem key={template.name} onSelect={() => handleSetCustomNodeType(template)}>{template.name}</DropdownMenuItem>
                                )) : <DropdownMenuItem disabled>{t.designerNoTemplate}</DropdownMenuItem>}
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>{t.designerDefaultTemplates}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {defaultTemplates.map(template => (
                                    <DropdownMenuItem key={template.name} onSelect={() => handleSetCustomNodeType(template)}>{template.name}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                           </DropdownMenu>
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                       <RibbonGroup title={t.ribbonGroupEdgeType} className="grid grid-cols-2">
                          <RibbonButton icon={Spline} label={t.connectorStyleBezier} tooltipLabel={t.tooltipConnectorStyleBezier} onClick={() => handleSetEdgeType("default")} variant={edgeType === "default" ? 'default' : 'ghost'}/>
                          <RibbonButton icon={MoveUpRight} label={t.connectorStyleStep} tooltipLabel={t.tooltipConnectorStyleStep} onClick={() => handleSetEdgeType("step")} variant={edgeType === "step" ? 'default' : 'ghost'}/>
                          <RibbonButton icon={Minus} label={t.connectorStyleLinear} tooltipLabel={t.tooltipConnectorStyleLinear} onClick={() => handleSetEdgeType("straight")} variant={edgeType === "straight" ? 'default' : 'ghost'}/>
                          <RibbonButton icon={CornerDownRight} label={t.connectorStyleRoundedStep} tooltipLabel={t.tooltipConnectorStyleRoundedStep} onClick={() => handleSetEdgeType("smoothstep")} variant={edgeType === "smoothstep" ? 'default' : 'ghost'}/>
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                       <RibbonGroup title={t.ribbonGroupDelete} className="flex-col !items-stretch">
                          <ListButton icon={Trash2} label={t.ribbonNode} tooltipLabel={t.tooltipDeleteNode} disabled={selectedNodes.length === 0} onClick={onDeleteSelected} />
                          <ListButton icon={Unlink} label={t.ribbonLink} tooltipLabel={t.tooltipDeleteLink} disabled={selectedEdges.length === 0} onClick={onDeleteSelected} />
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                       <RibbonGroup title={t.ribbonGroupInsert} className="flex-col !items-stretch">
                          <ListButton icon={Type} label={t.ribbonText} tooltipLabel={t.tooltipInsertText} onClick={onAddTextNode} />
                          <ListButton icon={FileImage} label={t.ribbonImage} tooltipLabel={t.tooltipInsertImage} onClick={onAddImageNode} />
                      </RibbonGroup>
                    </div>
                </TabsContent>
                <TabsContent value="designer" className="m-0 p-1 flex-1 h-full">
                   <div className="flex items-start gap-0 h-full">
                      <RibbonGroup title={t.ribbonGroupTemplates}>
                          <RibbonButton icon={FilePlus} label={t.new} tooltipLabel={t.tooltipNewStyleTemplate} size="medium" onClick={() => { // crée une nouvelle sous-fenêtre Tauri
                                                                                                                                              const designerWindow = new WebviewWindow("designer-window", {
                                                                                                                                                url: "/designer", // <-- ta route React
                                                                                                                                                title: "Designer",
                                                                                                                                                width: 1000,
                                                                                                                                                height: 700,
                                                                                                                                                resizable: true,
                                                                                                                                              });

                                                                                                                                              // debug si jamais la fenêtre n'arrive pas à se charger
                                                                                                                                              designerWindow.once("tauri://created", () => {
                                                                                                                                                console.log("Fenêtre Designer créée avec succès !");
                                                                                                                                              });

                                                                                                                                              designerWindow.once("tauri://error", (e) => {
                                                                                                                                                console.error("Erreur lors de la création de la fenêtre Designer :", e);
                                                                                                                                              });
                                                                                                                                            }}
                                                                                                                                            />
                          <RibbonButton icon={FileEdit} label={t.ribbonEdit} tooltipLabel={t.tooltipEditStyleTemplate} disabled={!canEditCustomNode} onClick={handleEditCustomNode} size="medium" />
                      </RibbonGroup>
                   </div>
                </TabsContent>
                <TabsContent value="view" className="m-0 p-1 flex-1 h-full">
                   <div className="flex items-start gap-0 h-full">
                      <RibbonGroup title="Zoom" className="flex-col !items-stretch">
                         <ListButton icon={ZoomIn} label={t.editorZoomIn} tooltipLabel={t.editorZoomIn} onClick={() => canvasRef.current?.zoomIn()} />
                         <ListButton icon={ZoomOut} label={t.editorZoomOut} tooltipLabel={t.editorZoomOut} onClick={() => canvasRef.current?.zoomOut()} />
                         <ListButton icon={Maximize} label={t.editorZoomAuto} tooltipLabel={t.editorZoomAuto} onClick={() => canvasRef.current?.fitView()} />
                      </RibbonGroup>
                     <Separator orientation="vertical" className="h-20"/>
                      <RibbonGroup title={t.ribbonGroupPanels}>
                          <RibbonButton icon={Map} label={t.ribbonMinimap} tooltipLabel={t.tooltipShowMinimap} onClick={() => setShowMinimap(!showMinimap)} variant={showMinimap ? "default" : "ghost"} size="medium" />
                          <RibbonButton icon={Grid} label={t.ribbonGrid} tooltipLabel={t.tooltipShowGrid} onClick={() => setShowGrid(!showGrid)} variant={showGrid ? "default" : "ghost"} size="medium" />
                      </RibbonGroup>
                     <Separator orientation="vertical" className="h-20"/>
                      <RibbonGroup title={t.ribbonGroupControls}>
                         <RibbonButton icon={Lock} label={t.ribbonLock} tooltipLabel={t.tooltipLockCanvas} onClick={() => setIsLocked(!isLocked)} variant={isLocked ? "default" : "ghost"} size="medium" />
                         <RibbonButton icon={LocateFixed} label={t.ribbonCenter} tooltipLabel={t.tooltipCenterView} onClick={centerView} disabled={selectedNodes.length === 0} size="medium" />
                      </RibbonGroup>
                   </div>
                </TabsContent>
                <TabsContent value="layout" className="m-0 p-1 flex-1 h-full">
                   <div className="flex items-start gap-0 h-full">
                      <RibbonGroup title={t.ribbonGroupLayout}>
                         <RibbonButton icon={ArrowDownToLine} label={t.ribbonHierarchy} tooltipLabel={t.tooltipLayoutHierarchy} onClick={() => handleLayout('TB')} size="medium" />
                         <RibbonButton icon={ArrowRight} label={t.ribbonTree} tooltipLabel={t.tooltipLayoutTree} onClick={() => handleLayout('LR')} size="medium" />
                         <RibbonButton icon={GitBranch} label={t.templateRadial} tooltipLabel={t.tooltipLayoutRadial} onClick={() => handleLayout('RADIAL')} size="medium" />
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                      <RibbonGroup title={t.ribbonGroupAlign} className="items-center">
                         <RibbonButton icon={AlignHorizontalJustifyStart} label={t.ribbonAlignH} tooltipLabel={t.tooltipAlignHorizontally} disabled={selectedNodes.length < 2} onClick={() => handleAlign('x')} size="medium" />
                         <RibbonButton icon={AlignVerticalJustifyStart} label={t.ribbonAlignV} tooltipLabel={t.tooltipAlignVertically} disabled={selectedNodes.length < 2} onClick={() => handleAlign('y')} size="medium" />
                         <RibbonButton icon={AlignHorizontalDistributeCenter} label={t.ribbonDistribute} tooltipLabel={t.tooltipDistributeNodes} disabled={selectedNodes.length < 3} onClick={() => handleDistribute('x')} size="medium" />
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                      <RibbonGroup title={t.ribbonGroupGrid}>
                         <RibbonButton icon={MousePointer} label={t.ribbonSnapToGrid} tooltipLabel={t.tooltipToggleSnapToGrid} onClick={() => setSnapToGrid(!snapToGrid)} variant={snapToGrid ? "default" : "ghost"} size="medium" />
                      </RibbonGroup>
                   </div>
                </TabsContent>
                <TabsContent value="help" className="m-0 p-1 flex-1 h-full">
                   <div className="flex items-start gap-0 h-full">
                      <RibbonGroup title={t.ribbonGroupSupport}>
                        <RibbonButton icon={Book} label={t.ribbonGuide} tooltipLabel={t.tooltipOpenUserGuide} size="large" onClick={() => openHelpModal('guide')}/>
                        <RibbonButton icon={FileTerminal} label={t.ribbonTutorial} tooltipLabel={t.tooltipViewTutorial} size="large" onClick={() => openHelpModal('tutoriel')}/>
                      </RibbonGroup>
                      <Separator orientation="vertical" className="h-20"/>
                      <RibbonGroup title={t.ribbonGroupHelp}>
                          <RibbonButton icon={Keyboard} label={t.ribbonShortcuts} tooltipLabel={t.tooltipShowShortcuts} size="medium" onClick={() => openSettingsModal('shortcuts')} />
                          <RibbonButton icon={Info} label={t.settingsAbout} tooltipLabel={t.tooltipAboutApp} size="medium" onClick={() => openSettingsModal('about')} />
                      </RibbonGroup>
                   </div>
                </TabsContent>
              </div>
              <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute bottom-1 right-1 h-5 w-5",
                    !isRibbonPinned && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                  onClick={() => setIsRibbonPinned(!isRibbonPinned)}
                  title={isRibbonPinned ? t.tooltipUnpinRibbon : t.tooltipPinRibbon}
              >
                  {isRibbonPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              </Button>
            </div>
          </Tabs>
        </header>
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 flex overflow-hidden">
            <div className="flex-1 h-full relative">
               {isSearchOpen && (
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm">
                    <Card className="shadow-lg">
                        <CardContent className="p-2 flex items-center gap-2">
                             <Search className="h-4 w-4 text-muted-foreground" />
                             <Input
                                ref={searchInputRef}
                                placeholder={t.searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border-none focus-visible:ring-0 shadow-none"
                             />
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setIsSearchOpen(false); setSearchTerm(""); }}>
                                 <X className="h-4 w-4" />
                             </Button>
                        </CardContent>
                        {searchResults.length > 0 && (
                            <>
                                <Separator />
                                <CardContent className="p-2 max-h-60 overflow-y-auto">
                                    {searchResults.map(node => (
                                        <Button
                                            key={node.id}
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => handleSearchResultClick(node.id)}
                                        >
                                            {node.data.label}
                                        </Button>
                                    ))}
                                </CardContent>
                            </>
                        )}
                    </Card>
                 </div>
               )}
              <MindMapCanvas 
                ref={canvasRef} 
                translations={t} 
                onSelectionChange={onSelectionChange} 
                onHistoryChange={onHistoryChange}
                onClipboardChange={onClipboardChange}
                onCursorMove={setCursorPosition}
                selectionMode={selectionMode}
                edgeType={edgeType}
                showMinimap={showMinimap}
                showGrid={showGrid}
                isLocked={isLocked}
                snapToGrid={snapToGrid}
                userTemplates={userTemplates}
                defaultTemplates={defaultTemplates}
                projectConfig={projectConfig}
                loadedProject={loadedProject}
              />
            </div>
            <aside className={cn(
              "bg-background border-l transition-all duration-300 ease-in-out overflow-y-auto",
              hasSelection ? "w-80" : "w-0 p-0 border-none"
            )}>
               {hasSelection && (
                   <Card className="h-full border-none rounded-none shadow-none">
                        <CardHeader>
                        <CardTitle>{t.properties}</CardTitle>
                        <CardDescription>
                            {selectedNodes.length > 0 
                                ? (t.propertiesDescription || "{count} nodes selected").replace('{count}', String(selectedNodes.length)) 
                                : (t.propertiesDescriptionEdge || "{count} edges selected").replace('{count}', String(selectedEdges.length))}
                        </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        {isSingleNodeSelected ? (
                            isSingleCustomNodeSelected ? (
                                <CustomNodePropertiesPanel node={selectedNodes[0]} onUpdateData={handleUpdateNodeData} translations={t} />
                            ) : isSingleImageNodeSelected ? (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm">{t.ribbonImage}</h4>
                                    <div className="space-y-2">
                                        <Label htmlFor="prop-image-src">{t.propertiesImageURL}</Label>
                                        <Input
                                            id="prop-image-src"
                                            value={selectedNodes[0].data.src || ''}
                                            onChange={(e) => handleUpdateNodeData(selectedNodes[0].id, { src: e.target.value })}
                                            placeholder="https://example.com/image.png"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label htmlFor="prop-width">{t.designerWidth}</Label>
                                            <Input id="prop-width" type="number" value={selectedNodes[0].data.width || 0} onChange={(e) => handleUpdateNodeDimensions(selectedNodes[0].id, parseInt(e.target.value) || 0, selectedNodes[0].data.height)} />
                                        </div>
                                        <div>
                                            <Label htmlFor="prop-height">{t.designerHeight}</Label>
                                            <Input id="prop-height" type="number" value={selectedNodes[0].data.height || 0} onChange={(e) => handleUpdateNodeDimensions(selectedNodes[0].id, selectedNodes[0].data.width, parseInt(e.target.value) || 0)} />
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => handleImportImageForNode(selectedNodes[0].id)}>
                                        <FileImage className="mr-2 h-4 w-4" />
                                        {t.propertiesImportImage}
                                    </Button>
                                </div>
                            ) : isSingleTextNodeSelected ? (
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-sm">{t.ribbonText}</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label htmlFor="prop-text-width">{t.designerWidth}</Label>
                                      <Input id="prop-text-width" type="number" value={selectedNodes[0].data.width || 0} onChange={(e) => handleUpdateNodeDimensions(selectedNodes[0].id, parseInt(e.target.value) || 0, selectedNodes[0].data.height)} />
                                    </div>
                                    <div>
                                      <Label htmlFor="prop-text-height">{t.designerHeight}</Label>
                                      <Input id="prop-text-height" type="number" value={selectedNodes[0].data.height || 0} onChange={(e) => handleUpdateNodeDimensions(selectedNodes[0].id, selectedNodes[0].data.width, parseInt(e.target.value) || 0)} />
                                    </div>
                                  </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Fill and Border */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">{t.propertiesAppearance}</h4>
                                        <div className="space-y-2">
                                            <Label>{t.propertiesFill}</Label>
                                            <Input type="color" value={nodeFillColor} onChange={(e) => { setNodeFillColor(e.target.value); handleNodeStyleChange({ backgroundColor: e.target.value }); }} className="p-1 h-8" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t.propertiesBorder}</Label>
                                            <Input type="color" value={nodeBorderColor} onChange={(e) => { setNodeBorderColor(e.target.value); handleNodeStyleChange({ borderColor: e.target.value }); }} className="p-1 h-8" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t.propertiesBorderWidth}</Label>
                                            <Input type="number" min="0" value={nodeBorderWidth} onChange={handleNodeBorderWidthChange} className="h-8"/>
                                        </div>
                                    </div>
                                    <Separator />
                                    {/* Text */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">{t.propertiesText}</h4>
                                        <div className="space-y-2">
                                            <Label>{t.propertiesTextColor}</Label>
                                            <Input type="color" value={nodeTextColor} onChange={(e) => { setNodeTextColor(e.target.value); handleNodeStyleChange({ color: e.target.value }); }} className="p-1 h-8" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t.propertiesFont}</Label>
                                            <Select value={nodeFontFamily} onValueChange={handleNodeFontFamilyChange}>
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sans-serif">Sans Serif</SelectItem>
                                                    <SelectItem value="serif">Serif</SelectItem>
                                                    <SelectItem value="monospace">Monospace</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t.propertiesSize}</Label>
                                            <Input type="number" min="1" value={nodeFontSize} onChange={handleNodeFontSizeChange} className="h-8"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t.propertiesStyle}</Label>
                                            <div className="flex items-center gap-1">
                                                <Button variant={nodeFontWeight === 'bold' ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={toggleFontWeight}><Bold className="h-4 w-4" /></Button>
                                                <Button variant={nodeFontStyle === 'italic' ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={toggleFontStyle}><Italic className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : selectedEdges.length > 0 ? (
                            <div className="space-y-6">
                                {/* Line Style */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm">{t.propertiesLink}</h4>
                                    <div className="space-y-2">
                                        <Label>{t.color}</Label>
                                        <Input type="color" value={edgeColor} onChange={(e) => { setEdgeColor(e.target.value); handleEdgeStyleChange({ stroke: e.target.value }); }} className="p-1 h-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t.thickness}</Label>
                                        <Input type="number" min="1" value={edgeWidth} onChange={handleEdgeWidthChange} className="h-8"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t.propertiesLineStyle}</Label>
                                        <Select value={edgeLineStyle} onValueChange={val => toggleEdgeLineStyle()}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="solid">{t.solid}</SelectItem>
                                                <SelectItem value="dashed">{t.dashed}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Separator />
                                {/* Markers */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm">{t.propertiesEndpoints}</h4>
                                    <div className="flex items-center justify-between">
                                        <Label>{t.propertiesStartArrow}</Label>
                                        <Switch checked={sourceMarker} onCheckedChange={toggleSourceMarker} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>{t.propertiesEndArrow}</Label>
                                        <Switch checked={targetMarker} onCheckedChange={toggleTargetMarker} />
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        </CardContent>
                   </Card>
               )}
            </aside>
          </main>
        </div>
        <NewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          translations={t}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialCategory={initialSettingsCategory}
          translations={t}
        />
        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          initialCategory={initialHelpCategory}
          translations={t}
        />
      </div>
    </TooltipProvider>
  );
}

function EditorPageInternal() {
    const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
    const [loadedProject, setLoadedProject] = useState<any | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const { config, isLoaded: isConfigLoaded } = useConfig();
    const t = translations[config.language];
    
    const handleProjectLoad = useCallback((data: any) => {
        setLoadedProject(data);
    }, []);

    useEffect(() => {
        if (!isConfigLoaded) return;

        const configJson = sessionStorage.getItem('new-project-config');
        if (configJson) {
            try {
                const parsedConfig = JSON.parse(configJson);
                setProjectConfig(parsedConfig);
                sessionStorage.removeItem('new-project-config');
            } catch (error) {
                console.error("Failed to parse project config:", error);
                sessionStorage.removeItem('new-project-config');
            }
        }

        const loadedProjectJson = sessionStorage.getItem('loaded-project-data');
        if (loadedProjectJson) {
            try {
                const parsedProject = JSON.parse(loadedProjectJson);
                setLoadedProject(parsedProject);
                sessionStorage.removeItem('loaded-project-data');
            } catch (error) {
                console.error("Failed to parse loaded project data:", error);
                sessionStorage.removeItem('loaded-project-data');
            }
        }
        
        setIsInitialized(true);
    }, [isConfigLoaded]);
    
    if (!isInitialized || !isConfigLoaded) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">{t.loading}</p>
            </div>
        );
    }

    return <EditorUI projectConfig={projectConfig} loadedProject={loadedProject} onProjectLoad={handleProjectLoad} />;
}

export default function EditorPage() {
  return (
    <ReactFlowProvider>
      <EditorPageInternal />
    </ReactFlowProvider>
  );
}
