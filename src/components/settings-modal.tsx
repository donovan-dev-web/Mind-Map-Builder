

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DownloadCloud, Loader2, Moon, Sun, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/hooks/use-config";
import { useTheme } from "next-themes";
import { Config, defaultConfig } from "@/config/config";
import { saveConfig } from "@/services/config.service";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { useUpdater } from "@/hooks/use-updater";
import { Progress } from "./ui/progress";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FlagFR } from "./ui/flag-fr";
import { FlagEN } from "./ui/flag-en";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: Category;
  translations: any;
};

export type Category = "general" | "display" | "accessibility" | "shortcuts" | "about";

export function SettingsModal({
  isOpen,
  onClose,
  initialCategory,
  translations: t,
}: SettingsModalProps) {
  const { config, setConfig } = useConfig();
  const { theme, setTheme } = useTheme();
  const updater = useUpdater();
  const [activeCategory, setActiveCategory] = useState<Category>(initialCategory);
  const [localConfig, setLocalConfig] = useState<Config>(config);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setHasChanges(false);
      setActiveCategory(initialCategory);
    }
  }, [isOpen, config, initialCategory]);
  
  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(localConfig));
  }, [localConfig, config]);


  const categories = {
    general: { label: t.settingsGeneral },
    display: { label: t.settingsDisplay },
    accessibility: { label: t.settingsAccessibility },
    shortcuts: { label: t.ribbonShortcuts },
    about: { label: t.settingsAbout },
  };

  const shortcuts = [
    { keys: ["Ctrl", "Z"], description: t.shortcutUndo },
    { keys: ["Ctrl", "Y"], description: t.shortcutRedo },
    { keys: ["Ctrl", "C"], description: t.shortcutCopy },
    { keys: ["Ctrl", "X"], description: t.shortcutCut },
    { keys: ["Ctrl", "V"], description: t.shortcutPaste },
    { keys: ["Ctrl", "L"], description: t.shortcutConnectNodes },
    { keys: ["Ctrl", "F"], description: t.shortcutSearch },
    { keys: ["Suppr"], description: t.shortcutDelete },
    { keys: ["Entrée"], description: t.shortcutAddChild },
    { keys: ["Maj", "Entrée"], description: t.shortcutAddSibling },
    { keys: ["Ctrl", "Clic"], description: t.shortcutMultiSelect },
    { keys: ["Molette"], description: t.shortcutZoom },
    { keys: ["Espace", "Clic"], description: t.shortcutPan },
  ];

  const handleSave = () => {
    setConfig(localConfig);
    if (localConfig.theme !== theme) {
      setTheme(localConfig.theme);
    }
    saveConfig(localConfig);
    onClose();
  };

  const handleLanguageChange = (lang: "fr" | "en") => {
    setLocalConfig({ ...localConfig, language: lang });
  };

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    setLocalConfig({ ...localConfig, theme: newTheme });
  };
  
  const handleResolutionChange = (resolution: string) => {
    setLocalConfig({ ...localConfig, resolution });
  };
  
  const handleDisplayModeChange = (displayMode: "fullscreen" | "windowed") => {
    setLocalConfig({ ...localConfig, displayMode });
  };

  const handleReset = () => {
    setLocalConfig(defaultConfig);
  }

  const handleAccessibilityChange = (key: keyof Config, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="language-select">{t.language}</Label>
              <Select
                onValueChange={handleLanguageChange}
                value={localConfig.language}
              >
                <SelectTrigger id="language-select" className="w-[180px]">
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
            <Separator />
             <div className="space-y-4">
                <Label>{t.defaultSettings}</Label>
                <p className="text-sm text-muted-foreground">{t.defaultSettingsDescription}</p>
                <Button variant="outline" onClick={handleReset}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    {t.resetToDefault}
                </Button>
            </div>
          </div>
        );
      case "display":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-switch-modal">{t.theme}</Label>
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                <Switch
                  id="theme-switch-modal"
                  checked={localConfig.theme === "dark"}
                  onCheckedChange={handleThemeChange}
                  aria-label={t.toggleTheme}
                />
                <Moon className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="resolution-select">{t.resolution}</Label>
               <Select onValueChange={handleResolutionChange} value={localConfig.resolution}>
                <SelectTrigger id="resolution-select" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1920x1080">1920x1080</SelectItem>
                  <SelectItem value="1280x720">1280x720</SelectItem>
                  <SelectItem value="1024x768">1024x768</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="display-mode-select">{t.displayMode}</Label>
               <Select onValueChange={handleDisplayModeChange} value={localConfig.displayMode}>
                <SelectTrigger id="display-mode-select" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullscreen">{t.fullscreen}</SelectItem>
                  <SelectItem value="windowed">{t.windowed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "accessibility":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="high-contrast-switch">{t.highContrastMode}</Label>
              <Switch
                id="high-contrast-switch"
                checked={localConfig.highContrast}
                onCheckedChange={(checked) => handleAccessibilityChange('highContrast', checked)}
              />
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="font-size-select">{t.fontSize}</Label>
               <Select onValueChange={(value) => handleAccessibilityChange('fontSize', value)} value={localConfig.fontSize}>
                <SelectTrigger id="font-size-select" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t.fontSizeSmall}</SelectItem>
                  <SelectItem value="medium">{t.fontSizeMedium}</SelectItem>
                  <SelectItem value="large">{t.fontSizeLarge}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="reduced-animations-switch">{t.reducedAnimations}</Label>
              <Switch
                id="reduced-animations-switch"
                checked={localConfig.reducedAnimations}
                onCheckedChange={(checked) => handleAccessibilityChange('reducedAnimations', checked)}
              />
            </div>
          </div>
        );
      case "shortcuts":
        return (
            <div className="space-y-6">
                <h3 className="font-semibold">{t.shortcutsTitle}</h3>
                <div className="space-y-4">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <p className="text-muted-foreground">{shortcut.description}</p>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <Badge key={keyIndex} variant="outline" className="font-mono">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
        );
      case "about":
        return (
          <div className="text-sm text-muted-foreground h-full flex flex-col items-center justify-start gap-4 text-center">
              <p className="text-lg font-semibold text-foreground">{t.title} v0.1.0</p>
              
              {updater.status === 'IDLE' && !updater.updateAvailable && (
                <Button onClick={updater.checkForUpdate}>{t.checkForUpdates}</Button>
              )}
              
              {updater.status === 'CHECKING' && (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    <span>{t.checkingForUpdate}</span>
                </div>
              )}

              {updater.error && (
                <p className="text-destructive">{updater.error}</p>
              )}

              {(updater.status === 'PENDING' || (updater.updateAvailable && updater.status !== 'DOWNLOADING' && updater.status !== 'READY_TO_INSTALL')) && updater.updateManifest && (
                <div className="w-full text-left p-4 border rounded-lg bg-muted/50 space-y-4">
                    <h3 className="font-semibold text-lg text-foreground">{t.updateAvailableTitle.replace('{version}', updater.updateManifest.version)}</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{config.language === 'en' ? 'New features added.' : updater.updateManifest.body}</ReactMarkdown>
                    </div>
                    <Button onClick={updater.startDownload}>
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        {t.downloadUpdate}
                    </Button>
                </div>
              )}

              {updater.status === 'DOWNLOADING' && (
                <div className="w-full space-y-2">
                    <p>{t.downloadingUpdate.replace('{progress}', String(Math.round(updater.downloadProgress)))}</p>
                    <Progress value={updater.downloadProgress} />
                </div>
              )}

              {updater.status === 'READY_TO_INSTALL' && (
                  <div className="w-full text-left p-4 border rounded-lg bg-green-100 dark:bg-green-900/50 space-y-4">
                      <h3 className="font-semibold text-lg text-green-800 dark:text-green-300">{t.updateReady}</h3>
                      <p className="text-green-700 dark:text-green-400">{t.updateReadyDescription}</p>
                      <Button onClick={updater.restartAndInstall} className="bg-green-600 hover:bg-green-700 text-white">
                          {t.restartAndInstall}
                      </Button>
                  </div>
              )}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0" showCloseButton={false}>
        <div className="flex flex-col h-[500px]">
          <div className="border-b px-6 py-4 bg-muted/40 dark:bg-card">
              <DialogTitle>{t.settingsTitle}</DialogTitle>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-1/3 border-r p-2 bg-muted/40 dark:bg-card">
              <nav className="flex flex-col gap-1">
                {Object.keys(categories).map((key) => (
                  <Button
                    key={key}
                    variant="ghost"
                    className={cn(
                      "justify-start px-3 py-2 text-base border border-transparent",
                      activeCategory === key ? "bg-accent text-accent-foreground border-border" : "hover:bg-muted"
                    )}
                    onClick={() => setActiveCategory(key as Category)}
                  >
                    {categories[key as Category].label}
                  </Button>
                ))}
              </nav>
            </aside>
            <main className="w-2/3 p-6 overflow-y-auto bg-background dark:bg-muted/40">
                {renderContent()}
            </main>
          </div>
          <div className="border-t px-6 py-4 flex justify-end gap-2 bg-muted/40 dark:bg-card">
            <Button onClick={handleSave} disabled={!hasChanges}>{t.save}</Button>
            <Button variant="outline" onClick={onClose}>
              {t.close}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
