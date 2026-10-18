# Evo-DexBench

Project website for **Evo-DexBench: Benchmarking Generalization across Related Tasks for Dexterous Manipulation**.

- Website: https://mint-sjtu.github.io/Evo-DexBench.io/
- Paper: https://arxiv.org/abs/2610.21180
- Benchmark code: https://github.com/MINT-SJTU/Evo-DexBench
- Dataset: https://huggingface.co/collections/MINT-SJTU/evo-dexbench

## Preview locally

This is a static website with no build step. Run from the repository root:

```sh
python -m http.server 8000
```

Open http://localhost:8000/. Use HTTP instead of opening the HTML file directly, because the page loads modules and JSON assets.

## Publish with GitHub Pages

In **Settings → Pages**, select **Deploy from a branch**, then **main** and **/ (root)**. The `.nojekyll` file keeps the site static. Subsequent pushes to `main` update the website.

## Content

`index.html` is the project page; `leaderboard.html` contains the leaderboard and submission instructions. Scripts and styles live at the root, and `assets/` contains fonts, videos, scene models, and data.

Public result values reproduce arXiv:2610.21180v1. Unreported results remain blank. The 90 task-layout videos are served at 1280×720 and 30 fps. Candle-to-Cabinet L3 uses original 224×224 camera recordings shown side by side and upscaled; its source resolution is disclosed in the dialog. Other task-layout clips are native 720p simulation replays.

The footer's visitor count uses Busuanzi's site-level UV estimate. Local previews are excluded. Third-party libraries, fonts, and model attribution notices remain alongside their assets; consult those notices for their respective terms.

Project contact: sjtu8620588@sjtu.edu.cn. Leaderboard submissions: yzw758241@sjtu.edu.cn.
