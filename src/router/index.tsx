import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../shared/components/Layout';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { ActivarCuentaPage } from '../modules/auth/pages/ActivarCuentaPage';
import { CambiarPasswordPage } from '../modules/auth/pages/CambiarPasswordPage';
import { AlumnosHubPage } from '../modules/alumnos/pages/AlumnosHubPage';
import { AlumnoDetailPage } from '../modules/alumnos/pages/AlumnoDetailPage';
import { CreateAlumnoPage } from '../modules/alumnos/pages/CreateAlumnoPage';
import { HistorialAcademicoPage } from '../modules/alumnos/pages/HistorialAcademicoPage';
import { SeguimientoPage } from '../modules/alumnos/pages/SeguimientoPage';
import { BuscarCursoPage } from '../modules/alumnos/pages/BuscarCursoPage';
import { CalificacionesPage } from '../modules/calificaciones/pages/CalificacionesPage';
import { CargarCalificacionesPage } from '../modules/calificaciones/pages/CargarCalificacionesPage';
import { LibroCalificacionesPage } from '../modules/calificaciones/pages/LibroCalificacionesPage';
import { InscripcionesPage } from '../modules/inscripciones/pages/InscripcionesPage';
import { NuevaInscripcionPage } from '../modules/inscripciones/pages/NuevaInscripcionPage';
import { AlertasPage } from '../modules/alertas/pages/AlertasPage';
import { AltaAcademicaPage } from '../modules/alta-academica/pages/AltaAcademicaPage';
import { AsistenciasPage } from '../modules/asistencias/pages/AsistenciasPage';
import { TomarAsistenciaPage } from '../modules/asistencias/pages/TomarAsistenciaPage';
import { ResumenAsistenciaPage } from '../modules/asistencias/pages/ResumenAsistenciaPage';
import { PlanificacionPage } from '../modules/planificacion/pages/PlanificacionPage';
import { EditorPlanificacionPage } from '../modules/planificacion/pages/EditorPlanificacionPage';
import { VisorPlanificacionPage } from '../modules/planificacion/pages/VisorPlanificacionPage';
import { DocentesPage } from '../modules/docentes/pages/DocentesPage';
import { EditorDocentePage } from '../modules/docentes/pages/EditorDocentePage';
import { AsignacionesPage } from '../modules/docentes/pages/AsignacionesPage';
import { CalendarioPage } from '../modules/calendario/pages/CalendarioPage';
import { MesasPage } from '../modules/examenes/pages/MesasPage';
import { MesaDetallePage } from '../modules/examenes/pages/MesaDetallePage';
import { DiarioClasesPage } from '../modules/planificacion/pages/DiarioClasesPage';
import { BibliotecaCatalogoPage } from '../modules/biblioteca/pages/BibliotecaCatalogoPage';
import { BibliotecaFichaPage } from '../modules/biblioteca/pages/BibliotecaFichaPage';
import { BibliotecaPanelPage } from '../modules/biblioteca/pages/BibliotecaPanelPage'; // usado como formulario crear/editar
import { EspaciosPage } from '../modules/espacios/pages/EspaciosPage';
import { EspaciosReservaPage } from '../modules/espacios/pages/EspaciosReservaPage';
import { EspaciosMisReservasPage } from '../modules/espacios/pages/EspaciosMisReservasPage';
import { EspaciosMantenimientoPage } from '../modules/espacios/pages/EspaciosMantenimientoPage';
import { CircularesPage } from '../modules/comunicacion/pages/CircularesPage';
import { CircularDetailPage } from '../modules/comunicacion/pages/CircularDetailPage';
import { CircularFormPage } from '../modules/comunicacion/pages/CircularFormPage';
import { UsuariosPage } from '../modules/usuarios/pages/UsuariosPage';
import { AdministrativosPage } from '../modules/administrativos/pages/AdministrativosPage';
import { EditorAdministrativoPage } from '../modules/administrativos/pages/EditorAdministrativoPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/activar-cuenta',
    element: <ActivarCuentaPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'cambiar-password', element: <CambiarPasswordPage /> },
          { path: 'alumnos', element: <AlumnosHubPage /> },
          { path: 'alumnos/nuevo', element: <CreateAlumnoPage /> },
          { path: 'alumnos/buscar-curso', element: <BuscarCursoPage /> },
          { path: 'alumnos/:id', element: <AlumnoDetailPage /> },
          { path: 'alumnos/:id/historial-academico', element: <HistorialAcademicoPage /> },
          { path: 'alumnos/:id/seguimiento', element: <SeguimientoPage /> },
          { path: 'calificaciones', element: <CalificacionesPage /> },
          { path: 'calificaciones/cargar', element: <CargarCalificacionesPage /> },
          { path: 'calificaciones/libro', element: <LibroCalificacionesPage /> },
          { path: 'inscripciones', element: <InscripcionesPage /> },
          { path: 'inscripciones/nueva', element: <NuevaInscripcionPage /> },
          { path: 'alertas', element: <AlertasPage /> },
          { path: 'alta-academica', element: <AltaAcademicaPage /> },
          { path: 'asistencias', element: <AsistenciasPage /> },
          { path: 'asistencias/tomar', element: <TomarAsistenciaPage /> },
          { path: 'asistencias/resumen', element: <ResumenAsistenciaPage /> },
          { path: 'planificacion',              element: <PlanificacionPage /> },
          { path: 'planificacion/nueva',        element: <EditorPlanificacionPage /> },
          { path: 'planificacion/:id',          element: <VisorPlanificacionPage /> },
          { path: 'planificacion/:id/editar',   element: <EditorPlanificacionPage /> },
          { path: 'docentes',                   element: <DocentesPage /> },
          { path: 'docentes/nuevo',             element: <EditorDocentePage /> },
          { path: 'docentes/asignaciones',      element: <AsignacionesPage /> },
          { path: 'docentes/:id/editar',        element: <EditorDocentePage /> },
          { path: 'calendario',                 element: <CalendarioPage /> },
          { path: 'examenes',                        element: <MesasPage /> },
          { path: 'examenes/:id',                    element: <MesaDetallePage /> },
          { path: 'planificacion/:id/diario',        element: <DiarioClasesPage /> },
          { path: 'biblioteca',                      element: <BibliotecaCatalogoPage /> },
          { path: 'biblioteca/nuevo',                element: <BibliotecaPanelPage /> },
          { path: 'biblioteca/:id/editar',           element: <BibliotecaPanelPage /> },
          { path: 'biblioteca/:id',                  element: <BibliotecaFichaPage /> },
          { path: 'espacios',                        element: <EspaciosPage /> },
          { path: 'espacios/nueva-reserva',          element: <EspaciosReservaPage /> },
          { path: 'espacios/mis-reservas',           element: <EspaciosMisReservasPage /> },
          { path: 'espacios/mantenimiento',          element: <EspaciosMantenimientoPage /> },
          { path: 'comunicacion',                    element: <CircularesPage /> },
          { path: 'comunicacion/nueva',              element: <CircularFormPage /> },
          { path: 'comunicacion/:id/editar',         element: <CircularFormPage /> },
          { path: 'comunicacion/:id',                element: <CircularDetailPage /> },
          { path: 'usuarios',                        element: <UsuariosPage /> },
          { path: 'administrativos',                 element: <AdministrativosPage /> },
          { path: 'administrativos/nuevo',           element: <EditorAdministrativoPage /> },
          { path: 'administrativos/:id/editar',      element: <EditorAdministrativoPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
