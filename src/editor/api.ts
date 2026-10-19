// Comunicação com o servidor local
export type Job<T = unknown> = { status: "running" | "done" | "error"; progress: number; stage: string; result?: T; error?: string };

export class ApiError extends Error {}

const parse = async (r: Response) => {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status >= 500 && !data.error) throw new ApiError("O servidor do editor não respondeu. Use o iniciar.bat ou npm run dev.");
    throw new ApiError(data.error ?? `Erro ${r.status}`);
  }
  return data;
};

export const getJson = async <T>(url: string): Promise<T> => parse(await fetch(url).catch(netErr));
export const postJson = async <T>(url: string, body: unknown): Promise<T> =>
  parse(
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(netErr),
  );

const netErr = () => {
  throw new ApiError("O servidor do editor não respondeu. Use o iniciar.bat ou npm run dev.");
};

// Envio com progresso (fetch não informa progresso de upload)
export const uploadFile = <T>(file: File, onProgress?: (p: number) => void): Promise<T> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", "/api/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* resposta vazia */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(data.error ?? `Falha no envio (${xhr.status})`));
    };
    xhr.onerror = () => reject(new ApiError("O servidor do editor não respondeu. Use o iniciar.bat ou npm run dev."));
    xhr.send(form);
  });

export const pollJob = async <T>(id: string, onUpdate?: (j: Job<T>) => void, intervalMs = 700): Promise<T> => {
  for (;;) {
    const j = await getJson<Job<T>>(`/api/jobs/${id}`);
    onUpdate?.(j);
    if (j.status === "done") return j.result as T;
    if (j.status === "error") throw new ApiError(j.error ?? "Falha na tarefa");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
};

// Dimensões reais de uma imagem servida pelo editor
export const imageSize = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1000, height: img.naturalHeight || 1000 });
    img.onerror = () => resolve({ width: 1000, height: 1000 });
    img.src = src;
  });
