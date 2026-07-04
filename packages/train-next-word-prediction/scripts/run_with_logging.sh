#!/bin/bash
echo "📊 Running transformer training with detailed logging..."
mkdir -p logs
python src/training/train_next_word_prediction.py 2>&1 | tee logs/training_$(date +%Y%m%d_%H%M%S).log
echo "📁 Log saved to logs/ directory"