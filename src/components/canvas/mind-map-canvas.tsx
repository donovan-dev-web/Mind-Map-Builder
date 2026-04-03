

import React, { useCallback, useState, forwardRef, useImperativeHandle, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  HandleType,
  useReactFlow,
  OnSelectionChangeParams,
  NodeChange,
  EdgeChange,
  PanOnScrollMode,
  NodeTypes,
  EdgeTypes,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  useKeyPress,
  ReactFlowInstance,
  ReactFlowJsonObject,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ContextMenu } from './context-menu';
import { Input } from '../ui/input';
import { RoundedNode } from './nodes/rounded-node';
import { CircleNode } from './nodes/circle-node';
import { OvalNode } from './nodes/oval-node';
import { RectangleNode } from './nodes/rectangle-node';
import { CustomNode } from './nodes/custom-node';
import { TextNode } from './nodes/text-node';
import ImageNode from './nodes/image-node';
import dagre from 'dagre';
import { useHistory, HistoryEntry } from '@/hooks/use-history';
import { CustomNodeLayout } from '@/lib/node-templates';
import { MousePointer } from 'lucide-react';

const nodeTypes: NodeTypes = {
  rounded: RoundedNode,
  circle: CircleNode,
  oval: OvalNode,
  rectangle: RectangleNode,
  custom: CustomNode,
  text: TextNode,
  image: ImageNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

type ContextMenuState = {
  isOpen: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  edgeId: string | null;
  isMultiSelection: boolean;
};

type CanvasState = {
  nodes: Node[];
  edges: Edge[];
}

export type SelectionMode = 'click' | 'rect' | 'multi';

export interface ProjectConfig {
    projectType: 'mind-map' | 'org-chart' | 'freeform';
    globalStyles: {
        edge: React.CSSProperties;
        edgeMarkers: { source: boolean; target: boolean };
        node: React.CSSProperties;
    };
    nodeStyle: string; // Can be a basic type or a JSON string of a CustomNodeLayout
    connectorType: keyof EdgeTypes;
    layout: 'blank' | 'horizontal' | 'vertical' | 'radial';
}


export type MindMapCanvasHandles = {
  addNode: () => void;
  addNodeAt: (position: { x: number; y: number }) => void;
  addSubNode: () => void;
  addSiblingNode: () => void;
  deleteSelected: () => void;
  applyLayout: (direction: 'TB' | 'LR' | 'RADIAL') => void;
  alignSelectedNodes: (axis: 'x' | 'y') => void;
  distributeSelectedNodes: (axis: 'x' | 'y') => void;
  undo: () => void;
  redo: () => void;
  undoTo: (index: number) => void;
  updateSelectedNodesStyle: (style: React.CSSProperties) => void;
  updateSelectedEdgesStyle: (style: React.CSSProperties) => void;
  updateSelectedEdgesMarkers: (marker: 'source' | 'target', hasMarker: boolean) => void;
  updateSelectedNodesType: (type: keyof NodeTypes, layout?: CustomNodeLayout | null) => void;
  updateSelectedEdgesType: (type: keyof EdgeTypes) => void;
  updateAllEdgesType: (type: keyof EdgeTypes) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  connectSelectedNodes: () => void;
  addTextNode: () => void;
  addImageNode: () => void;
  restore: (data: ReactFlowJsonObject) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: (options?: { duration?: number }) => void;
  centerView: () => void;
  focusNode: (nodeId: string) => void;
};

type MindMapCanvasProps = {
    translations: any;
    onSelectionChange: (params: { nodes: Node[], edges: Edge[] }) => void;
    onHistoryChange: (params: { canUndo: boolean, canRedo: boolean, past: HistoryEntry[] }) => void;
    onClipboardChange: (params: { hasItems: boolean }) => void;
    onCursorMove: (position: { x: number, y: number }) => void;
    selectionMode: SelectionMode;
    edgeType: keyof EdgeTypes;
    showMinimap: boolean;
    showGrid: boolean;
    isLocked: boolean;
    snapToGrid: boolean;
    userTemplates: CustomNodeLayout[];
    defaultTemplates: CustomNodeLayout[];
    projectConfig: ProjectConfig | null;
    loadedProject: ReactFlowJsonObject | null;
};

const nodeStyle = (node: Node) => ({
    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
});

const MindMapCanvasComponent = forwardRef<MindMapCanvasHandles, MindMapCanvasProps>(({ translations: t, onSelectionChange: onParentSelectionChange, onHistoryChange, onClipboardChange, onCursorMove, selectionMode, edgeType: defaultEdgeType, showMinimap, showGrid, isLocked, snapToGrid, userTemplates, defaultTemplates, projectConfig, loadedProject }, ref) => {
  const reactFlowInstance = useReactFlow();
  const { project, getNodes: getReactFlowNodes, getViewport, setViewport, zoomIn, zoomOut, fitView } = reactFlowInstance;
  
  const { state: canvasState, setCanvasState, undo, redo, canUndo, canRedo, past, undoTo } = useHistory<CanvasState>({
    initialState: { nodes: [], edges: [] },
    initialActionName: "Initial state",
    maxHistory: 50,
  });

  const { nodes, edges } = canvasState;
  const [edgeType, setEdgeType] = useState(defaultEdgeType);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, nodeId: null, edgeId: null, isMultiSelection: false });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  
  const selectedNodes = useMemo(() => nodes.filter(n => n.selected), [nodes]);
  const selectedEdges = useMemo(() => edges.filter(e => e.selected), [edges]);
  
  const [clipboard, setClipboard] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const pastePositionRef = useRef({ x: 0, y: 0 });
  const edgeUpdateSuccessful = useRef(false);

  const selectedNodesRef = useRef(selectedNodes);
  selectedNodesRef.current = selectedNodes;

  const onUndo = useCallback(() => undo(), [undo]);
  const onRedo = useCallback(() => redo(), [redo]);
  
  const applyLayout = useCallback((direction: 'TB' | 'LR' | 'RADIAL') => {
        if (direction === 'RADIAL') {
            const nodeWidth = 172;
            const nodeHeight = 40;
            const radiusStep = 150;
            
            const nodesToLayout = getReactFlowNodes();
            if (nodesToLayout.length === 0) return;

            const edgesToLayout = edges;
            
            const nodeMap = new Map(nodesToLayout.map(n => [n.id, n]));
            const adjacencyList = new Map<string, string[]>();
            nodesToLayout.forEach(n => adjacencyList.set(n.id, []));
            edgesToLayout.forEach(e => {
                adjacencyList.get(e.source)?.push(e.target);
            });

            const incomingEdges = new Set(edgesToLayout.map(e => e.target));
            let rootId = nodesToLayout.find(n => !incomingEdges.has(n.id))?.id;
            if (!rootId && nodesToLayout.length > 0) rootId = nodesToLayout[0].id; // Fallback to first node
            if (!rootId) return;
            
            const levels = new Map<string, number>();
            const queue: [string, number][] = [[rootId, 0]];
            levels.set(rootId, 0);

            const nodesAtLevel: Map<number, string[]> = new Map();
            
            let head = 0;
            while(head < queue.length) {
                const [currentNodeId, level] = queue[head++];
                
                if (!nodesAtLevel.has(level)) nodesAtLevel.set(level, []);
                nodesAtLevel.get(level)?.push(currentNodeId);

                const children = adjacencyList.get(currentNodeId) || [];
                children.forEach(childId => {
                    if (!levels.has(childId)) {
                        levels.set(childId, level + 1);
                        queue.push([childId, level + 1]);
                    }
                });
            }
            
            const { x: viewX, y: viewY, zoom } = getViewport();
            const centerX = (window.innerWidth / 2 - viewX) / zoom;
            const centerY = (window.innerHeight / 2 - viewY) / zoom;

      setCanvasState((nds: CanvasState) => ({
        ...nds,
        nodes: nds.nodes.map((node: Node) => {
          const level = levels.get(node.id);
          if (level === undefined) return node;

          if (level === 0) {
            return { ...node, position: { x: centerX - (node.data.width || node.width || nodeWidth) / 2, y: centerY - (node.data.height || node.height || nodeHeight) / 2 } };
          }

          const radius = level * radiusStep;
          const levelNodes = nodesAtLevel.get(level) || [];
          const angleIncrement = (2 * Math.PI) / levelNodes.length;
          const nodeIndex = levelNodes.indexOf(node.id);

          const angle = nodeIndex * angleIncrement;
          const x = centerX + radius * Math.cos(angle) - (node.data.width || node.width || nodeWidth) / 2;
          const y = centerY + radius * Math.sin(angle) - (node.data.height || node.height || nodeHeight) / 2;

          return { ...node, position: { x, y } };
        })
      }), t.ribbonGroupLayout);

        } else {
            const nodeWidth = 172;
            const nodeHeight = 40;
            dagreGraph.setGraph({ rankdir: direction });
            
            const currentNodes = getReactFlowNodes();
            currentNodes.forEach(node => {
              dagreGraph.setNode(node.id, { width: node.data.width || node.width || nodeWidth, height: node.data.height || node.height || nodeHeight });
            });
            
            edges.forEach(edge => {
              dagreGraph.setEdge(edge.source, edge.target);
            });
            
            dagre.layout(dagreGraph);
    
      setCanvasState((nds: CanvasState) => ({
        ...nds,
        nodes: nds.nodes.map((node: Node) => {
          const nodeWithPosition = dagreGraph.node(node.id);
          if (nodeWithPosition) {
            return { 
              ...node, 
              position: { 
                x: nodeWithPosition.x - (node.data.width || node.width || nodeWidth) / 2, 
                y: nodeWithPosition.y - (node.data.height || node.height || nodeHeight) / 2
              }
            };
          }
          return node;
        })
      }), t.ribbonGroupLayout);
        }
        
        setTimeout(() => fitView({ duration: 300 }), 100);
  }, [getReactFlowNodes, edges, setCanvasState, getViewport, fitView, t.ribbonGroupLayout]);

  const initializeFromConfig = useCallback((config: ProjectConfig) => {
    let newNodes: Node[] = [];
    let newEdges: Edge[] = [];

    setEdgeType(config.connectorType);
    
    if (config.layout !== 'blank') {
        const rootNodeData = {
            label: t.nodeLabels['1'],
            style: { ...config.globalStyles.node }
        };

        let rootNode: Node;
        let nodeType: string = config.nodeStyle;
        let nodeLayout: CustomNodeLayout | null = null;
        
        try {
            const parsedLayout = JSON.parse(config.nodeStyle);
            if(parsedLayout.width && parsedLayout.height) {
                nodeType = 'custom';
                nodeLayout = parsedLayout;
            }
        } catch (e) { /* Not a JSON layout, it's a simple type */ }
        
        const dataForNode: any = { ...rootNodeData };
     if (nodeType === 'custom' && nodeLayout) {
       dataForNode.layout = nodeLayout;
       dataForNode.name = 'John Doe'; // Example data
       dataForNode.poste = 'Directeur'; // Example data
       dataForNode.width = nodeLayout.width;
       dataForNode.height = nodeLayout.height;
       rootNode = { id: '1', type: 'custom', position: { x: 0, y: 0 }, data: { ...dataForNode, resizable: true } };
     } else {
       rootNode = { id: '1', type: nodeType as string, position: { x: 0, y: 0 }, data: { ...dataForNode, width: 172, height: 40,  resizable: true} };
     }
        
        newNodes = [rootNode];
    }
    
  setCanvasState({ nodes: newNodes, edges: newEdges }, "New Project", false);
    
    setTimeout(() => {
        if (config.layout !== 'blank') {
             if (config.layout === 'horizontal' || config.layout === 'vertical') {
                applyLayout(config.layout === 'horizontal' ? 'LR' : 'TB');
            } else if (config.layout === 'radial') {
                applyLayout('RADIAL');
            }
        }
        fitView({ duration: 300 });
    }, 100);

  }, [setCanvasState, t.nodeLabels, applyLayout, fitView]);
  
  const restore = useCallback((data: ReactFlowJsonObject) => {
  if (data) {
    const { x = 0, y = 0, zoom = 1 } = data.viewport || {};
    setCanvasState({ nodes: data.nodes || [], edges: data.edges || [] }, "Load Project");
    setViewport({ x, y, zoom });
  }
  }, [setCanvasState, setViewport]);

   useEffect(() => {
    if (!isInitialized) {
      if (loadedProject) {
        restore(loadedProject);
      } else if (projectConfig) {
        initializeFromConfig(projectConfig);
      } else {
        const defaultInitialNodes: Node[] = [
            { id: '1', type: 'rectangle', position: { x: 400, y: 100 }, data: { label: 'Titre du Nœud Racine', width: 172, height: 40 , resizable: true} },
            { id: '2', type: 'rectangle', position: { x: 200, y: 250 }, data: { label: 'Branche 1', width: 172, height: 40 , resizable: true} },
            { id: '3', type: 'rectangle', position: { x: 600, y: 250 }, data: { label: 'Branche 2', width: 172, height: 40 , resizable: true} },
        ];
        const defaultInitialEdges: Edge[] = [
            { id: 'e1-2', source: '1', target: '2', type: 'default', markerEnd: { type: MarkerType.ArrowClosed } },
            { id: 'e1-3', source: '1', target: '3', type: 'default', markerEnd: { type: MarkerType.ArrowClosed } },
        ];
      setCanvasState({ nodes: defaultInitialNodes, edges: defaultInitialEdges }, "Initial state", false);
      }
      setIsInitialized(true);
    }
  }, [isInitialized, projectConfig, loadedProject, initializeFromConfig, restore, setCanvasState]);

  const createNewNode = useCallback((position: {x: number, y: number}, label: string, nodeType: keyof NodeTypes, customLayout?: CustomNodeLayout | null, parentNode?: Node) => {
      const newNodeId = (nodes.length + 1 + Date.now()).toString();
      let newNode: Node;

      if (nodeType === 'custom' && customLayout) {
          newNode = {
            id: newNodeId,
            type: 'custom',
            position,
            data: {
              label: label,
              layout: customLayout,
              name: 'Nouveau Nom',
              title: 'Nouveau Titre',
              poste: 'Nouveau Poste',
              description: 'Nouvelle description...',
              avatar: 'https://placehold.co/100x100/ced4da/212529?text=IMG',
              width: customLayout.width,
              height: customLayout.height,
              resizable: true,
            },
          };
      } else {
          newNode = {
            id: newNodeId,
            type: nodeType as string,
            position,
            data: { label, width: 172, height: 40, resizable: true, },
          };
      }
      return newNode;
  }, [nodes.length]);
  
  const addNodeAt = useCallback((position: { x: number, y: number }): void => {
    const newNode = createNewNode(position, `${t.newNode} ${(nodes.length + 1)}`, 'rectangle');

    setCanvasState((prev: CanvasState): CanvasState => ({
      ...prev,
      nodes: [...prev.nodes.map(n => ({ ...n, selected: false })), { ...newNode, selected: true }]
    }), t.contextMenuAddNode);
  }, [createNewNode, t.newNode, nodes.length, setCanvasState, t.contextMenuAddNode]);

  const addNode = useCallback((): void => {
    const position = project({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
    addNodeAt(position);
  }, [project, addNodeAt]);
  
const addTextNode = useCallback((): void => {
  const position = project({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
  const newNode: Node = {
    id: `text-${Date.now()}`,
    type: 'text',
    position,
    data: { text: "Nouveau texte", width: 192, height: 48, resizable: true },
  };
  setCanvasState((prev: CanvasState): CanvasState => ({
    ...prev,
    nodes: [...prev.nodes.map(n => ({ ...n, selected: false })), { ...newNode, selected: true }]
  }), t.ribbonText);
}, [project, setCanvasState, t]);
  
const addImageNode = useCallback((): void => {
  const position = project({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
  const newNode: Node = {
    id: `image-${Date.now()}`,
    type: 'image',
    position,
    data: {
      src: "https://placehold.co/600x400",
      width: 256,
      height: 192,
      resizable: true,
    },
  };
  setCanvasState((prev: CanvasState): CanvasState => ({
    ...prev,
    nodes: [...prev.nodes.map(n => ({ ...n, selected: false })), { ...newNode, selected: true }]
  }), t.ribbonImage);
}, [project, setCanvasState, t]);

const addSubNode = useCallback((): void => {
  setCanvasState((currentState: CanvasState): CanvasState => {
    const selectedParentNodes = currentState.nodes.filter(n => n.selected);
    if (selectedParentNodes.length !== 1) return currentState;
    const parentNode = selectedParentNodes[0];

    const parentNodeHeight = parentNode.data.height || parentNode.height || 40;
    const position = {
      x: parentNode.position.x,
      y: parentNode.position.y + parentNodeHeight + 60,
    };
    const newNode = createNewNode(position, `${t.childOf} ${parentNode.id}`, parentNode.type || 'rectangle', parentNode.data.layout, parentNode);
    const newEdge: Edge = {
      id: `e${parentNode.id}-${newNode.id}`,
      source: parentNode.id,
      target: newNode.id,
      type: edgeType as string,
      markerEnd: { type: MarkerType.ArrowClosed },
    };
    return {
      nodes: [...currentState.nodes.map(n => ({ ...n, selected: false })), { ...newNode, selected: true }],
      edges: [...currentState.edges, newEdge]
    };
  }, t.contextMenuAddChildNode);
}, [createNewNode, edgeType, setCanvasState, t.childOf]);

const addSiblingNode = useCallback((): void => {
  setCanvasState((currentState: CanvasState): CanvasState => {
    const selectedNodes = currentState.nodes.filter(n => n.selected);
    if (selectedNodes.length !== 1) return currentState;
    const selectedNode = selectedNodes[0];

    const parentEdge = currentState.edges.find(e => e.target === selectedNode.id);
    if (!parentEdge) return currentState;

    const parentNode = currentState.nodes.find(n => n.id === parentEdge.source);
    if (!parentNode) return currentState;

    const selectedNodeWidth = selectedNode.data.width || selectedNode.width || 172;
    const position = {
      x: selectedNode.position.x + selectedNodeWidth + 20,
      y: selectedNode.position.y,
    };
    const newNode = createNewNode(position, `${t.siblingOf} ${selectedNode.id}`, selectedNode.type || 'rectangle', selectedNode.data.layout, parentNode);
    const newEdge: Edge = {
      id: `e${parentNode.id}-${newNode.id}`,
      source: parentNode.id,
      target: newNode.id,
      type: edgeType as string,
      markerEnd: { type: MarkerType.ArrowClosed },
    };
    return {
      nodes: [...currentState.nodes.map(n => ({ ...n, selected: false })), { ...newNode, selected: true }],
      edges: [...currentState.edges, newEdge]
    };
  }, t.contextMenuAddSiblingNode);
}, [createNewNode, edgeType, setCanvasState, t.siblingOf]);

const deleteSelected = useCallback((): void => {
  setCanvasState((currentState: CanvasState): CanvasState => {
    const selectedNodeIds = currentState.nodes.filter(n => n.selected).map(n => n.id);
    const selectedEdgeIds = currentState.edges.filter(e => e.selected).map(e => e.id);

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      return currentState;
    }

    const connectedEdgeIds = currentState.edges
      .filter(edge => selectedNodeIds.includes(edge.source) || selectedNodeIds.includes(edge.target))
      .map(edge => edge.id);

    const allEdgeIdsToDelete = [...new Set([...selectedEdgeIds, ...connectedEdgeIds])];

    return {
      nodes: currentState.nodes.filter(n => !selectedNodeIds.includes(n.id)),
      edges: currentState.edges.filter(e => !allEdgeIdsToDelete.includes(e.id))
    };
  }, selectedEdges.length > 0 ? t.contextMenuDeleteLink : t.contextMenuDeleteNode);
}, [setCanvasState, selectedEdges, t.contextMenuDeleteLink, t.contextMenuDeleteNode]);

const connectSelectedNodes = useCallback((): void => {
  if (selectedNodesRef.current.length !== 2) return;

  const [sourceNode, targetNode] = selectedNodesRef.current;

  setCanvasState((prevState: CanvasState): CanvasState => ({
    ...prevState,
    edges: addEdge({
      id: `e${sourceNode.id}-${targetNode.id}-${Date.now()}`,
      source: sourceNode.id,
      target: targetNode.id,
      type: edgeType as string,
      markerEnd: { type: MarkerType.ArrowClosed }
    }, prevState.edges)
  }), t.shortcutConnectNodes);
}, [setCanvasState, edgeType as string, t.shortcutConnectNodes]);

  useEffect(() => {
    onClipboardChange({ hasItems: !!clipboard });
  }, [clipboard, onClipboardChange]);
  
  const handleCopy = useCallback(() => {
      if (selectedNodes.length === 0) return;
      const copiedNodes = selectedNodes.map(n => ({...n, selected: false}));
      
      const nodeIds = new Set(selectedNodes.map(n => n.id));
      const copiedEdges = edges
        .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map(e => ({...e, selected: false}));
      
      setClipboard({ nodes: copiedNodes, edges: copiedEdges });
  }, [selectedNodes, edges]);
  
  const handleCut = useCallback(() => {
    handleCopy();
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      deleteSelected();
    }
  }, [handleCopy, selectedNodes, selectedEdges, deleteSelected]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;

    const { x, y } = project(pastePositionRef.current);

    const boundingBox = clipboard.nodes.reduce((acc, node) => {
        return {
            minX: Math.min(acc.minX, node.position.x),
            minY: Math.min(acc.minY, node.position.y),
        };
    }, { minX: Infinity, minY: Infinity });

    const newNodes = clipboard.nodes.map(node => {
        const id = `${node.id}-copy-${Date.now()}`;
        return {
            ...node,
            id,
            position: {
                x: x + (node.position.x - boundingBox.minX),
                y: y + (node.position.y - boundingBox.minY),
            },
            selected: true
        };
    });

    const idMapping = new Map(clipboard.nodes.map((node, i) => [node.id, newNodes[i].id]));

    const newEdges = clipboard.edges.map(edge => ({
        ...edge,
        id: `e${idMapping.get(edge.source)}-${idMapping.get(edge.target)}-${Date.now()}`,
        source: idMapping.get(edge.source)!,
        target: idMapping.get(edge.target)!,
        selected: false,
    }));
    
  setCanvasState((prev: CanvasState): CanvasState => ({
    nodes: [...prev.nodes.map((n: Node) => ({...n, selected: false})), ...newNodes],
    edges: [...prev.edges, ...newEdges]
  }), t.ribbonPaste);
  }, [clipboard, project, setCanvasState, t.ribbonPaste]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        const isNodeSelected = selectedNodesRef.current.length === 1;

        if (e.key === 'Enter' && isNodeSelected) {
            e.preventDefault();
            if (e.shiftKey) {
              addSiblingNode();
            } else {
              addSubNode();
            }
            return;
        }

        if ((e.ctrlKey || e.metaKey)) {
            switch(e.key.toLowerCase()) {
                case 'z': e.preventDefault(); onUndo(); break;
                case 'y': e.preventDefault(); onRedo(); break;
                case 'c': e.preventDefault(); handleCopy(); break;
                case 'x': e.preventDefault(); handleCut(); break;
                case 'v': e.preventDefault(); handlePaste(); break;
                case 'l': e.preventDefault(); connectSelectedNodes(); break;
            }
        }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        pastePositionRef.current = { x: e.clientX, y: e.clientY };
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onUndo, onRedo, handleCopy, handleCut, handlePaste, addSubNode, addSiblingNode, connectSelectedNodes]);


  useEffect(() => {
    setEdgeType(defaultEdgeType);
  }, [defaultEdgeType]);

  useEffect(() => {
    onParentSelectionChange({ nodes: selectedNodes, edges: selectedEdges });
  }, [selectedNodes, selectedEdges, onParentSelectionChange]);
  
  useEffect(() => {
    onHistoryChange({ canUndo, canRedo, past });
  }, [canUndo, canRedo, onHistoryChange, past]);

  useImperativeHandle(ref, () => ({
    undo: onUndo,
    redo: onRedo,
    undoTo,
    copy: handleCopy,
    cut: handleCut,
    paste: handlePaste,
    connectSelectedNodes,
    applyLayout,
    addNode,
    addNodeAt,
    addTextNode,
    addImageNode,
    addSubNode,
    addSiblingNode,
    deleteSelected,
    zoomIn,
    zoomOut,
    fitView,
    centerView: () => {
        const targetNodes = selectedNodes.length > 0 ? selectedNodes : nodes;
        if (targetNodes.length === 0) return;
        fitView({
          nodes: targetNodes.map((node) => ({ id: node.id })),
          duration: 800,
          padding: 0.2,
          maxZoom: 1.5,
        });
    },
    focusNode: (nodeId: string) => {
      setCanvasState((currentState: CanvasState): CanvasState => ({
        ...currentState,
        nodes: currentState.nodes.map((node: Node) => ({
          ...node,
          selected: node.id === nodeId,
        })),
        edges: currentState.edges.map((edge: Edge) => ({
          ...edge,
          selected: false,
        })),
      }), "Focus Node", true);

      window.setTimeout(() => {
        fitView({
          nodes: [{ id: nodeId }],
          duration: 800,
          padding: 0.3,
          maxZoom: 1.5,
        });
      }, 0);
    },
    restore,
    updateNodeData: (nodeId, data) => {
  setCanvasState((currentState: CanvasState): CanvasState => ({
            ...currentState,
            nodes: currentState.nodes.map((n: Node) => {
                if (n.id === nodeId) {
                    return { ...n, data: { ...n.data, ...data } };
                }
                return n;
            })
        }), "Update Node Data", true);
    },
    updateNodeDimensions: (nodeId, width, height) => {
  setCanvasState((cs: CanvasState): CanvasState => ({
        ...cs,
  nodes: cs.nodes.map((n: Node) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                width,
                height,
              }
            };
          }
          return n;
        })
      }), "Resize Node", false);
    },
    updateSelectedNodesType: (type, newLayout = null) => {
  setCanvasState((currentState: CanvasState): CanvasState => {
      const currentSelectedNodes = currentState.nodes.filter((n: Node) => n.selected);
      const nodeIdsToUpdate = currentSelectedNodes.length > 0 
        ? currentSelectedNodes.map((n: Node) => n.id) 
        : currentState.nodes.map((n: Node) => n.id);

            if (nodeIdsToUpdate.length === 0) return currentState;

            const newNodes = currentState.nodes.map((node: Node) => {
                if (nodeIdsToUpdate.includes(node.id)) {
                    const newData: any = { ...node.data };
    
                    if (type === 'custom' && newLayout) {
                        newData.width = newLayout.width;
                        newData.height = newLayout.height;
                        newData.layout = newLayout;
                    } else if (type !== 'custom') {
                        delete newData.layout;
                        if (type === 'oval' || type === 'circle' ) {
                            newData.width = 144;
                            newData.height = 144;
                        } else if (type === 'rounded' || type === 'rectangle') {
                            newData.width = 172;
                            newData.height = 40;
                        }
                    }
                    
                    return {
                        ...node,
                        type,
                        data: newData,
                    };
                }
                return node;
            });
            return { ...currentState, nodes: newNodes as Node[] };
        }, "Update Node Type");
    },
    updateSelectedEdgesType: (type) => {
  setCanvasState((currentState: CanvasState): CanvasState => {
            const selectedEdgeIds = currentState.edges.filter((e: Edge) => e.selected).map((e: Edge) => e.id);
            if (selectedEdgeIds.length === 0) return currentState;

      return {
        ...currentState,
        edges: currentState.edges.map((e: Edge) => selectedEdgeIds.includes(e.id) ? { ...e, type: String(type) } : e) as Edge[]
      };
        }, "Update Edge Type");
    },
    updateAllEdgesType: (type) => {
    setCanvasState((currentState: CanvasState): CanvasState => ({
      ...currentState,
      edges: currentState.edges.map((e: Edge) => ({ ...e, type: String(type) })) as Edge[]
    }), "Update All Edge Types");
    },
    updateSelectedNodesStyle: (style) => {
      setCanvasState((currentState: CanvasState): CanvasState => {
        const currentSelectedNodeIds = currentState.nodes.filter((n: Node) => n.selected).map((n: Node) => n.id);
        if (currentSelectedNodeIds.length === 0) return currentState;
        const newNodes = currentState.nodes.map((node: Node) => {
          if (currentSelectedNodeIds.includes(node.id)) {
            return {
              ...node,
              data: {
                ...node.data,
                style: { ...(node.data.style || {}), ...style },
              },
            };
          }
          return node;
        });
        return { ...currentState, nodes: newNodes };
      }, "Update Node Style");
    },
    updateSelectedEdgesStyle: (style) => {
      setCanvasState((currentState: CanvasState): CanvasState => {
        const currentSelectedEdgeIds = currentState.edges.filter((e: Edge) => e.selected).map((e: Edge) => e.id);
        if (currentSelectedEdgeIds.length === 0) return currentState;
        const newEdges = currentState.edges.map((edge: Edge) => {
          if (currentSelectedEdgeIds.includes(edge.id)) {
            return {
              ...edge,
              style: { ...(edge.style || {}), ...style },
            };
          }
          return edge;
        });
        return { ...currentState, edges: newEdges };
      }, "Update Edge Style");
    },
    updateSelectedEdgesMarkers: (marker, hasMarker) => {
      setCanvasState((currentState: CanvasState): CanvasState => {
        const currentSelectedEdgeIds = currentState.edges.filter((e: Edge) => e.selected).map((e: Edge) => e.id);
        if (currentSelectedEdgeIds.length === 0) return currentState;
        
        const markerType = hasMarker ? { type: MarkerType.ArrowClosed } : undefined;
        const markerKey = marker === 'source' ? 'markerStart' : 'markerEnd';

        const newEdges = currentState.edges.map((edge: Edge) => {
          if (currentSelectedEdgeIds.includes(edge.id)) {
            return {
              ...edge,
              [markerKey]: markerType,
            };
          }
          return edge;
        });
        return { ...currentState, edges: newEdges };
      }, "Update Edge Marker");
    },
    alignSelectedNodes(axis) {
        if (selectedNodes.length < 2) return;

        const avgPosition = selectedNodes.reduce((sum, node) => sum + node.position[axis], 0) / selectedNodes.length;

    setCanvasState((prevState: CanvasState): CanvasState => ({...prevState, nodes: prevState.nodes.map((node: Node) => {
      if (selectedNodes.some((sn: Node) => sn.id === node.id)) {
        return { ...node, position: { ...node.position, [axis]: avgPosition } };
      }
      return node;
    })}), t.ribbonGroupAlign);
    },
    distributeSelectedNodes(axis) {
        if (selectedNodes.length < 3) return;
    
        const sortedNodes = [...selectedNodes].sort((a, b) => a.position[axis] - b.position[axis]);
    
        const minPos = sortedNodes[0].position[axis];
        const maxPos = sortedNodes[sortedNodes.length - 1].position[axis];
        const range = maxPos - minPos;
    
        if (range === 0) return;
    
        const spacing = range / (sortedNodes.length - 1);
    
        const newNodes = new Map(nodes.map(n => [n.id, n]));
        sortedNodes.forEach((node, index) => {
            const newNode = newNodes.get(node.id)!;
            newNode.position = { ...newNode.position, [axis]: minPos + index * spacing };
            newNodes.set(node.id, newNode);
        });
    
  setCanvasState((prevState: CanvasState): CanvasState => ({ ...prevState, nodes: Array.from(newNodes.values()) }), t.ribbonDistribute);
    }
  }));
  
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const isInteractionEnd = changes.some(
        (change) =>
          (change.type === 'position' && !change.dragging) ||
          (change.type === 'dimensions' && !change.resizing)
      );
      
      const dimensionChanges = changes.filter(c => c.type === 'dimensions' && c.dimensions);
      if (dimensionChanges.length > 0) {
  setCanvasState((cs: CanvasState): CanvasState => {
            const newNodes = [...cs.nodes];
            dimensionChanges.forEach(change => {
              if ("id" in change) {
                const node = newNodes.find((n: Node) => n.id === change.id);
                if (node && "dimensions" in change && change.dimensions) {
                  node.data.width = change.dimensions.width;
                  node.data.height = change.dimensions.height;
                }
              }
            });
            return {...cs, nodes: newNodes };
        }, 'Resize Node', !isInteractionEnd);
      } else {
    setCanvasState(
      (prevState: CanvasState): CanvasState => ({ ...prevState, nodes: applyNodeChanges(changes, prevState.nodes) }),
      'Update Node',
      !isInteractionEnd
    );
      }
    },
  [setCanvasState]
  );
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
    setCanvasState(
      (prevState: CanvasState): CanvasState => ({ ...prevState, edges: applyEdgeChanges(changes, prevState.edges) }),
      "Change Edge",
      true
    );
    },
  [setCanvasState]
  );
  
  const onConnect: OnConnect = useCallback(
    (connection) => {
      setCanvasState(
        (prevState: CanvasState): CanvasState => ({ ...prevState, edges: addEdge({...connection, type: edgeType as string, markerEnd: { type: MarkerType.ArrowClosed }}, prevState.edges) }),
        t.ribbonConnect
      );
    },
  [setCanvasState, edgeType, t.ribbonConnect]
  );
  
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeUpdateSuccessful.current = true;
    setCanvasState(
      (cs: CanvasState): CanvasState => ({
        ...cs,
        edges: applyEdgeChanges([{ type: 'remove', id: oldEdge.id }], cs.edges),
      }),
      'Delete Edge for Update',
      true
    );
    setCanvasState(
      (cs: CanvasState): CanvasState => ({
        ...cs,
        edges: addEdge({ ...newConnection, type: edgeType as string, markerEnd: { type: MarkerType.ArrowClosed } }, cs.edges),
      }),
      'Update Edge'
    );
  }, [setCanvasState, edgeType]);

  const onEdgeUpdateEnd = useCallback((event: MouseEvent | TouchEvent,
    edge: Edge,
    handleType: HandleType
  ) => {
    if (!edgeUpdateSuccessful.current) {
       setCanvasState(
        (cs: CanvasState): CanvasState => ({
          ...cs,
          edges: applyEdgeChanges([{ type: 'remove', id: edge.id }], cs.edges),
        }),
        'Delete Edge'
      );
    }
  }, [setCanvasState]);


  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setCanvasState((currentState: CanvasState): CanvasState => ({
      ...currentState,
      nodes: currentState.nodes.map((n: Node) => ({...n, selected: params.nodes.some((sn: Node) => sn.id === n.id)})),
      edges: currentState.edges.map((e: Edge) => ({...e, selected: params.edges.some((se: Edge) => se.id === e.id)})),
    }), 'Selection Change', true); // skipHistory = true
  }, [setCanvasState]);

  const closeContextMenu = useCallback(() => {
    if (contextMenu.isOpen) {
      setContextMenu({ isOpen: false, x: 0, y: 0, nodeId: null, edgeId: null, isMultiSelection: false });
    }
  }, [contextMenu.isOpen]);

  const handlePaneContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    closeContextMenu();
    const isMultiSelection = selectedNodesRef.current.length > 1;
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      edgeId: null,
      isMultiSelection,
    });
  };

  const handleNodeContextMenu = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    closeContextMenu();
    const isMultiSelection = selectedNodesRef.current.length > 1 && selectedNodesRef.current.some(n => n.id === node.id);
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      edgeId: null,
      isMultiSelection,
    });
  };

  const handleEdgeContextMenu = (event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    closeContextMenu();
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      edgeId: edge.id,
      isMultiSelection: false,
    });
  };
  
  const handleAddNodeFromContext = useCallback(() => {
     const { x, y } = project({ x: contextMenu.x, y: contextMenu.y });
     addNodeAt({ x, y });
     closeContextMenu();
  }, [project, contextMenu.x, contextMenu.y, addNodeAt, closeContextMenu]);

  const handleAddChildNodeFromContext = useCallback(() => {
    addSubNode();
    closeContextMenu();
  }, [addSubNode, closeContextMenu]);
  
  const handleAddSiblingNodeFromContext = useCallback(() => {
      addSiblingNode();
      closeContextMenu();
  }, [addSiblingNode, closeContextMenu]);

  const handleDeleteNodeFromContext = useCallback((): void => {
    if (contextMenu.isMultiSelection) {
        deleteSelected();
    } else if (contextMenu.nodeId) {
       setCanvasState((currentState: CanvasState): CanvasState => {
        const nodeId = contextMenu.nodeId!;
        return {
            nodes: currentState.nodes.filter((n: Node) => n.id !== nodeId),
            edges: currentState.edges.filter((e: Edge) => e.source !== nodeId && e.target !== nodeId),
        };
       }, t.contextMenuDeleteNode);
    }
    closeContextMenu();
  }, [contextMenu.nodeId, contextMenu.isMultiSelection, setCanvasState, deleteSelected, t.contextMenuDeleteNode, closeContextMenu]);

  const handleDeleteEdgeFromContext = useCallback((): void => {
    if (!contextMenu.edgeId) return;
    setCanvasState((prevState: CanvasState): CanvasState => ({ ...prevState, edges: prevState.edges.filter((e: Edge) => e.id !== contextMenu.edgeId!) }), t.contextMenuDeleteLink);
    closeContextMenu();
  }, [contextMenu.edgeId, setCanvasState, t.contextMenuDeleteLink, closeContextMenu]);
  
  const handleConnectNodesFromContext = useCallback(() => {
    connectSelectedNodes();
    closeContextMenu();
  }, [connectSelectedNodes, closeContextMenu]);
  
  const handleEditNodeFromContext = useCallback((): void => {
  if (!contextMenu.nodeId) return;

  setCanvasState((currentState: CanvasState): CanvasState => {
    const nodeToEdit = currentState.nodes.find((n: Node) => n.id === contextMenu.nodeId);
    if (!nodeToEdit) return currentState;
        
    if (nodeToEdit.type === 'custom') {
      return {
        ...currentState,
        nodes: currentState.nodes.map((n: Node) => ({
          ...n,
          selected: n.id === contextMenu.nodeId
        }))
      };
    }
        
    setEditingNodeId(contextMenu.nodeId);
    return currentState;
  }, "Edit Node", true); 

  closeContextMenu();
  }, [contextMenu.nodeId, setCanvasState, closeContextMenu]);

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'custom') return;
    setEditingNodeId(node.id);
  }, []);

  const handleLabelChange = useCallback((nodeId: string, newLabel: string) => {
    setCanvasState((prevState: CanvasState): CanvasState => ({
      ...prevState,
      nodes: prevState.nodes.map((node: Node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, label: newLabel } };
        }
        return node;
      })
    }), t.contextMenuEditNode);
  }, [setCanvasState, t.contextMenuEditNode]);

  const handleNodeTypeChange = useCallback((nodeId: string, type: string, layout?: CustomNodeLayout) => {
    setCanvasState((currentState: CanvasState): CanvasState => {
      const newNodes = currentState.nodes.map((node: Node) => {
        if (node.id === nodeId) {
          let newData: any = { ...node.data };

          if (type === 'custom' && layout) {
              newData.width = layout.width;
              newData.height = layout.height;
              newData.layout = layout;
          } else if (type !== 'custom') {
              delete newData.layout;
              if (type === 'oval' || type === 'circle') {
                  newData.width = 144;
                  newData.height = 144;
              } else if (type === 'rounded' || type === 'rectangle') {
                  newData.width = 172;
                  newData.height = 40;
              }
          }
          
          return {
              ...node,
              type,
              data: newData,
          };
        }
        return node;
      });
      return { ...currentState, nodes: newNodes };
    }, t.ribbonGroupNodeType);
  }, [setCanvasState, t.ribbonGroupNodeType]);
  
  const handleEdgeTypeChange = useCallback((edgeId: string, type: string) => {
    setCanvasState((prevState: CanvasState): CanvasState => ({
      ...prevState,
      edges: prevState.edges.map((edge: Edge) => {
        if (edge.id === edgeId) {
          return { ...edge, type };
        }
        return edge;
      })
    }), t.ribbonGroupEdgeType);
  }, [setCanvasState, t.ribbonGroupEdgeType]);
  
  const nodesWithInput = useMemo(() => {
    return nodes.map((node) => {
        if (node.id !== editingNodeId) {
            return {
                ...node,
                // This style property helps html-to-image to capture edges correctly.
                style: nodeStyle(node),
            };
        }
        return {
            ...node,
            style: nodeStyle(node),
            data: {
                ...node.data,
                label: (
                    <Input
                        defaultValue={node.data.label}
                        onBlur={(e) => {
                            handleLabelChange(node.id, e.target.value);
                            setEditingNodeId(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleLabelChange(node.id, e.currentTarget.value);
                                setEditingNodeId(null);
                            }
                        }}
                        autoFocus
                        className="nodrag"
                    />
                ),
            },
        };
    });
}, [nodes, editingNodeId, handleLabelChange]);
  
  const handlePaneMouseMove = (event: React.MouseEvent) => {
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setCursorPosition(position);
      onCursorMove(position);
  };

  if (!isInitialized) {
      return <div className="w-full h-full flex items-center justify-center bg-background text-foreground">Chargement...</div>;
  }

  return (
    <div className="w-full h-full relative bg-[#2d2d2d]">
       <ReactFlow
        nodes={nodesWithInput}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onConnect={onConnect}
        onPaneClick={closeContextMenu}
        onNodeClick={closeContextMenu}
        onEdgeClick={closeContextMenu}
        onMoveStart={closeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneMouseMove={handlePaneMouseMove}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        fitView
        panOnDrag={!['rect', 'multi'].includes(selectionMode)}
        selectionOnDrag={selectionMode === 'rect'}
  selectionMode={selectionMode as any}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        snapToGrid={snapToGrid}
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Control', 'Meta']}
        zoomOnScroll
        zoomOnDoubleClick
        zoomOnPinch
      >
        {showMinimap && <MiniMap style={{ backgroundColor: '#2d2d2d' }} nodeColor={n => {
            return n.type === 'rectangle' ? '#a7d1ea' : '#8fbc8f';
        }} />}
        {showGrid && <Background data-export-exclude variant={BackgroundVariant.Dots} gap={15} size={1} color="#fff" style={{ opacity: 0.1 }} />}
        <footer data-export-exclude className="absolute bottom-0 right-0 bg-background/80 backdrop-blur-sm px-3 py-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <MousePointer className="h-3 w-3" />
                <span>{t.cursorPosition ? t.cursorPosition.replace('{x}', String(Math.round(cursorPosition.x))).replace('{y}', String(Math.round(cursorPosition.y))) : `x: ${Math.round(cursorPosition.x)}, y: ${Math.round(cursorPosition.y)}`}</span>
            </div>
        </footer>
      </ReactFlow>
      <ContextMenu 
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={closeContextMenu}
        onAddNode={handleAddNodeFromContext}
        onAddChildNode={handleAddChildNodeFromContext}
        onAddSiblingNode={handleAddSiblingNodeFromContext}
        onDeleteNode={handleDeleteNodeFromContext}
        onDeleteEdge={handleDeleteEdgeFromContext}
        onConnectNodes={handleConnectNodesFromContext}
        onEditNode={handleEditNodeFromContext}
        isNode={!!contextMenu.nodeId}
        isEdge={!!contextMenu.edgeId}
        isMultiSelection={contextMenu.isMultiSelection}
        selectedNodeCount={selectedNodes.length}
        nodeId={contextMenu.nodeId}
        edgeId={contextMenu.edgeId}
        onNodeTypeChange={handleNodeTypeChange}
        onEdgeTypeChange={handleEdgeTypeChange}
        translations={t}
        userTemplates={userTemplates}
        defaultTemplates={defaultTemplates}
      />
    </div>
  );
});

MindMapCanvasComponent.displayName = 'MindMapCanvasComponent';

// This is the component that will be exported
export const MindMapCanvas = MindMapCanvasComponent;
