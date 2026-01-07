<script lang="ts">
  import { currentImage } from "$lib/stores/imageStore";

  let canvas: HTMLCanvasElement;

  $: if (canvas && $currentImage) {
    drawImage();
  }

  function drawImage() {
    if (!canvas || !$currentImage) return;

    canvas.width = $currentImage.width;
    canvas.height = $currentImage.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(
      $currentImage.width,
      $currentImage.height
    );
    imageData.data.set(new Uint8ClampedArray($currentImage.data));
    ctx.putImageData(imageData, 0, 0);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
  }
</script>

<div
  class="w-full h-full flex items-center justify-center bg-surface-900 rounded-lg overflow-auto"
>
  {#if $currentImage}
    <canvas
      bind:this={canvas}
      on:wheel={handleWheel}
      class="border border-surface-700 cursor-crosshair max-w-full max-h-full"
    ></canvas>
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
