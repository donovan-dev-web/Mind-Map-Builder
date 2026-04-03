

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: Category;
  translations: any;
};

type Category = "guide" | "tutoriel";
type Section = {
  id: string;
  title: string;
  content: string;
};

export function HelpModal({
  isOpen,
  onClose,
  initialCategory,
  translations: t,
}: HelpModalProps) {
  const [activeCategory, setActiveCategory] = useState<Category>(initialCategory);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const helpContent = t.helpContent || { guide: [], tutoriel: [] };
  const categories = {
    guide: { label: t.helpGuideCategory, sections: helpContent.guide as Section[] },
    tutoriel: { label: t.helpTutorialCategory, sections: helpContent.tutoriel as Section[] },
  };

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
      const firstSection = categories[initialCategory]?.sections[0];
      setActiveSectionId(firstSection ? firstSection.id : null);
    }
  }, [isOpen, initialCategory, t]); // Use `t` to re-trigger if language changes

  const activeSection = categories[activeCategory]?.sections.find(
    (s: Section) => s.id === activeSectionId
  );

  const renderContent = () => {
    if (!activeSection) {
      return (
        <div className="p-6 text-center text-muted-foreground">
          Sélectionnez une section dans le menu.
        </div>
      );
    }
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="prose dark:prose-invert max-w-none"
            components={{
                h3: ({node, ...props}) => <h3 className="font-semibold text-xl mb-4 text-foreground" {...props} />,
                p: ({node, ...props}) => <p className="text-base text-muted-foreground mb-4" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 text-base text-muted-foreground" {...props} />,
                li: ({node, ...props}) => <li className="mb-2" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                code: ({node, ...props}) => <code className="bg-muted text-muted-foreground rounded-sm px-1 py-0.5 font-mono text-sm" {...props} />
            }}
        >
            {activeSection.content}
        </ReactMarkdown>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 h-[80vh] flex flex-col" showCloseButton={false}>
          <DialogHeader className="border-b px-6 py-4 bg-muted/40 dark:bg-card">
            <DialogTitle>{t.helpModalTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-1/3 max-w-xs border-r p-2 bg-muted/40 dark:bg-card">
                <ScrollArea className="h-full">
                    <Accordion type="single" collapsible defaultValue={initialCategory} className="w-full" value={activeCategory} onValueChange={(value) => setActiveCategory(value as Category)}>
                        {(Object.keys(categories) as Category[]).map((key) => (
                            <AccordionItem value={key} key={key}>
                                <AccordionTrigger 
                                    className="text-base px-2 hover:no-underline"
                                >
                                    {categories[key].label}
                                </AccordionTrigger>
                                <AccordionContent className="pl-4">
                                    <nav className="flex flex-col gap-1">
                                    {categories[key].sections.map((section: Section) => (
                                        <Button
                                            key={section.id}
                                            variant="ghost"
                                            className={cn(
                                            "justify-start px-2 py-1.5 h-auto text-sm",
                                            activeSectionId === section.id && activeCategory === key && "bg-accent text-accent-foreground"
                                            )}
                                            onClick={() => {
                                                setActiveCategory(key as Category);
                                                setActiveSectionId(section.id);
                                            }}
                                        >
                                            {section.title}
                                        </Button>
                                    ))}
                                    </nav>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            </aside>
            <main className="flex-1 overflow-y-auto bg-background dark:bg-muted/40">
              <div className="p-6">
                 {activeSection ? (
                  <>
                    <h2 className="text-2xl font-bold mb-4">{activeSection.title}</h2>
                    <Separator className="mb-6" />
                    {renderContent()}
                  </>
                 ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    Sélectionnez une section dans le menu.
                  </div>
                 )}
              </div>
            </main>
          </div>
          <div className="border-t px-6 py-4 flex justify-end gap-2 bg-muted/40 dark:bg-card">
            <Button variant="outline" onClick={onClose}>
              {t.close}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
