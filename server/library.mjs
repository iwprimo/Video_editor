// Biblioteca de mídia: evita importar o mesmo vídeo duas vezes e ajuda a liberar espaço.
// O índice fica em midia/.importados.json: "nome|tamanho" do arquivo enviado → resultado da importação.
import fs from "node:fs";
import path from "node:path";

export const importKey = (name, size) => `${String(name ?? "").trim().toLowerCase()}|${Number(size) || 0}`;

export const createLibrary = ({ mediaDir, originalsDir }) => {
  const indexFile = path.join(mediaDir, ".importados.json");
  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(indexFile, "utf8"));
    } catch {
      return {};
    }
  };
  const write = (data) => fs.writeFileSync(indexFile, JSON.stringify(data, null, 1));

  // Resultado de uma importação anterior do mesmo arquivo, se o vídeo convertido ainda existir
  const lookup = (name, size) => {
    const hit = read()[importKey(name, size)];
    if (hit?.file && fs.existsSync(path.join(mediaDir, path.basename(hit.file)))) return hit;
    return null;
  };

  const remember = (name, size, result) => {
    const data = read();
    data[importKey(name, size)] = { ...result, importedAt: new Date().toISOString() };
    write(data);
  };

  const forget = (file) => {
    const data = read();
    let changed = false;
    for (const [k, v] of Object.entries(data)) {
      if (v?.file === file) {
        delete data[k];
        changed = true;
      }
    }
    if (changed) write(data);
  };

  // Levantamento: o que cada arquivo ocupa e se o projeto aberto usa
  // "projectText" é o projeto em JSON; um arquivo é usado se o nome dele aparece ali.
  const scan = (projectText) => {
    const text = String(projectText ?? "");
    const list = (dir, folder) =>
      fs.existsSync(dir)
        ? fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((d) => d.isFile() && !d.name.startsWith("."))
            .map((d) => {
              const st = fs.statSync(path.join(dir, d.name));
              return { folder, name: d.name, size: st.size, mtimeMs: st.mtimeMs, used: text.includes(d.name) };
            })
        : [];
    const media = list(mediaDir, "midia");
    const originals = list(originalsDir, "originais");
    // Nome sem o prefixo de importação ("mvemg4ct-Video.mp4" → "video.mp4"), para achar cópias repetidas
    const plain = (n) => n.replace(/^[a-z0-9]{6,10}-/i, "").toLowerCase();
    const usedSigs = new Set(media.filter((f) => f.used).map((f) => `${plain(f.name)}|${f.size}`));
    const derivedOf = (n) => n.replace(/-(mask|alpha)\.(mp4|webm)$/i, ".mp4");
    const inMedia = new Set(media.map((f) => f.name));
    const files = [...media, ...originals].map((f) => {
      let kind = "used";
      // O editor sempre usa a cópia da pasta midia; o original com o mesmo nome é só sobra
      if (f.folder === "originais" && inMedia.has(f.name)) return { ...f, kind: "leftover" };
      if (!f.used) {
        if (f.folder === "originais") kind = "leftover";
        else if (usedSigs.has(`${plain(f.name)}|${f.size}`)) kind = "duplicate";
        else if (/-(mask|alpha)\.(mp4|webm)$/i.test(f.name) && text.includes(derivedOf(f.name))) kind = "used";
        else kind = "unused";
      }
      return { ...f, kind };
    });
    const sum = (k) => files.filter((f) => f.kind === k).reduce((a, f) => a + f.size, 0);
    return {
      files: files.sort((a, b) => b.size - a.size),
      totals: { all: files.reduce((a, f) => a + f.size, 0), used: sum("used"), duplicate: sum("duplicate"), leftover: sum("leftover"), unused: sum("unused") },
    };
  };

  // Apaga arquivos escolhidos (só dentro de midia/ e midia/originais/) e o cache de forma de onda deles
  const remove = (items) => {
    const removed = [];
    const errors = [];
    for (const it of Array.isArray(items) ? items : []) {
      const name = path.basename(String(it?.name ?? ""));
      const dir = it?.folder === "originais" ? originalsDir : it?.folder === "midia" ? mediaDir : null;
      if (!dir || !name || name.startsWith(".")) continue;
      const p = path.join(dir, name);
      try {
        const size = fs.statSync(p).size;
        fs.rmSync(p);
        fs.rmSync(path.join(mediaDir, ".waveform", `${name}.json`), { force: true });
        if (dir === mediaDir) forget(name);
        removed.push({ folder: it.folder, name, size });
      } catch (e) {
        errors.push(`${name}: ${e.code === "EBUSY" || e.code === "EPERM" ? "em uso por outro programa" : e.message}`);
      }
    }
    return { removed, freed: removed.reduce((a, f) => a + f.size, 0), errors };
  };

  return { lookup, remember, forget, scan, remove };
};
