<script lang="ts">
  import { imageStore, isProcessing } from "$lib/stores/imageStore";
  import { loadImage, analyzeImage } from "$lib/api/imageApi";
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
        const imageData = await loadImage(selected);
        imageStore.setImage(imageData);

        const analysis = await analyzeImage(imageData);
        imageStore.setAnalysis(analysis);
        imageStore.setProcessing(false);
      }
    } catch (error) {
      console.error("Error loading image:", error);
      imageStore.setProcessing(false);
    }
  }
</script>

<div class="flex flex-col gap-4 h-full bg-surface-800 p-4 rounded-lg">
  <h2 class="text-lg font-bold text-surface-50">Tools</h2>

  <button
    on:click={openImage}
    disabled={$isProcessing}
    class="btn variant-filled-primary w-full"
  >
    {$isProcessing ? "Loading..." : "Open Image"}
  </button>

  <div class="divider"></div>

  <h3 class="text-sm font-semibold text-surface-200">Tools</h3>

  <button class="btn variant-ghost w-full text-left"> 📏 Measure </button>
  <button class="btn variant-ghost w-full text-left"> 🎨 Color Picker </button>
  <button class="btn variant-ghost w-full text-left"> 🔲 Grid </button>
  <button class="btn variant-ghost w-full text-left"> 👁️ Value Checker </button>
</div>

<style>
  .divider {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
