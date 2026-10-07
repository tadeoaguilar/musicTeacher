import { Navigate, createBrowserRouter } from 'react-router'
import { MetronomePage } from '../features/metronome/MetronomePage'
import { ScalesPage } from '../features/scales/ScalesPage'
import { TunerPage } from '../features/tuner/TunerPage'
import { detectLocale } from '../i18n'
import { Layout } from './Layout'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={`/${detectLocale()}/scales`} replace /> },
  {
    path: '/:lang',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="scales" replace /> },
      { path: 'scales', element: <ScalesPage /> },
      { path: 'metronome', element: <MetronomePage /> },
      { path: 'tuner', element: <TunerPage /> },
      // Future sections (arpeggios, grooves, lessons, ear training) are added here.
      { path: '*', element: <Navigate to="scales" replace /> },
    ],
  },
])
