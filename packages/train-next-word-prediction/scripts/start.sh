
#!/bin/bash

echo "🧠 ====================================================================="
echo "🚀 TRANSFORMER LANGUAGE MODEL TRAINING WITH TINYGRAD"
echo "🧠 ====================================================================="
echo ""
echo "📋 Available commands:"
echo "   🏃 python src/training/train_next_word_prediction.py          - Run basic training demo"
echo "   📊 python src/training/train_next_word_prediction.py | tee log.txt - Save training log"
echo "   🔧 python -c 'from tinygrad.tensor import Tensor; print(Tensor([1,2,3]))' - Test tinygrad"
echo "   📈 jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser --allow-root - Start Jupyter"
echo ""
echo "💡 Tips:"
echo "   • First run: Just execute 'python train_next_word_prediction.py'"
echo "   • GPU support: Tinygrad will auto-detect and use available GPUs"
echo "   • Modify hyperparameters in src/training/train_next_word_prediction.py for experiments"
echo "   • Check /app/logs/ for saved training outputs"
echo ""
echo "📚 Documentation:"
echo "   • README.md contains full usage instructions"
echo "   • Transformer paper: https://arxiv.org/abs/1706.03762"
echo "   • Tinygrad docs: https://docs.tinygrad.org/"
echo ""

# Check if GPU is available
python -c "
import subprocess
try:
    from tinygrad.runtime.ops_gpu import GPU
    print('🎮 GPU acceleration: Available')
except:
    print('💻 GPU acceleration: Not available (CPU mode)')
"

echo ""
echo "🎯 Ready to explore transformer architecture!"
echo "💡 Start with: python src/training/train_next_word_prediction.py"
echo ""