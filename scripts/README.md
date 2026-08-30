# 构建脚本

这些脚本面向从源码构建/运行 OpenWorker（本 fork，kael-odin/openworker）。

## install_deps.sh
创建 `.venv` 并安装 Python 后端依赖（含 messaging/dev extras）。
```bash
bash scripts/install_deps.sh
```
脚本内部 `cd` 到仓库根再 `pip install -e ".[messaging,dev]"`（git bash 下 extras 引号坑的解法）。

## tauri_dev.cmd
构建并运行 Tauri 桌面 app（Windows）。首次编译需 ~2-7 分钟。
```cmd
scripts\tauri_dev.cmd
```
它先 `call vcvars64.bat` 激活 VS 2026 BuildTools 的 MSVC + cmake 环境（whisper.cpp 编译需要），设 `LIBCLANG_PATH`（bindgen 需要，需先装 LLVM：`winget install LLVM.LLVM`），再 `npm run tauri dev`。

## 路径说明
脚本内的绝对路径（`D:\Github_Open\openworker\...`）是本机仓库路径。clone 到别处需自行改路径，或设 `COWORKER_SERVER_BIN` 等环境变量覆盖。

详见主 README 的「从源码运行」部分。
