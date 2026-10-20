# -*- coding: utf-8 -*-
"""
Script de remoção de fundo de vídeo com IA (Robust Video Matting - RVM)
Extrai máscara alfa de alta qualidade e compõe vídeo WebM transparente com VP9 yuva420p.
"""

import sys
import os
import argparse
import json
import time
import subprocess
import cv2
import numpy as np
import onnxruntime as ort
import imageio_ffmpeg

def log_progress(progress, stage):
    msg = json.dumps({"progress": round(progress, 3), "stage": stage})
    print(f"PROGRESS:{msg}", flush=True)

def main():
    parser = argparse.ArgumentParser(description="Remoção de Fundo com IA para Vídeo")
    parser.add_argument("--input", required=True, help="Caminho do vídeo original")
    parser.add_argument("--output-mask", required=True, help="Caminho do vídeo de máscara (MP4)")
    parser.add_argument("--output-webm", required=True, help="Caminho do vídeo transparente (WebM com canal alfa)")
    parser.add_argument("--model", default="server/models/rvm_mobilenetv3_fp32.onnx", help="Caminho do modelo RVM ONNX")
    parser.add_argument("--downsample", type=float, default=0.25, help="Taxa de downsampling para features internas (0.25 a 0.5)")
    parser.add_argument("--max-frames", type=int, default=0, help="Limite de quadros para teste (0 = completo)")
    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_mask = os.path.abspath(args.output_mask)
    output_webm = os.path.abspath(args.output_webm)
    model_path = os.path.abspath(args.model)

    if not os.path.exists(input_path):
        print(f"ERROR: Arquivo de entrada não encontrado: {input_path}", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(model_path):
        log_progress(0.01, "Baixando modelo de IA (Robust Video Matting 14.9MB)...")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        url = "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx"
        import urllib.request
        urllib.request.urlretrieve(url, model_path)

    log_progress(0.02, "Carregando modelo de IA (Robust Video Matting)...")

    # Inicia sessão ONNX
    opts = ort.SessionOptions()
    opts.inter_op_num_threads = 4
    opts.intra_op_num_threads = 4
    session = ort.InferenceSession(model_path, sess_options=opts, providers=["CPUExecutionProvider"])

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"ERROR: Não foi possível abrir o vídeo: {input_path}", file=sys.stderr)
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if args.max_frames > 0:
        total_frames = min(total_frames, args.max_frames)

    # Configura gravador de vídeo para a máscara de alfa (grayscale MP4)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    mask_writer = cv2.VideoWriter(output_mask, fourcc, fps, (width, height), isColor=False)

    rec = [np.zeros([1, 1, 1, 1], dtype=np.float32) for _ in range(4)]
    down = np.array([args.downsample], dtype=np.float32)

    frame_idx = 0
    t_start = time.time()

    log_progress(0.05, f"Iniciando recorte com IA ({total_frames} quadros)...")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if args.max_frames > 0 and frame_idx >= args.max_frames:
                break

            # Converter BGR -> RGB e normalizar 0..1
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            src = np.transpose(rgb, (2, 0, 1))[np.newaxis, ...].astype(np.float32) / 255.0

            inputs = {
                "src": src,
                "r1i": rec[0],
                "r2i": rec[1],
                "r3i": rec[2],
                "r4i": rec[3],
                "downsample_ratio": down,
            }

            fgr, pha, r1o, r2o, r3o, r4o = session.run(None, inputs)
            rec = [r1o, r2o, r3o, r4o]

            # pha tem formato [1, 1, H, W] com valores de 0.0 a 1.0
            alpha = (np.clip(pha[0, 0], 0.0, 1.0) * 255.0).astype(np.uint8)
            mask_writer.write(alpha)

            frame_idx += 1

            if frame_idx % 10 == 0 or frame_idx == total_frames:
                pct = 0.05 + 0.75 * (frame_idx / max(1, total_frames))
                elapsed = time.time() - t_start
                fps_proc = frame_idx / max(0.001, elapsed)
                log_progress(pct, f"Recortando silhueta: {frame_idx}/{total_frames} qd ({fps_proc:.1f} fps)")

    finally:
        cap.release()
        mask_writer.release()

    log_progress(0.82, "Gerando vídeo transparente nativo com canal alfa (WebM VP9)...")

    # Utiliza FFmpeg de alta precisão (Gyan) para unificar o vídeo e a máscara gerada
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    merge_cmd = [
        ffmpeg_exe,
        "-y",
        "-i", input_path,
        "-i", output_mask,
        "-filter_complex", "[0:v][1:v]alphamerge[v]",
        "-map", "[v]",
        "-map", "0:a:0?",
        "-frames:v", str(frame_idx),
        "-c:v", "libvpx-vp9",
        "-pix_fmt", "yuva420p",
        "-b:v", "0",
        "-crf", "32",
        "-deadline", "realtime",
        "-cpu-used", "8",
        "-threads", "8",
        "-c:a", "libopus",
        output_webm
    ]

    merge_res = subprocess.run(merge_cmd, capture_output=True, text=True)
    if merge_res.returncode != 0:
        print(f"AVISO: Falha na unificação WebM ({merge_res.stderr}). A máscara MP4 continua disponível.", file=sys.stderr)

    log_progress(1.0, "Recorte de fundo e canal alfa concluídos com sucesso!")
    print(f"DONE:{json.dumps({'mask': os.path.basename(output_mask), 'webm': os.path.basename(output_webm)})}", flush=True)

if __name__ == "__main__":
    main()
