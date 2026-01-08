<script lang="ts">
  import { currentImage, imageStore } from "$lib/stores/imageStore";
  import {
    posterizeImage,
    remapImageToPalette,
    applyAdjustments,
  } from "$lib/utils/imageProcessing";
  import { palettes } from "$lib/utils/palettes";
  import {
    generatePaintByNumbersLines,
    generatePaintByNumbersBlocks,
  } from "$lib/utils/paintByNumbers";
  import EmptyState from "./EmptyState.svelte";

  let canvas: HTMLCanvasElement;
  let overlayCanvas: HTMLCanvasElement;
  let paintByNumbersCanvas: HTMLCanvasElement;
  let baseDrawId: number | null = null;
  let overlayDrawId: number | null = null;
  let previewFilter = "none";
  let previewTransform = "none";

  let isDragging = false;
  let dragHandle: string | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartCrop: typeof $imageStore.adjustments.crop = null;

  $: if (canvas && $currentImage) {
    scheduleBaseDraw();
  }

  $: if (
    canvas &&
    $currentImage &&
    $imageStore.activeTool === "adjustments" &&
    $imageStore.adjustments
  ) {
    scheduleBaseDraw();
  }

  $: if (
    $imageStore.activeTool === "adjustments" &&
    !$imageStore.adjustments.cropMode
  ) {
    const { filter, transform } = buildCssPreview($imageStore.adjustments);
    previewFilter = filter;
    previewTransform = transform;
  } else {
    previewFilter = "none";
    previewTransform = "none";
  }

  $: if ($imageStore.activeTool === "value-simplification" && $currentImage) {
    // Schedule overlay update on next animation frame for smoothness
    if (overlayDrawId) cancelAnimationFrame(overlayDrawId);
    overlayDrawId = requestAnimationFrame(() => {
      overlayDrawId = null;
      if ($imageStore.valueSimplification.paintByNumbersEnabled) {
        drawPaintByNumbers();
      } else {
        drawValueSimplificationOverlay();
      }
    });
  }

  function scheduleBaseDraw() {
    if (!canvas || !$currentImage) return;
    if (baseDrawId) cancelAnimationFrame(baseDrawId);
    baseDrawId = requestAnimationFrame(() => {
      baseDrawId = null;
      drawImage();
    });
  }

  function buildCssPreview(adjustments: typeof $imageStore.adjustments) {
    const brightness = 1 + adjustments.brightness;
    const exposure = Math.pow(2, adjustments.exposure);
    const contrast = 1 + adjustments.contrast;
    const saturation = 1 + adjustments.saturation;
    const warmthDeg = adjustments.warmth * 15; // gentle shift
    const tone = 1 + (adjustments.shadows + adjustments.highlights) * 0.1;

    const filter = `brightness(${(brightness * exposure * tone).toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)}) hue-rotate(${warmthDeg.toFixed(1)}deg)`;
    const transform = `rotate(${adjustments.rotation.toFixed(2)}deg)`;

    return { filter, transform };
  }

  function drawImage() {
    if (!canvas || !$currentImage) {
      console.error("Missing canvas or image:", {
        canvas: !!canvas,
        currentImage: !!$currentImage,
      });
      return;
    }

    try {
      const previewImage = $currentImage;

      canvas.width = previewImage.width;
      canvas.height = previewImage.height;

      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      const imageData = ctx.createImageData(
        previewImage.width,
        previewImage.height
      );
      const dataArray = new Uint8ClampedArray(previewImage.data);
      imageData.data.set(dataArray);
      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.error("Error drawing image:", error);
    }
  }

  function drawValueSimplificationOverlay() {
    if (!overlayCanvas || !$currentImage) return;

    overlayCanvas.width = $currentImage.width;
    overlayCanvas.height = $currentImage.height;

    const ctx = overlayCanvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    // Posterize the image
    let imageDataArray = new Uint8ClampedArray($currentImage.data);
    let posterized = posterizeImage(
      imageDataArray,
      $imageStore.valueSimplification.levels
    );

    // Apply palette if enabled
    if ($imageStore.valueSimplification.paletteEnabled) {
      const palette = palettes[$imageStore.valueSimplification.selectedPalette];
      if (palette) {
        posterized = remapImageToPalette(posterized, palette.colors);
      }
    }

    const imageData = ctx.createImageData(
      $currentImage.width,
      $currentImage.height
    );
    imageData.data.set(posterized);
    ctx.putImageData(imageData, 0, 0);

    // Set overlay opacity
    overlayCanvas.style.opacity = `${$imageStore.valueSimplification.opacity}`;
  }

  function drawPaintByNumbers() {
    if (!paintByNumbersCanvas || !$currentImage) return;

    try {
      paintByNumbersCanvas.width = $currentImage.width;
      paintByNumbersCanvas.height = $currentImage.height;

      const ctx = paintByNumbersCanvas.getContext("2d", {
        willReadFrequently: false,
      });
      if (!ctx) return;

      // For lines mode: use ORIGINAL image for clean edges
      // For blocks mode: use simplified version for color fills
      const imageDataArray = new Uint8ClampedArray($currentImage.data);

      let sourceData: Uint8ClampedArray;

      if ($imageStore.valueSimplification.paintByNumbersMode === "lines") {
        // Use original image for edge detection - creates clean artist-quality lines
        sourceData = imageDataArray;
      } else {
        // For color blocks, use posterized/palette version
        let posterized = posterizeImage(
          imageDataArray,
          $imageStore.valueSimplification.levels
        );

        if ($imageStore.valueSimplification.paletteEnabled) {
          const palette =
            palettes[$imageStore.valueSimplification.selectedPalette];
          if (palette) {
            posterized = remapImageToPalette(posterized, palette.colors);
          }
        }

        sourceData = posterized;
      }

      // Generate paint-by-numbers
      const paintByNumbers =
        $imageStore.valueSimplification.paintByNumbersMode === "lines"
          ? generatePaintByNumbersLines(
              sourceData,
              $currentImage.width,
              $currentImage.height,
              $imageStore.valueSimplification.levels
            )
          : generatePaintByNumbersBlocks(
              sourceData,
              $currentImage.width,
              $currentImage.height
            );

      const imageData = ctx.createImageData(
        $currentImage.width,
        $currentImage.height
      );
      imageData.data.set(paintByNumbers);
      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.error("Error generating paint-by-numbers:", error);
      // Still try to draw something
      if (paintByNumbersCanvas) {
        const ctx = paintByNumbersCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(
            0,
            0,
            paintByNumbersCanvas.width,
            paintByNumbersCanvas.height
          );
        }
      }
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
  }

  function handleCropMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const handle = target.dataset.handle;
    if (!handle || !canvas || !$imageStore.adjustments.crop) return;

    isDragging = true;
    dragHandle = handle;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartCrop = { ...$imageStore.adjustments.crop };
    e.preventDefault();
  }

  function handleCropMouseMove(e: MouseEvent) {
    if (!isDragging || !dragHandle || !canvas || !dragStartCrop) return;

    const rect = canvas.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartX) / rect.width;
    const deltaY = (e.clientY - dragStartY) / rect.height;

    let { x, y, width, height } = dragStartCrop;

    switch (dragHandle) {
      case "tl":
        x = Math.max(0, Math.min(x + deltaX, x + width - 0.05));
        y = Math.max(0, Math.min(y + deltaY, y + height - 0.05));
        width = dragStartCrop.width - (x - dragStartCrop.x);
        height = dragStartCrop.height - (y - dragStartCrop.y);
        break;
      case "tr":
        y = Math.max(0, Math.min(y + deltaY, y + height - 0.05));
        width = Math.max(0.05, Math.min(dragStartCrop.width + deltaX, 1 - x));
        height = dragStartCrop.height - (y - dragStartCrop.y);
        break;
      case "bl":
        x = Math.max(0, Math.min(x + deltaX, x + width - 0.05));
        width = dragStartCrop.width - (x - dragStartCrop.x);
        height = Math.max(0.05, Math.min(dragStartCrop.height + deltaY, 1 - y));
        break;
      case "br":
        width = Math.max(0.05, Math.min(dragStartCrop.width + deltaX, 1 - x));
        height = Math.max(0.05, Math.min(dragStartCrop.height + deltaY, 1 - y));
        break;
      case "t":
        y = Math.max(0, Math.min(y + deltaY, y + height - 0.05));
        height = dragStartCrop.height - (y - dragStartCrop.y);
        break;
      case "b":
        height = Math.max(0.05, Math.min(dragStartCrop.height + deltaY, 1 - y));
        break;
      case "l":
        x = Math.max(0, Math.min(x + deltaX, x + width - 0.05));
        width = dragStartCrop.width - (x - dragStartCrop.x);
        break;
      case "r":
        width = Math.max(0.05, Math.min(dragStartCrop.width + deltaX, 1 - x));
        break;
    }

    imageStore.updateAdjustments({ crop: { x, y, width, height } });
  }

  function handleCropMouseUp() {
    isDragging = false;
    dragHandle = null;
  }
