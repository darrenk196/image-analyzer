<script lang="ts">
  import { currentImage, imageStore } from "$lib/stores/imageStore";
  import {
    posterizeImage,
    remapImageToPalette,
  } from "$lib/utils/imageProcessing";
  import { palettes } from "$lib/utils/palettes";
  import {
    generatePaintByNumbersLines,
    generatePaintByNumbersBlocks,
  } from "$lib/utils/paintByNumbers";

  let canvas: HTMLCanvasElement;
  let overlayCanvas: HTMLCanvasElement;
  let paintByNumbersCanvas: HTMLCanvasElement;
  let animationFrameId: number | null = null;

  $: if (canvas && $currentImage) {
    console.log("Drawing image:", $currentImage.width, $currentImage.height);
    drawImage();
  }

  $: if ($imageStore.valueSimplification.enabled && $currentImage) {
    // Schedule overlay update on next animation frame for smoothness
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(() => {
      drawValueSimplificationOverlay();
    });
  }

  $: if (
    $imageStore.valueSimplification.paintByNumbersEnabled &&
    $currentImage
  ) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(() => {
      drawPaintByNumbers();
    });
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
      canvas.width = $currentImage.width;
      canvas.height = $currentImage.height;

      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      const imageData = ctx.createImageData(
        $currentImage.width,
        $currentImage.height
      );
      const dataArray = new Uint8ClampedArray($currentImage.data);
      console.log(
        "Image data length:",
        dataArray.length,
        "Expected:",
        $currentImage.width * $currentImage.height * 4
      );
      imageData.data.set(dataArray);
      ctx.putImageData(imageData, 0, 0);
      console.log("Image drawn successfully");
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
</script>

<div
  class="w-full h-full flex items-center justify-center bg-surface-900 rounded-lg overflow-auto relative"
>
  {#if $currentImage}
    <div class="relative flex items-center justify-center">
      <canvas
        bind:this={canvas}
        on:wheel={handleWheel}
        class="border border-surface-700 cursor-crosshair"
        style="max-width: 100%; max-height: 100%; display: block;"
      ></canvas>
      {#if $imageStore.valueSimplification.enabled && !$imageStore.valueSimplification.paintByNumbersEnabled}
        <canvas
          bind:this={overlayCanvas}
          class="absolute top-0 left-0 border border-surface-700 cursor-crosshair"
          style="max-width: 100%; max-height: 100%; mix-blend-mode: normal; transition: opacity 0.2s ease;"
        ></canvas>
      {/if}
      {#if $imageStore.valueSimplification.paintByNumbersEnabled}
        <canvas
          bind:this={paintByNumbersCanvas}
          class="absolute top-0 left-0 border border-surface-700 cursor-crosshair"
          style="max-width: 100%; max-height: 100%; mix-blend-mode: normal; background: white;"
        ></canvas>
      {/if}
    </div>
  {:else}
    <div class="text-center text-surface-400">
      <p class="text-xl font-semibold">No image loaded</p>
      <p class="text-sm">Open an image to begin analysis</p>
    </div>
  {/if}
</div>

<style>
  canvas {
    image-rendering: pixelated;
  }
</style>
