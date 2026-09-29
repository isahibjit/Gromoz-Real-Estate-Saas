import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import store from "./store";
import "./styles/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./common/queryClient";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 3200 }} />
        </BrowserRouter>
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
