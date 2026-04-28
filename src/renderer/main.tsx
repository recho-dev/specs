import { createRoot } from 'react-dom/client'
import './globals.css'
import App from '../components/App'

// StrictMode is intentionally omitted: Monaco editor's InstantiationService
// is not designed to survive the unmount→remount cycle that StrictMode
// simulates in development, causing "InstantiationService has been disposed".
createRoot(document.getElementById('root')!).render(<App />)
