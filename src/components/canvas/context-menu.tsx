

import React, { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Unlink, Type, Spline, MoveUpRight, Minus, CornerDownRight, Square, RectangleHorizontal, Circle, ChevronRight, GitBranch, PencilRuler, CaseSensitive, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CustomNodeLayout } from "@/lib/node-templates";
import { ScrollArea } from "../ui/scroll-area";

type ContextMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  nodeId: string | null;
  edgeId: string | null;
  selectedNodeCount: number;
  onAddNode: () => void;
  onAddChildNode: () => void;
  onAddSiblingNode: () => void;
  onDeleteNode: () => void;
  onDeleteEdge: () => void;
  onConnectNodes: () => void;
  onEditNode: () => void;
  onNodeTypeChange: (id: string, type: string, layout?: CustomNodeLayout) => void;
  onEdgeTypeChange: (id: string, type: string) => void;
  isNode: boolean;
  isEdge: boolean;
  isMultiSelection: boolean;
  translations: any;
  userTemplates: CustomNodeLayout[];
  defaultTemplates: CustomNodeLayout[];
};


type MouseEventHandler = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
const MenuItem = ({ icon, label, onClick, className, children, onMouseEnter, onMouseLeave, disabled = false }: {
  icon: React.ElementType,
  label: string,
  onClick?: () => void,
  className?: string,
  children?: React.ReactNode,
  onMouseEnter?: MouseEventHandler,
  onMouseLeave?: MouseEventHandler,
  disabled?: boolean
}) => (
  <Button
    variant="ghost"
    className={cn("w-full justify-start rounded-sm relative", className)}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    disabled={disabled}
  >
    {React.createElement(icon, { className: "mr-2 h-4 w-4"})}
    <span>{label}</span>
    {children}
  </Button>
);

const SubMenuItem = ({ icon, label, onClick, className, onMouseEnter, onMouseLeave, children }: {
  icon: React.ElementType,
  label: string,
  onClick?: () => void,
  className?: string,
  onMouseEnter?: MouseEventHandler,
  onMouseLeave?: MouseEventHandler,
  children?: React.ReactNode
}) => (
  <Button variant="ghost" className={cn("w-full justify-start rounded-sm relative", className)} onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
    {React.createElement(icon, { className: "mr-2 h-4 w-4" })}
    <span>{label}</span>
    {children}
  </Button>
);

