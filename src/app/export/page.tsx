
import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useConfig } from '@/hooks/use-config';
import { translations } from '@/config/translations';
import { X, Download, Link, Link2Off, Printer } from 'lucide-react';
import { closeCurrentWindow } from '@/services/window.service';
import { pageSizes, PaperSize } from '@/components/printable-view';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReactFlow, { ReactFlowProvider, Node, Edge, NodeTypes, useReactFlow, ReactFlowJsonObject, MiniMap, Background, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { exportAs } from '@/services/project-manager';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


// Import all node types used in the main canvas
import { RoundedNode } from '@/components/canvas/nodes/rounded-node';
import { CircleNode } from '@/components/canvas/nodes/circle-node';
import { OvalNode } from '@/components/canvas/nodes/oval-node';
import { RectangleNode } from '@/components/canvas/nodes/rectangle-node';
import { CustomNode } from '@/components/canvas/nodes/custom-node';
import { TextNode } from '@/components/canvas/nodes/text-node';
import ImageNode from '@/components/canvas/nodes/image-node';


type Orientation = "portrait" | "landscape";
type MarginPreset = "narrow" | "standard" | "wide" | "custom";
type Margins = { top: number; right: number; bottom: number; left: number };
type BackgroundStyle = "white" | "dark" | "transparent";
type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';

const nodeTypes: NodeTypes = {
  rounded: RoundedNode,
  circle: CircleNode,
  oval: OvalNode,
  rectangle: RectangleNode,
  custom: CustomNode,
  text: TextNode,
  image: ImageNode,
};

const marginPresets: Record<Exclude<MarginPreset, 'custom'>, Margins> = {
    narrow: { top: 5, right: 5, bottom: 5, left: 5 },
    standard: { top: 10, right: 10, bottom: 10, left: 10 },
    wide: { top: 20, right: 20, bottom: 20, left: 20 },
};

const ExportCanvas = ({ nodes, edges, background, showGrid, showMinimap }: { nodes: Node[], edges: Edge[], background: BackgroundStyle, showGrid: boolean, showMinimap: boolean }) => {
    const backgroundClasses = {
        white: 'bg-white',
        dark: 'bg-transparent', // Set to transparent as the parent div will have the dark color
        transparent: 'bg-transparent',
    };

    const nodesWithPreviewFlag = useMemo(() => nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            isPreview: true, // Flag to hide handles in node components
        }
    })), [nodes]);

    const edgesWithExplicitStyle = useMemo(() => edges.map(edge => {
        // Ensure strokeWidth is always a number
        let strokeWidthValue = edge.style?.strokeWidth;
        if (typeof strokeWidthValue === 'string') {
            strokeWidthValue = parseFloat(strokeWidthValue);
        }
        if (isNaN(strokeWidthValue as number)) {
            strokeWidthValue = 0;
        }
        return {
            ...edge,
            style: {
                ...edge.style,
                stroke: edge.style?.stroke || '#888888',
                strokeWidth: Math.max(strokeWidthValue as number || 0, 2),
            }
        };
    }), [edges]);

    return (
        <ReactFlow
            nodes={nodesWithPreviewFlag}
            edges={edgesWithExplicitStyle}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnDoubleClick={true}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
            className={backgroundClasses[background]}
        >
             {showGrid && <Background variant={BackgroundVariant.Dots} gap={15} size={1} style={{ opacity: 0.2 }} />}
             {showMinimap && <MiniMap />}
        </ReactFlow>
    )
}