</script>

<div
  class="w-full h-full flex items-center justify-center bg-surface-900 rounded-lg overflow-hidden"
>
  {#if $currentImage}
    <div class="relative inline-block max-h-full max-w-full">
      <canvas
        bind:this={canvas}
        on:wheel={handleWheel}
        class="border border-surface-700 cursor-crosshair fit-canvas"
        style={`filter: ${previewFilter}; transform: ${previewTransform}; transform-origin: center; display: block;`}
      ></canvas>
      {#if $imageStore.activeTool === "value-simplification" && !$imageStore.valueSimplification.paintByNumbersEnabled}
        <canvas
          bind:this={overlayCanvas}
          class="absolute top-0 left-0 border border-surface-700 cursor-crosshair fit-canvas"
          style="mix-blend-mode: normal; transition: opacity 0.2s ease; pointer-events: none;"
        ></canvas>
      {/if}
      {#if $imageStore.activeTool === "value-simplification" && $imageStore.valueSimplification.paintByNumbersEnabled}
        <canvas
          bind:this={paintByNumbersCanvas}
          class="absolute top-0 left-0 border border-surface-700 cursor-crosshair fit-canvas"
          style="mix-blend-mode: normal; background: white; pointer-events: none;"
        ></canvas>
      {/if}
      {#if $imageStore.activeTool === "adjustments" && $imageStore.adjustments.cropMode && $imageStore.adjustments.crop}
        <div
          class="absolute inset-0"
          role="button"
          tabindex="0"
          on:mousedown={handleCropMouseDown}
          on:mousemove={handleCropMouseMove}
          on:mouseup={handleCropMouseUp}
          on:mouseleave={handleCropMouseUp}
        >
          <!-- Darkened outer areas -->
          <div
            class="absolute bg-black/60 pointer-events-none"
            style={`top: 0; left: 0; right: 0; height: ${
              $imageStore.adjustments.crop.y * 100
            }%;`}
          ></div>
          <div
            class="absolute bg-black/60 pointer-events-none"
            style={`top: ${(
              ($imageStore.adjustments.crop.y +
                $imageStore.adjustments.crop.height) *
              100
            ).toFixed(2)}%; left: 0; right: 0; bottom: 0;`}
          ></div>
          <div
            class="absolute bg-black/60 pointer-events-none"
            style={`top: ${$imageStore.adjustments.crop.y * 100}%; left: 0; width: ${
              $imageStore.adjustments.crop.x * 100
            }%; height: ${$imageStore.adjustments.crop.height * 100}%;`}
          ></div>
          <div
            class="absolute bg-black/60 pointer-events-none"
            style={`top: ${$imageStore.adjustments.crop.y * 100}%; right: 0; width: ${
              (1 -
                ($imageStore.adjustments.crop.x +
                  $imageStore.adjustments.crop.width)) *
              100
            }%; height: ${$imageStore.adjustments.crop.height * 100}%;`}
          ></div>

          <!-- Crop box with rule of thirds grid -->
          <div
            class="absolute border-2 border-white shadow-lg"
            style={`top: ${$imageStore.adjustments.crop.y * 100}%; left: ${
              $imageStore.adjustments.crop.x * 100
            }%; width: ${$imageStore.adjustments.crop.width * 100}%; height: ${
              $imageStore.adjustments.crop.height * 100
            }%;`}
          >
            <!-- Rule of thirds grid -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="33.33%"
                y1="0"
                x2="33.33%"
                y2="100%"
                stroke="white"
                stroke-width="1"
                opacity="0.5"
              />
              <line
                x1="66.66%"
                y1="0"
                x2="66.66%"
                y2="100%"
                stroke="white"
                stroke-width="1"
                opacity="0.5"
              />
              <line
                x1="0"
                y1="33.33%"
                x2="100%"
                y2="33.33%"
                stroke="white"
                stroke-width="1"
                opacity="0.5"
              />
              <line
                x1="0"
                y1="66.66%"
                x2="100%"
                y2="66.66%"
                stroke="white"
                stroke-width="1"
                opacity="0.5"
              />
            </svg>

            <!-- Corner handles -->
            <div class="crop-handle crop-handle-tl" data-handle="tl"></div>
            <div class="crop-handle crop-handle-tr" data-handle="tr"></div>
            <div class="crop-handle crop-handle-bl" data-handle="bl"></div>
            <div class="crop-handle crop-handle-br" data-handle="br"></div>

            <!-- Edge handles -->
            <div class="crop-handle crop-handle-t" data-handle="t"></div>
            <div class="crop-handle crop-handle-b" data-handle="b"></div>
            <div class="crop-handle crop-handle-l" data-handle="l"></div>
            <div class="crop-handle crop-handle-r" data-handle="r"></div>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <EmptyState />
  {/if}
</div>

<style>
  .w-full {
    width: 100%;
  }

  .h-full {
    height: 100%;
  }

  .flex {
    display: flex;
  }

  .items-center {
    align-items: center;
  }

  .justify-center {
    justify-content: center;
  }

  .bg-surface-900 {
    background-color: var(--color-canvas);
  }

  .rounded-lg {
    border-radius: 8px;
  }

  .overflow-hidden {
    overflow: hidden;
  }

  .relative {
    position: relative;
  }

  .max-h-full {
    max-height: 100%;
  }

  .max-w-full {
    max-width: 100%;
  }

  .border {
    border-width: 1px;
  }

  .border-surface-700 {
    border-color: var(--color-border-subtle);
  }

  .cursor-crosshair {
    cursor: crosshair;
  }

  .absolute {
    position: absolute;
  }

  .top-0 {
    top: 0;
  }

  .left-0 {
    left: 0;
  }

  .inset-0 {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  canvas {
    image-rendering: pixelated;
  }

  .fit-canvas {
    max-width: 100%;
    max-height: calc(100vh - 200px);
    width: auto;
    height: auto;
    display: block;
    border-radius: 4px;
  }

  .crop-handle {
    position: absolute;
    background: white;
    border: 2px solid rgba(0, 0, 0, 0.5);
    cursor: pointer;
    z-index: 10;
    transition: all 150ms ease;
  }

  .crop-handle:hover {
    transform: scale(1.2);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }

  .crop-handle-tl {
    top: -6px;
    left: -6px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
  }
  .crop-handle-tr {
    top: -6px;
    right: -6px;
    width: 12px;
    height: 12px;
    cursor: nesw-resize;
  }
  .crop-handle-bl {
    bottom: -6px;
    left: -6px;
    width: 12px;
    height: 12px;
    cursor: nesw-resize;
  }
  .crop-handle-br {
    bottom: -6px;
    right: -6px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
  }
  .crop-handle-t {
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 8px;
    cursor: ns-resize;
  }
  .crop-handle-b {
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 8px;
    cursor: ns-resize;
  }
  .crop-handle-l {
    top: 50%;
    left: -4px;
    transform: translateY(-50%);
    width: 8px;
    height: 40px;
    cursor: ew-resize;
  }
  .crop-handle-r {
    top: 50%;
    right: -4px;
    transform: translateY(-50%);
    width: 8px;
    height: 40px;
    cursor: ew-resize;
  }

  .crop-handle-t:hover,
  .crop-handle-b:hover {
    transform: translateX(-50%) scaleY(1.2);
  }

  .crop-handle-l:hover,
  .crop-handle-r:hover {
    transform: translateY(-50%) scaleX(1.2);
  }
</style>
