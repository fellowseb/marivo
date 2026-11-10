import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "./blocking-stage-viewer.module.css";

interface StageElement {
  id: string;
  label: string;
  x: number; // 0..1 relative to stage width
  y: number; // 0..1 relative to stage height
}

interface BlockingStageViewerProps {
  elements: StageElement[];
}

/**
 * Stage viewer (wireframe v3): the 2D plan at the bottom of the page, drawn
 * on a raw 2D canvas, driven by the timeline tracks. Read-only for now
 * (editing lands with #210).
 */
export function BlockingStageViewer(props: BlockingStageViewerProps) {
  const { t } = useTranslation("blocking");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // match the canvas backing resolution to its CSS size so it fills the area
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(50, Math.floor(rect.width));
    canvas.height = Math.max(50, Math.floor(rect.height));
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    // stage floor
    ctx.strokeStyle = "#888";
    ctx.strokeRect(8, 8, width - 16, height - 16);
    for (const el of props.elements) {
      const x = 8 + el.x * (width - 16);
      const y = 8 + el.y * (height - 16);
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ddd";
      ctx.font = "10px sans-serif";
      ctx.fillText(el.label, x + 12, y + 3);
    }
  }, [props.elements]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={t("stage.label")} />
    </div>
  );
}

export default BlockingStageViewer;
