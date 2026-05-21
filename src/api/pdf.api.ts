const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

async function downloadPdf(endpoint: string, filename: string): Promise<void> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Error al generar el PDF');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const pdfApi = {
  downloadFicha: (alumnoId: string) =>
    downloadPdf(`/alumnos/${alumnoId}/ficha/pdf`, `ficha-${alumnoId}.pdf`),

  downloadActa: (actaId: string) =>
    downloadPdf(`/actas/${actaId}/pdf`, `acta-${actaId}.pdf`),

  downloadBoletin: (alumnoId: string, periodo: string, ciclo: number) => {
    const params = new URLSearchParams({ periodo, ciclo: String(ciclo) });
    return downloadPdf(
      `/alumnos/${alumnoId}/boletin?${params}`,
      `boletin-${alumnoId}-${periodo.replace(/\s+/g, '-')}.pdf`,
    );
  },

  downloadInscripciones: (cursoId: string, cicloLectivo: number) => {
    const params = new URLSearchParams({ curso_id: cursoId, ciclo_lectivo: String(cicloLectivo) });
    return downloadPdf(
      `/inscripciones/export?${params}`,
      `inscripciones-${cicloLectivo}.pdf`,
    );
  },

  downloadAlertas: (cursoId: string, cicloLectivo: number, periodo?: string) => {
    const params = new URLSearchParams({ curso_id: cursoId, ciclo_lectivo: String(cicloLectivo) });
    if (periodo) params.set('periodo', periodo);
    return downloadPdf(
      `/alertas/export?${params}`,
      `alertas-${cicloLectivo}${periodo ? '-' + periodo.replace(/\s+/g, '-') : ''}.pdf`,
    );
  },
};
