export type Config = {
  language: "fr" | "en";
  theme: "light" | "dark";
  resolution: string;
  displayMode: "fullscreen" | "windowed";
  highContrast: boolean;
  fontSize: "small" | "medium" | "large";
  reducedAnimations: boolean;
};

export const defaultConfig: Config = {
  language: "fr",
  theme: "light",
  resolution: "1920x1080",
  displayMode: "fullscreen",
  highContrast: false,
  fontSize: "medium",
  reducedAnimations: false,
};
