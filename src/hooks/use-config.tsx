
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Config, defaultConfig } from "@/config/config";
import { loadConfig } from "@/services/config.service";

type ConfigContextType = {
  config: Config;
  setConfig: (config: Config) => void;
  isLoaded: boolean;
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  setConfig: () => {},
  isLoaded: false,
});

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function initializeConfig() {
        const loadedConfig = await loadConfig();
        setConfig(loadedConfig);
        setIsLoaded(true);
    }
    initializeConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, setConfig, isLoaded }}>
      {children}
    </ConfigContext.Provider>
  );
};
