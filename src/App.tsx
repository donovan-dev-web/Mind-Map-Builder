    import { BrowserRouter, Routes, Route } from 'react-router-dom';
    import { Toaster } from "@/components/ui/toaster";
    import { ThemeProvider } from "@/components/theme-provider";
    import { ConfigProvider } from '@/hooks/use-config';
    import { UpdaterProvider } from '@/hooks/use-updater';

    import Home from './app/page';
    import EditorPage from './app/editor/page';
    import DesignerPage from './app/designer/page';
    import ExportPage from './app/export/page';

    function App() {
      return (
        <ConfigProvider>
          <UpdaterProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/editor" element={<EditorPage />} />
                  <Route path="/designer" element={<DesignerPage />} />
                  <Route path="/export" element={<ExportPage />} />
                </Routes>
              </BrowserRouter>
              <Toaster />
            </ThemeProvider>
          </UpdaterProvider>
        </ConfigProvider>
      );
    }

    export default App;
