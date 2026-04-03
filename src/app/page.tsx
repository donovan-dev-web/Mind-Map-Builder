
import { Button } from "@/components/ui/button";
import { BrainCircuit, FilePlus, FolderOpen, Settings, DownloadCloud, Book } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { translations } from "@/config/translations";
import { SettingsModal } from "@/components/settings-modal";
import { useConfig } from "@/hooks/use-config";
import { NewProjectModal } from "@/components/new-project-modal";
import { useUpdater } from "@/hooks/use-updater";
import { HelpModal } from "@/components/help-modal";
import { useNavigate } from "react-router-dom";
import { openProject } from "@/services/project-manager";
import { useToast } from "@/hooks/use-toast";
import { FlagFR } from "@/components/ui/flag-fr";
import { FlagEN } from "@/components/ui/flag-en";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const { config, setConfig, isLoaded } = useConfig();
  const { updateAvailable } = useUpdater();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialSettingsCategory, setInitialSettingsCategory] = useState<'general' | 'about'>('general');
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [initialHelpCategory, setInitialHelpCategory] = useState<'guide' | 'tutoriel'>('guide');
  const navigate = useNavigate();
  const { toast } = useToast();

  const t = translations[config.language];

  useEffect(() => {
    if (isLoaded && theme !== config.theme) {
      setTheme(config.theme);
    }
  }, [isLoaded, config.theme, theme, setTheme]);
  
  const setLanguage = (lang: "fr" | "en") => {
    setConfig({ ...config, language: lang });
  };
  
  const openSettings = (category: 'general' | 'about' = 'general') => {
    setInitialSettingsCategory(category);
    setIsSettingsOpen(true);
  }

  const openHelpModal = (category: 'guide' | 'tutoriel' = 'guide') => {
    setInitialHelpCategory(category);
    setIsHelpModalOpen(true);
  }

  const handleOpenProject = async () => {
    const projectData = await openProject();
    if (projectData) {
      // Store the loaded project data in sessionStorage to pass it to the editor page
      sessionStorage.setItem('loaded-project-data', JSON.stringify(projectData));
      navigate('/editor');
    } else {
      // Handle the case where no project was opened or an error occurred
      toast({
        variant: "destructive",
        title: t.loadProjectError,
        description: t.loadProjectErrorDescription,
      });
    }
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 relative">
      <div className="absolute top-4 right-4 flex gap-4">
        {updateAvailable && (
          <Button variant="outline" className="text-primary border-primary animate-pulse" onClick={() => openSettings('about')}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            {t.updateAvailable}
          </Button>
        )}
        <Select onValueChange={setLanguage} value={config.language}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t.language} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">
                <div className="flex items-center gap-2">
                    <FlagFR className="w-5 h-5" />
                    <span>Français</span>
                </div>
            </SelectItem>
            <SelectItem value="en">
                <div className="flex items-center gap-2">
                    <FlagEN className="w-5 h-5" />
                    <span>English</span>
                </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-4">
          <BrainCircuit className="h-16 w-16 text-primary" strokeWidth={1} />
          <h1 className="text-6xl font-bold tracking-tight">{t.title}</h1>
        </div>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl">
          {t.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Button variant="outline" className="h-32 text-xl flex-col gap-2 rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow" onClick={() => setIsNewProjectOpen(true)}>
          <FilePlus className="h-16 w-16 text-primary" strokeWidth={1} />
          <span>{t.new}</span>
        </Button>
        <Button variant="outline" className="h-32 text-xl flex-col gap-2 rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow" onClick={handleOpenProject}>
          <FolderOpen className="h-16 w-16" strokeWidth={1} />
          <span>{t.load}</span>
        </Button>
      </div>

      <div className="absolute bottom-4 left-4">
        <Button variant="outline" size="sm" onClick={() => openSettings()}>
          <Settings className="h-4 w-4 mr-2" />
          <span>{t.settings}</span>
        </Button>
      </div>
      <div className="absolute bottom-4 right-4">
        <Button variant="outline" size="sm" onClick={() => openHelpModal()}>
          <Book className="h-4 w-4 mr-2" />
          <span>{t.editorHelp}</span>
        </Button>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        translations={t}
        initialCategory={initialSettingsCategory}
      />
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        translations={t}
      />
       <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          initialCategory={initialHelpCategory}
          translations={t}
        />
    </div>
  );
}
