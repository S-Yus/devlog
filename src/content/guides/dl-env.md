---
title: "深層学習仮想環境作成手順"
description: "WSL: Ubuntuで深層学習用の仮想環境を最低限作成する手順"
publishedAt: 2026-08-05
status: verified
category: setup
tags:
  - Deep Learning
  - WSL
  - Ubuntu
  - venv
environment:
  - "Windows 11"
  - "WSL2 Ubuntu"
estimatedMinutes: 10
history:
  - at: "2026-08-05T23:26:08+09:00"
    summary: "初版公開"
  - at: "2026-08-07T06:28:21+09:00"
    summary: "カテゴリをセットアップへ変更"
  - at: "2026-08-07T22:43:43+09:00"
    summary: "本文の句読点を統一"
  - at: "2026-08-08T00:11:04+09:00"
    summary: "記事情報から難易度を削除"
draft: false
---

### 1. 仮想環境を作って有効化
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Pythonインタプリタを.venvにする
> 1. `Ctrl + Shift + P`
>
> 2. `Python: Select Interpreter` を選択
>
> 3. `.venv` を選択

### 3. pipを更新，CPU版でPyTorchを入れる
```bash
python -m pip install --upgrade pip
pip install torch torchvision torchaudio
```

### 4. 動作確認
`test_torch.py`を作成，
```python
import torch

print(torch.__version__)
print("cuda available:", torch.cuda.is_available())
x = torch.tensor([1.0, 2.0, 3.0])
print(x * 2)
```
実行:
```bash
python3 test_torch.py
```
```text
2.10.0+cu128
cuda available: True
tensor([2., 4., 6.])
```
などとなればOK.

### 5. ライブラリを追加
```bash
pip install numpy pandas matplotlib scikit-learn jupyter ipykernel
```

---
### 最小フォルダ構成例
```text
dl-test/
├── .venv/
├── data/
├── notebooks/
├── src/
│   └── train.py
├── test_torch.py
└── requirements.txt
```