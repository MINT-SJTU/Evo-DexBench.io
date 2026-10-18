# Evo-DexBench

Project website for **Evo-DexBench: Benchmarking Generalization across Related Tasks for Dexterous Manipulation**.

- Website address: https://mint-sjtu.github.io/Evo-DexBench.io/
- Paper: https://arxiv.org/abs/2610.21180
- Benchmark code: https://github.com/MINT-SJTU/Evo-DexBench
- Dataset: https://huggingface.co/collections/MINT-SJTU/evo-dexbench

## Publish with GitHub Pages

The complete website is committed to `main`. A repository administrator or maintainer must enable Pages in [Settings → Pages](https://github.com/MINT-SJTU/Evo-DexBench.io/settings/pages): select **Deploy from a branch**, then **main** and **/ (root)**, and click **Save**. GitHub will publish it at the website address above. The `.nojekyll` file keeps the site static; subsequent pushes to `main` update the website.

## Content

```text
Evo-DexBench.io/
├── index.html          # Project page
├── leaderboard.html    # Leaderboard and submissions
├── README.md
├── LICENSE
└── static/
    ├── css/            # Stylesheets
    ├── js/             # Application modules and vendor libraries
    ├── images/         # Branding, illustrations and scene previews
    ├── videos/         # Demonstrations and media manifests
    ├── models/         # Robot, camera and scene models
    ├── data/           # Published benchmark results
    └── fonts/          # Fonts and their licenses
```

The repository root remains the GitHub Pages publishing directory. Asset URLs are relative so the site works under `/Evo-DexBench.io/`.

Public result values reproduce arXiv:2610.21180v1. Unreported results remain blank. The 90 task-layout videos are served at 1280×720 and 30 fps. Candle-to-Cabinet L3 uses original 224×224 camera recordings shown side by side and upscaled; its source resolution is disclosed in the dialog. Other task-layout clips are native 720p simulation replays.

The footer's visitor count uses Busuanzi's site-level UV estimate. Local previews are excluded. Third-party libraries, fonts, and model attribution notices remain alongside their assets; consult those notices for their respective terms.

Project contact: sjtu8620588@sjtu.edu.cn. Leaderboard submissions: yzw758241@sjtu.edu.cn.