function ExportPageInternal() {
    const { config } = useConfig();
    const t = translations[config.language] || translations.fr;
    const { fitView } = useReactFlow();

    const [paperSize, setPaperSize] = useState<PaperSize>('A4');
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [marginPreset, setMarginPreset] = useState<MarginPreset>('standard');
    const [margins, setMargins] = useState<Margins>(marginPresets.standard);
    const [areMarginsLinked, setAreMarginsLinked] = useState(true);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
    const [fileName, setFileName] = useState(t.exportDefaultFileName || 'mind-map-export');
    const [exportPath, setExportPath] = useState('');
    const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('transparent');
    const [showGrid, setShowGrid] = useState(false);
    const [showMinimap, setShowMinimap] = useState(false);
    const [isExporting, setIsExporting] = useState(false);


    const [diagram, setDiagram] = useState<{ nodes: Node[], edges: Edge[] }>({ nodes: [], edges: [] });

    const paperContainerRef = useRef<HTMLDivElement>(null);
    const exportRootRef = useRef<HTMLDivElement>(null);
    const [paperStyle, setPaperStyle] = useState<React.CSSProperties>({});
    
    useEffect(() => {
        const diagramStateJson = sessionStorage.getItem('export-diagram-state');
        if (diagramStateJson) {
            try {
                const parsedState: ReactFlowJsonObject = JSON.parse(diagramStateJson);
                setDiagram({ nodes: parsedState.nodes || [], edges: parsedState.edges || [] });
            } catch (error) {
                console.error("Failed to parse diagram state from sessionStorage", error);
            }
        }
    }, []);

    const { paperPxWidth, paperPxHeight, mmToPxScale } = useMemo(() => {
        if (!paperStyle.width || !paperStyle.height) {
            return { paperPxWidth: 0, paperPxHeight: 0, mmToPxScale: 0 };
        }
        const pxWidth = parseFloat(String(paperStyle.width).replace('px', ''));
        const pxHeight = parseFloat(String(paperStyle.height).replace('px', ''));
        const paperMM = pageSizes[paperSize];
        const mmWidth = orientation === 'portrait' ? paperMM.width : paperMM.height;
        
        return {
            paperPxWidth: pxWidth,
            paperPxHeight: pxHeight,
            mmToPxScale: pxWidth / mmWidth
        };
    }, [paperStyle, paperSize, orientation]);

    useEffect(() => {
        if (marginPreset !== 'custom') {
            setMargins(marginPresets[marginPreset]);
        }
    }, [marginPreset]);
    
    useEffect(() => {
        if (exportFormat === 'png') {
            setBackgroundStyle('transparent');
        } else if (backgroundStyle === 'transparent') {
            setBackgroundStyle('white');
        }
    }, [exportFormat]);

    useLayoutEffect(() => {
        const calculatePaperDimensions = () => {
            if (!paperContainerRef.current) return;
    
            const containerWidth = paperContainerRef.current.offsetWidth;
            const containerHeight = paperContainerRef.current.offsetHeight;
            
            if (containerWidth === 0 || containerHeight === 0) return;
    
            const paperMM = pageSizes[paperSize];
            const paperW = orientation === 'portrait' ? paperMM.width : paperMM.height;
            const paperH = orientation === 'portrait' ? paperMM.height : paperMM.width;
            
            const containerRatio = containerWidth / containerHeight;
            const paperRatio = paperW / paperH;
    
            let newWidth: number;
            let newHeight: number;
    
            if (paperRatio > containerRatio) {
                // Paper is wider than container, width is the constraint
                newWidth = containerWidth;
                newHeight = newWidth / paperRatio;
            } else {
                // Paper is taller or equal, height is the constraint
                newHeight = containerHeight;
                newWidth = newHeight * paperRatio;
            }
            
            setPaperStyle({
                width: `${newWidth}px`,
                height: `${newHeight}px`,
            });
            
            setTimeout(() => fitView({ padding: 0.1, duration: 200 }), 0);
        };
        
        calculatePaperDimensions();
    
        const resizeObserver = new ResizeObserver(calculatePaperDimensions);
        const containerElement = paperContainerRef.current;
        if (containerElement) {
            resizeObserver.observe(containerElement);
        }
    
        return () => {
            if (containerElement) {
                resizeObserver.unobserve(containerElement);
            }
        };
    
    }, [paperSize, orientation, fitView]);

    const handleMarginChange = (side: keyof Margins, value: number) => {
        setMarginPreset('custom');

        if (areMarginsLinked) {
            const newMargins = { top: value, right: value, bottom: value, left: value };
            setMargins(newMargins);
        } else {
            setMargins(prev => ({ ...prev, [side]: value }));
        }
    };
    
    const backgroundClasses = {
        white: 'bg-white',
        dark: 'bg-[#2d2d2d]',
        transparent: 'bg-transparent',
    };

    const paperBorderClass = backgroundStyle === 'dark' ? 'border-white' : 'border-black';

    const handleExport = async () => {
        if (!exportRootRef.current) return;
        setIsExporting(true);
        
        await new Promise(resolve => setTimeout(resolve, 100));

        await exportAs(
            exportFormat, 
            exportRootRef.current, 
            {
                fileName,
                backgroundColor: backgroundStyle === 'dark' ? '#2d2d2d' : backgroundStyle === 'white' ? '#ffffff' : undefined,
                paperSize,
                orientation
            }
        );

        setIsExporting(false);
    }


    return (
        <TooltipProvider>
            <div className="w-screen h-screen flex flex-col bg-muted">
                <header className="flex h-16 items-center justify-between border-b bg-background px-4 flex-shrink-0">
                    <h1 className="text-xl font-semibold">{t.exportPreviewTitle || "Export Preview"}</h1>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={closeCurrentWindow}>
                            <X className="mr-2 h-4 w-4" />
                            {t.close || "Close"}
                        </Button>
                    </div>
                </header>
                
                <main className="flex-1 flex overflow-hidden">
                    <aside className="w-80 border-r bg-background p-4 space-y-4 flex flex-col flex-shrink-0 overflow-y-auto">
                        <div className="flex-1 space-y-4">
                            <h2 className="text-lg font-semibold">{t.exportSettings || "Options de mise en page"}</h2>
                            
                            <div className="space-y-2">
                                <Label htmlFor="file-name">{t.exportFileName || "File Name"}</Label>
                                <Input
                                    id="file-name"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                />
                            </div>

                            <Accordion type="single" collapsible defaultValue="page" className="w-full">
                                <AccordionItem value="page">
                                    <AccordionTrigger>{t.exportPageCategory || 'Page'}</AccordionTrigger>
                                    <AccordionContent className="space-y-2 pt-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="paper-size">{t.paperSize || "Paper Size"}</Label>
                                            <Select value={paperSize} onValueChange={(value) => setPaperSize(value as PaperSize)}>
                                                <SelectTrigger id="paper-size"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(pageSizes).map(size => (
                                                        <SelectItem key={size} value={size}>{size}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="orientation">{t.orientation || "Orientation"}</Label>
                                            <Select value={orientation} onValueChange={(value) => setOrientation(value as Orientation)}>
                                                <SelectTrigger id="orientation"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="portrait">{t.portrait || "Portrait"}</SelectItem>
                                                    <SelectItem value="landscape">{t.landscape || "Landscape"}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="margins-preset">{t.margins || "Margins (mm)"}</Label>
                                            <Select value={marginPreset} onValueChange={(v) => setMarginPreset(v as MarginPreset)}>
                                                <SelectTrigger id="margins-preset"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="narrow">Étroite</SelectItem>
                                                    <SelectItem value="standard">Standard</SelectItem>
                                                    <SelectItem value="wide">Large</SelectItem>
                                                    <SelectItem value="custom">Personnaliser</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="space-y-2 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <Tooltip><TooltipTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            onClick={() => setAreMarginsLinked(!areMarginsLinked)}
                                                            disabled={marginPreset !== 'custom'}
                                                            className="h-9 w-full"
                                                        >
                                                            {areMarginsLinked ? <Link className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
                                                            <span className="flex-1">{areMarginsLinked ? t.exportUnlinkMargins : t.exportLinkMargins}</span>
                                                        </Button>
                                                    </TooltipTrigger><TooltipContent><p>{areMarginsLinked ? t.exportUnlinkMargins : t.exportLinkMargins}</p></TooltipContent></Tooltip>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor="margin-top" className="w-4 text-center">H</Label>
                                                        <Input 
                                                            id="margin-top" 
                                                            type="number" 
                                                            value={margins.top} 
                                                            onChange={(e) => handleMarginChange('top', Number(e.target.value))}
                                                            min="0"
                                                            disabled={marginPreset !== 'custom'}
                                                            aria-label="Top margin"
                                                            className="h-9 text-sm w-full"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor="margin-bottom" className="w-4 text-center">B</Label>
                                                        <Input 
                                                            id="margin-bottom" 
                                                            type="number" 
                                                            value={margins.bottom}
                                                            onChange={(e) => handleMarginChange('bottom', Number(e.target.value))}
                                                            min="0"
                                                            disabled={marginPreset !== 'custom' || areMarginsLinked}
                                                            aria-label="Bottom margin"
                                                            className="h-9 text-sm w-full"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor="margin-left" className="w-4 text-center">G</Label>
                                                        <Input 
                                                            id="margin-left" 
                                                            type="number" 
                                                            value={margins.left}
                                                            onChange={(e) => handleMarginChange('left', Number(e.target.value))}
                                                            min="0"
                                                            disabled={marginPreset !== 'custom' || areMarginsLinked}
                                                            aria-label="Left margin"
                                                            className="h-9 text-sm w-full"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor="margin-right" className="w-4 text-center">D</Label>
                                                        <Input 
                                                            id="margin-right" 
                                                            type="number" 
                                                            value={margins.right}
                                                            onChange={(e) => handleMarginChange('right', Number(e.target.value))}
                                                            min="0"
                                                            disabled={marginPreset !== 'custom' || areMarginsLinked}
                                                            aria-label="Right margin"
                                                            className="h-9 text-sm w-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="canvas">
                                    <AccordionTrigger>{t.exportCanvasCategory || 'Canevas'}</AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="show-grid">{t.exportShowGrid}</Label>
                                            <Switch
                                                id="show-grid"
                                                checked={showGrid}
                                                onCheckedChange={setShowGrid}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="show-minimap">{t.exportShowMinimap}</Label>
                                            <Switch
                                                id="show-minimap"
                                                checked={showMinimap}
                                                onCheckedChange={setShowMinimap}
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="export">
                                    <AccordionTrigger>{t.exportParamsCategory || 'Paramètres d\'exportation'}</AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="export-path">{t.exportPath || 'Save location'}</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="export-path"
                                                    value={exportPath}
                                                    placeholder={t.exportPathPlaceholder || 'C:\\Users\\...'}
                                                    disabled
                                                    className="flex-1"
                                                />
                                                <Button variant="outline">{t.exportBrowse || 'Browse...'}</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="export-format">{t.exportFormat || "Export Format"}</Label>
                                            <Select value={exportFormat} onValueChange={(format) => {
                                                setExportFormat(format as ExportFormat);
                                                if (format === 'png') {
                                                    setBackgroundStyle('transparent');
                                                } else if (format !== 'png' && backgroundStyle === 'transparent') {
                                                    setBackgroundStyle('white');
                                                }
                                            }}>
                                                <SelectTrigger id="export-format"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="png">PNG</SelectItem>
                                                    <SelectItem value="jpeg">JPEG</SelectItem>
                                                    <SelectItem value="svg">SVG</SelectItem>
                                                    <SelectItem value="pdf">PDF</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="background-style">{t.exportBackgroundStyle || "Background Style"}</Label>
                                            <Select 
                                                value={backgroundStyle} 
                                                onValueChange={(v) => setBackgroundStyle(v as BackgroundStyle)}
                                                disabled={exportFormat === 'svg'}
                                            >
                                                <SelectTrigger id="background-style"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="transparent" disabled={exportFormat !== 'png'}>
                                                        {t.exportBackgroundTransparent || "Transparent"}
                                                    </SelectItem>
                                                    <SelectItem value="white">{t.exportBackgroundWhite || "White"}</SelectItem>
                                                    <SelectItem value="dark">{t.exportBackgroundDark || "Dark Gray"}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                        
                        <div className="flex gap-2 !mt-auto">
                           <Tooltip><TooltipTrigger asChild>
                                <Button className="w-full" onClick={handleExport}>
                                    <Download className="mr-2 h-4 w-4"/>
                                    {t.exportAction}
                                </Button>
                            </TooltipTrigger><TooltipContent><p>{t.tooltipExportAction}</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <Printer className="mr-2 h-4 w-4"/>
                                    {t.printAction}
                                </Button>
                            </TooltipTrigger><TooltipContent><p>{t.tooltipPrintAction}</p></TooltipContent></Tooltip>
                        </div>
                    </aside>
                    
                    <div ref={paperContainerRef} className="flex-1 p-8 flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <div 
                            ref={exportRootRef}
                            className={cn(
                            "relative shadow-lg",
                            backgroundClasses[backgroundStyle]
                            )}
                            style={paperStyle}
                        >
                            <div 
                                className={cn(
                                    "absolute overflow-hidden",
                                    !isExporting && `border ${paperBorderClass} border-dashed`
                                )}
                                style={{
                                    top: `${margins.top * mmToPxScale}px`,
                                    right: `${margins.right * mmToPxScale}px`,
                                    bottom: `${margins.bottom * mmToPxScale}px`,
                                    left: `${margins.left * mmToPxScale}px`,
                                }}
                            >
                                <ExportCanvas 
                                    nodes={diagram.nodes} 
                                    edges={diagram.edges} 
                                    background={backgroundStyle} 
                                    showGrid={showGrid}
                                    showMinimap={showMinimap}
                                />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}

export default function ExportPage() {
    return (
        <ReactFlowProvider>
            <ExportPageInternal />
        </ReactFlowProvider>
    );
}

    