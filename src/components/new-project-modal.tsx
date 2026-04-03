

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  Network,
  Projector,
  Spline,
  MoveUpRight,
  Minus,
  Star,
  ArrowRightLeft,
  RectangleHorizontal,
  Circle,
  Bold,
  Italic,
  ArrowRight,
  ArrowLeft,
  CaseSensitive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { defaultTemplates } from "@/lib/default-node-templates";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { ProjectConfig } from "./canvas/mind-map-canvas";

type NewProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  translations: any;
};

type ProjectType = "mind-map" | "org-chart" | "freeform" | null;
type NodeStyleType = "rectangle" | "rounded" | "oval";
type CustomNodeStyleType = string;
type ConnectorStyle = "default" | "step" | "straight" | "smoothstep";
type LayoutChoice = "blank" | "horizontal" | "vertical" | "radial";


const Breadcrumb = ({
  currentStep,
  steps,
  onStepClick,
}: {
  currentStep: number;
  steps: string[];
  onStepClick: (stepIndex: number) => void;
}) => (
  <nav aria-label="breadcrumb">
    <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
      {steps.map((step, index) => {
        const isClickable = index + 1 < currentStep;
        return (
            <li key={index} className="flex items-center">
            <span
                className={cn(
                    "transition-colors",
                    index + 1 === currentStep && "font-semibold text-primary",
                    isClickable && "cursor-pointer hover:text-foreground hover:underline"
                )}
                onClick={() => isClickable && onStepClick(index + 1)}
            >
                {step}
            </span>
            {index < steps.length - 1 && (
                <span className="mx-2">/</span>
            )}
            </li>
        )
      })}
    </ol>
  </nav>
);

