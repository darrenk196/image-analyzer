<script lang="ts">
  import { imageStore, isProcessing } from "$lib/stores/imageStore";
  import { loadImage } from "$lib/api/imageApi";
  import { open } from "@tauri-apps/plugin-dialog";

  async function openImage() {
    try {
      const selected = await open({
        filters: [
          {
            name: "Image",
            extensions: ["png", "jpg", "jpeg", "gif", "webp"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        imageStore.setProcessing(true);
        try {
          const imageData = await loadImage(selected);
          imageStore.setImage(imageData);
        } catch (error) {
          console.error("Error loading image:", error);
          alert("Failed to load image. Make sure it's a valid image file.");
        }
        imageStore.setProcessing(false);
      }
    } catch (error) {
      console.error("Error opening file dialog:", error);
      imageStore.setProcessing(false);
    }
  }

  function selectTool(tool: typeof $imageStore.activeTool) {
    imageStore.setActiveTool(tool);
  }
</script>

<div class="flex flex-col gap-4 h-full bg-surface-800 p-4 rounded-lg">
  <h2 class="text-lg font-bold text-surface-50">Tools</h2>

  <button
    on:click={openImage}
    disabled={$isProcessing}
    class="btn variant-filled-primary w-full"
  >
    {$isProcessing ? "Loading..." : "📁 Open Image"}
  </button>

  <div class="divider"></div>

  <h3 class="text-sm font-semibold text-surface-200">Analysis Tools</h3>

  <button
    on:click={() => selectTool("adjustments")}
    class={`btn w-full text-left justify-start ${
      $imageStore.activeTool === "adjustments"
        ? "variant-filled-primary"
        : "variant-ghost"
    }`}
  >
    🛠️ Adjustments
  </button>

  <button
    on:click={() => selectTool("value-simplification")}
    class={`btn w-full text-left justify-start ${
      $imageStore.activeTool === "value-simplification"
        ? "variant-filled-primary"
        : "variant-ghost"
    }`}
  >
    🎨 Value Simplify
  </button>

  <button
    on:click={() => selectTool("grid")}
    class={`btn w-full text-left justify-start ${
      $imageStore.activeTool === "grid"
        ? "variant-filled-primary"
        : "variant-ghost"
    }`}
    disabled
  >
    🔲 Grid (Coming soon)
  </button>

  <button
    on:click={() => selectTool("measure")}
    class={`btn w-full text-left justify-start ${
      $imageStore.activeTool === "measure"
        ? "variant-filled-primary"
        : "variant-ghost"
    }`}
    disabled
  >
    📏 Measure (Coming soon)
  </button>

  <button
    on:click={() => selectTool("color-picker")}
    class={`btn w-full text-left justify-start ${
      $imageStore.activeTool === "color-picker"
        ? "variant-filled-primary"
        : "variant-ghost"
    }`}
    disabled
  >
    🎯 Color Picker (Coming soon)
  </button>
</div>

<style>
  .divider {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
