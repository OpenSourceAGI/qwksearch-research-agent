#!/bin/bash
echo "🔧 Testing environment setup..."
echo "📦 Python version:"
python --version
echo "📦 Tinygrad test:"
python -c "from tinygrad.tensor import Tensor; print('✅ Tinygrad working:', Tensor([1,2,3]).numpy())"
echo "📦 Numpy test:"
python -c "import numpy as np; print('✅ Numpy working:', np.array([1,2,3]))"
echo "🎮 GPU check:"
python -c "
try:
    from tinygrad.runtime.ops_gpu import GPU
    print('✅ GPU support available')
except Exception as e:
    print('💻 GPU not available, using CPU mode')
"
echo "✅ Environment ready!"