export function ContextMenu({ 
    isOpen, 
    onClose, 
    x, 
    y, 
    nodeId,
    edgeId,
    selectedNodeCount,
    onAddNode, 
    onAddChildNode, 
    onAddSiblingNode,
    onDeleteNode, 
    onDeleteEdge,
    onConnectNodes,
    onEditNode,
    onNodeTypeChange,
    onEdgeTypeChange,
    isNode, 
    isEdge,
    isMultiSelection,
    translations: t,
    userTemplates,
    defaultTemplates,
}: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [subMenuPosition, setSubMenuPosition] = useState({ top: 0, left: '100%' });
  
  useEffect(() => {
    if (isOpen) {
      setActiveSubMenu(null);
    }
  }, [isOpen]);

  const handleSubMenuEnter = (subMenu: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setActiveSubMenu(subMenu);
    const targetRect = e.currentTarget.getBoundingClientRect();
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      setSubMenuPosition({ top: targetRect.top - menuRect.top, left: '100%' });
    }
  };


  if (!isOpen) {
    return null;
  }

  const handleEditClick = () => {
    onEditNode();
    onClose();
  };

  const handleConnectClick = () => {
    onConnectNodes();
    onClose();
  }

  const handleNodeTypeSelect = (type: string, layout?: CustomNodeLayout) => {
    if (nodeId) {
        onNodeTypeChange(nodeId, type, layout);
    }
    onClose();
  };

  const handleEdgeTypeSelect = (type: string) => {
    if (edgeId) {
        onEdgeTypeChange(edgeId, type);
    }
    onClose();
  };


  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onMouseLeave={() => setActiveSubMenu(null)}
      // This prevents the context menu itself from triggering the canvas's context menu.
      onContextMenu={(e) => e.preventDefault()}
    >
      {isNode && !isMultiSelection && (
        <>
            <MenuItem icon={Pencil} label={t.contextMenuEditNode} onClick={handleEditClick} />
            <MenuItem icon={Plus} label={t.contextMenuAddChildNode} onClick={onAddChildNode} />
            <MenuItem icon={GitBranch} label={t.contextMenuAddSiblingNode} onClick={onAddSiblingNode} />
            <Separator className="my-1" />
            <MenuItem icon={Type} label={t.type} onMouseEnter={(e) => handleSubMenuEnter('type', e)}>
                <ChevronRight className="absolute right-2 h-4 w-4" />
            </MenuItem>
            <Separator className="my-1" />
            <MenuItem icon={Trash2} label={t.contextMenuDeleteNode} className="text-destructive hover:text-destructive" onClick={onDeleteNode} />

            {activeSubMenu === 'type' && (
                <div 
                    className="absolute top-0 left-full ml-1 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                    onMouseLeave={() => setActiveSubMenu(null)}
                    style={{top: subMenuPosition.top, left: subMenuPosition.left}}
                >
                    <SubMenuItem icon={Square} label={t.nodeStyleRectangle} onClick={() => handleNodeTypeSelect("rectangle")} />
                    <SubMenuItem icon={RectangleHorizontal} label={t.nodeStyleRounded} onClick={() => handleNodeTypeSelect("rounded")} />
                    <SubMenuItem icon={Circle} label={t.nodeStyleOval} onClick={() => handleNodeTypeSelect("oval")} />
                    <Separator className="my-1" />
                    <SubMenuItem icon={PencilRuler} label="Personnalisé" onMouseEnter={(e) => handleSubMenuEnter('custom-type', e)}>
                         <ChevronRight className="absolute right-2 h-4 w-4" />
                    </SubMenuItem>
                </div>
            )}
             {activeSubMenu === 'custom-type' && (
                <div 
                    className="absolute top-0 left-full ml-1 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                    onMouseLeave={() => setActiveSubMenu('type')}
                    style={{top: subMenuPosition.top, left: subMenuPosition.left}}
                >
                    <ScrollArea className="max-h-48">
                        <div className="text-sm font-semibold px-2 py-1.5">Mes modèles</div>
                        <Separator className="my-1" />
                        {userTemplates.length > 0 ? (
                            userTemplates.map(template => (
                                <SubMenuItem
                                    key={template.name}
                                    icon={CaseSensitive}
                                    label={template.name}
                                    onClick={() => handleNodeTypeSelect("custom", template)}
                                />
                            ))
                        ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun modèle</div>
                        )}
                        <div className="text-sm font-semibold px-2 py-1.5 mt-2">Modèles par défaut</div>
                        <Separator className="my-1" />
                         {defaultTemplates.map(template => (
                            <SubMenuItem
                                key={template.name}
                                icon={CaseSensitive}
                                label={template.name}
                                onClick={() => handleNodeTypeSelect("custom", template)}
                            />
                        ))}
                    </ScrollArea>
                </div>
            )}
        </>
      )}
      {isEdge && (
        <>
            <MenuItem icon={Type} label={t.type} onMouseEnter={(e) => handleSubMenuEnter('type', e)}>
                <ChevronRight className="absolute right-2 h-4 w-4" />
            </MenuItem>
            <Separator className="my-1" />
            <MenuItem icon={Unlink} label={t.contextMenuDeleteLink} className="text-destructive hover:text-destructive" onClick={onDeleteEdge}/>

            {activeSubMenu === 'type' && (
                 <div 
                    className="absolute top-0 left-full ml-1 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                    onMouseLeave={() => setActiveSubMenu(null)}
                    style={{top: subMenuPosition.top, left: subMenuPosition.left}}
                 >
                    <SubMenuItem icon={Spline} label={t.connectorStyleBezier} onClick={() => handleEdgeTypeSelect("default")} />
                    <SubMenuItem icon={MoveUpRight} label={t.connectorStyleStep} onClick={() => handleEdgeTypeSelect("step")} />
                    <SubMenuItem icon={Minus} label={t.connectorStyleLinear} onClick={() => handleEdgeTypeSelect("straight")} />
                    <SubMenuItem icon={CornerDownRight} label={t.connectorStyleRoundedStep} onClick={() => handleEdgeTypeSelect("smoothstep")} />
                </div>
            )}
        </>
      )}
      {(!isNode && !isEdge && !isMultiSelection) && (
        <MenuItem icon={Plus} label={t.contextMenuAddNode} onClick={onAddNode} />
      )}
       {isMultiSelection && (
        <>
            <MenuItem icon={LinkIcon} label="Lier les nœuds" onClick={handleConnectClick} disabled={selectedNodeCount !== 2} />
            <MenuItem icon={Trash2} label="Supprimer la sélection" className="text-destructive hover:text-destructive" onClick={onDeleteNode} />
        </>
      )}
    </div>
  );
}
