import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import { BaseURLProvider } from './Context/BaseURLProvider.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
  <BaseURLProvider>
      <App />
  </BaseURLProvider>  
  </StrictMode>,
)