export function NewProjectModal({
  isOpen,
  onClose,
  translations: t,
}: NewProjectModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState<ProjectType>("org-chart");

  // States for Step 2
  const [lineColor, setLineColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(1);
  const [lineStyle, setLineStyle] = useState<"solid" | "dashed">("solid");
  const [startArrow, setStartArrow] = useState(false);
  const [endArrow, setEndArrow] = useState(true);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [fontSize, setFontSize] = useState(14);
  const [fontStyle, setFontStyle] = useState<("bold" | "italic")[]>([]);
  const [textColor, setTextColor] = useState("#000000");

  // States for Step 3
  const [nodeStyle, setNodeStyle] = useState<NodeStyleType | CustomNodeStyleType>("rounded");
  const [connectorStyle, setConnectorStyle] = useState<ConnectorStyle>("default");
  
  // State for Step 4
  const [layout, setLayout] = useState<LayoutChoice>("vertical");


  const wizardSteps = projectType === "freeform"
    ? [t.projectType, t.globalStyle, t.styleCustomization]
    : [t.projectType, t.globalStyle, t.styleCustomization, t.layout];

  const handleNext = () => {
    // If we're at step 1 and choose org-chart, set default node style
    if (step === 1 && projectType === 'org-chart') {
        const profileTemplate = defaultTemplates.find(t => t.name === 'Carte de Profil Simple');
        if (profileTemplate) {
            setNodeStyle(JSON.stringify(profileTemplate));
        }
    }
     if (step === 1 && projectType === 'mind-map') {
        setNodeStyle("rectangle");
    }

    // If we're at step 3 and the project is 'freeform', we skip to create
    if (step === 3 && projectType === "freeform") {
        handleCreate();
        return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };
  
  const handleStepClick = (stepIndex: number) => {
    if (stepIndex < step) {
        setStep(stepIndex);
    }
  };

  const resetState = () => {
    onClose();
    setTimeout(() => {
        setStep(1);
        setProjectType("org-chart");
        setLineColor("#000000");
        setLineWidth(1);
        setLineStyle("solid");
        setStartArrow(false);
        setEndArrow(true);
        setFontFamily("sans-serif");
        setFontSize(14);
        setFontStyle([]);
        setTextColor("#000000");
        setNodeStyle("rounded");
        setConnectorStyle("default");
        setLayout("vertical");
    }, 300);
  };

  const handleCreate = () => {
    const finalLayout = projectType === 'freeform' ? 'blank' : layout;
    
    let finalNodeStyle = nodeStyle;
    // This logic ensures the default node style is correctly set based on project type if not changed by the user.
    if (projectType === 'mind-map') {
        if (!["rectangle", "rounded", "oval"].includes(finalNodeStyle)) {
          finalNodeStyle = "rectangle";
        }
    } else if (projectType === 'org-chart') {
        try {
            JSON.parse(finalNodeStyle);
        } catch(e) {
            const profileTemplate = defaultTemplates.find(t => t.name === 'Carte de Profil Simple');
            if (profileTemplate) {
                finalNodeStyle = JSON.stringify(profileTemplate);
            } else {
                finalNodeStyle = "rectangle"; // Fallback
            }
        }
    }

    const projectConfig: ProjectConfig = {
      projectType: projectType || 'freeform',
      globalStyles: {
        edge: {
          stroke: lineColor,
          strokeWidth: lineWidth,
          strokeDasharray: lineStyle === 'dashed' ? '5 5' : undefined,
        },
        edgeMarkers: {
          source: startArrow,
          target: endArrow,
        },
        node: {
          fontFamily,
          fontSize: `${fontSize}px`,
          fontWeight: fontStyle.includes('bold') ? 'bold' : 'normal',
          fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
          color: textColor,
        }
      },
      nodeStyle: finalNodeStyle,
      connectorType: connectorStyle,
      layout: finalLayout,
    };
    
    sessionStorage.setItem('new-project-config', JSON.stringify(projectConfig));

    resetState();
    window.location.href = "/editor";
  };

  const renderStep1 = () => (
    <>
      <h3 className="text-lg font-medium text-center mb-6">
        {t.selectProjectType}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Button
          variant={projectType === "org-chart" ? "default" : "outline"}
          className="h-28 text-lg flex-col gap-2 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          onClick={() => setProjectType("org-chart")}
        >
          <Network className="h-8 w-8" />
          <span>{t.projectTypeOrgChart}</span>
        </Button>
        <Button
          variant={projectType === "mind-map" ? "default" : "outline"}
          className="h-28 text-lg flex-col gap-2 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          onClick={() => setProjectType("mind-map")}
        >
          <BrainCircuit className="h-8 w-8" />
          <span>{t.projectTypeMindMap}</span>
        </Button>
        <Button
          variant={projectType === "freeform" ? "default" : "outline"}
          className="h-28 text-lg flex-col gap-2 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          onClick={() => setProjectType("freeform")}
        >
          <Projector className="h-8 w-8" />
          <span>{t.projectTypeFreeform}</span>
        </Button>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
        <h3 className="text-lg font-medium text-center mb-6">{t.globalStyle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Edge Style Form */}
            <div className="space-y-4">
                <h4 className="font-medium text-center">{t.connectorStyle}</h4>
                <div className="space-y-2">
                    <Label htmlFor="line-color">{t.color}</Label>
                    <Input id="line-color" type="color" value={lineColor} onChange={e => setLineColor(e.target.value)} className="p-1"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="line-width">{t.thickness}</Label>
                    <Input id="line-width" type="number" min="1" value={lineWidth} onChange={e => setLineWidth(parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                    <Label>{t.lineStyle}</Label>
                    <ToggleGroup type="single" value={lineStyle} onValueChange={(v: "solid" | "dashed") => v && setLineStyle(v)} variant="outline" className="w-full">
                        <ToggleGroupItem value="solid" className="w-full">{t.solid}</ToggleGroupItem>
                        <ToggleGroupItem value="dashed" className="w-full">{t.dashed}</ToggleGroupItem>
                    </ToggleGroup>
                </div>
                <div className="space-y-2">
                    <Label>{t.arrows}</Label>
                    <div className="flex gap-2">
                        <Button variant={startArrow ? "secondary" : "outline"} className="w-full" onClick={() => setStartArrow(!startArrow)}><ArrowLeft className="mr-2 h-4 w-4"/> {t.start}</Button>
                        <Button variant={endArrow ? "secondary" : "outline"} className="w-full" onClick={() => setEndArrow(!endArrow)}><ArrowRight className="mr-2 h-4 w-4"/> {t.end}</Button>
                    </div>
                </div>
            </div>

            {/* Font Style Form */}
            <div className="space-y-4">
                <h4 className="font-medium text-center">{t.fontStyle}</h4>
                <div className="space-y-2">
                    <Label htmlFor="font-family">{t.font}</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sans-serif">Sans Serif</SelectItem>
                            <SelectItem value="serif">Serif</SelectItem>
                            <SelectItem value="monospace">Monospace</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="font-size">{t.size}</Label>
                    <Input id="font-size" type="number" min="1" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} />
                </div>
                 <div className="space-y-2">
                    <Label>{t.style}</Label>
                    <ToggleGroup type="multiple" value={fontStyle} onValueChange={v => setFontStyle(v as ("bold"|"italic")[])} variant="outline" className="w-full">
                        <ToggleGroupItem value="bold" className="w-full"><Bold className="h-4 w-4"/></ToggleGroupItem>
                        <ToggleGroupItem value="italic" className="w-full"><Italic className="h-4 w-4"/></ToggleGroupItem>
                    </ToggleGroup>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="text-color">{t.textColor}</Label>
                    <Input id="text-color" type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="p-1"/>
                </div>
            </div>
        </div>
    </>
  );

  const renderStep3 = () => {
    const defaultNodeStyles: { name: NodeStyleType; icon: React.ElementType, label: string }[] = [
      { name: "rectangle", icon: RectangleHorizontal, label: t.nodeStyleRectangle },
      { name: "rounded", icon: RectangleHorizontal, label: t.nodeStyleRounded },
      { name: "oval", icon: Circle, label: t.nodeStyleOval },
    ];

    const customNodeStyles = defaultTemplates.map(template => ({
        name: JSON.stringify(template), // Stringify the object to use as value
        icon: CaseSensitive,
        label: template.name
    }));

    const nodeStylesToShow = projectType === 'org-chart' ? customNodeStyles : defaultNodeStyles;
    
    const connectorStyles: { name: ConnectorStyle; icon: React.ElementType, label: string }[] = [
        { name: "default", icon: Spline, label: t.connectorStyleBezier },
        { name: "straight", icon: Minus, label: t.connectorStyleLinear },
        { name: "step", icon: MoveUpRight, label: t.connectorStyleStep },
        { name: "smoothstep", icon: MoveUpRight, label: t.connectorStyleRoundedStep },
    ];

    return (
      <>
        <h3 className="text-lg font-medium text-center mb-6">{t.styleCustomization}</h3>
        <div className="space-y-8">
          <div>
            <h4 className="font-medium mb-3 text-center">{t.nodeStyle}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {nodeStylesToShow.map(style => (
                <Button
                  key={style.label}
                  variant={nodeStyle === style.name ? "default" : "outline"}
                  className={cn(
                    "h-20 flex-col gap-2 shadow-sm hover:shadow-md transition-shadow",
                     style.label === 'Arrondi' ? 'rounded-lg' :
                     style.label === 'Rect.' ? 'rounded-none' :
                     style.label === 'Ovale' ? 'rounded-[50%]' : 
                     style.label === 'Cercle' ? 'rounded-full' : 'rounded-md'
                  )}
                  onClick={() => setNodeStyle(style.name)}
                >
                  <style.icon className="h-6 w-6" />
                  <span>{style.label}</span>
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-center">{t.connectorStyle}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {connectorStyles.map(style => (
                <Button
                  key={style.name}
                  variant={connectorStyle === style.name ? "default" : "outline"}
                  className="h-20 flex-col gap-2 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => setConnectorStyle(style.name)}
                >
                  <style.icon className={cn("h-6 w-6", style.name === 'step' && 'rotate-90',  style.name === 'smoothstep' && 'rotate-90')} />
                  <span>{style.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };
  
  const renderStep4 = () => {
    if (projectType === 'freeform') return null;

    const templates: { name: LayoutChoice; icon: React.ElementType; label: string }[] = [
      { name: "vertical", icon: ArrowRightLeft, label: t.templateVertical },
      { name: "horizontal", icon: ArrowRightLeft, label: t.templateHorizontal },
      { name: "radial", icon: Star, label: t.templateRadial },
    ];
      
    return (
        <div className="flex flex-col h-full">
            <h3 className="text-lg font-medium text-center mb-2">{t.layout}</h3>
            <p className="text-center text-muted-foreground mb-6">{t.layoutSubtitle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {templates.map((template) => (
                <Card
                    key={template.name}
                    className={cn(
                    "cursor-pointer hover:shadow-md transition-shadow",
                    layout === template.name && "ring-2 ring-primary"
                    )}
                    onClick={() => setLayout(template.name)}
                >
                    <div className="flex flex-col items-center justify-center p-2 gap-2 h-24">
                        <template.icon className={cn("h-6 w-6", template.name === 'horizontal' && 'rotate-90')} />
                        <span className="text-sm text-center">{template.label}</span>
                    </div>
                </Card>
            ))}
            </div>
        </div>
      );
  }


  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };
  
  const isNextDisabled = () => {
    switch (step) {
      case 1:
        return !projectType;
      case 2:
        return false; // No mandatory fields
      case 3:
        return !nodeStyle || !connectorStyle;
      case 4:
         return !layout && projectType !== 'freeform';
      default:
        return true;
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={resetState}>
      <DialogContent className="max-w-4xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.newProjectTitle}</DialogTitle>
          <div className="pt-2">
            <Breadcrumb currentStep={step} steps={wizardSteps} onStepClick={handleStepClick} />
          </div>
        </DialogHeader>

        <div className="py-8 min-h-[450px] flex flex-col justify-center">
            {renderCurrentStep()}
        </div>

        <DialogFooter className="flex justify-between w-full">
          <div className="flex justify-start">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t.cancel}
              </Button>
            </DialogClose>
          </div>

          <div className="flex justify-end gap-2">
              {step > 1 && (
                  <Button variant="outline" onClick={handleBack}>
                  {t.back}
                  </Button>
              )}

              {step < wizardSteps.length ? (
                  <Button onClick={handleNext} disabled={isNextDisabled()}>
                  {t.next}
                  </Button>
              ) : (
                  <Button onClick={handleCreate} disabled={isNextDisabled()}>
                  {t.create}
                  </Button>
              )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
