"""
Interactive Web UI Setup Wizard
Guides users through dataset selection, hardware configuration, and deployment
"""

import streamlit as st
from pathlib import Path
import json
from typing import Dict, Tuple
import requests

# Configure page
st.set_page_config(
    page_title="Q&A Training Setup Wizard",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .header-box { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
        color: white;
        margin-bottom: 20px;
    }
    .option-card {
        border: 2px solid #ddd;
        border-radius: 10px;
        padding: 15px;
        margin: 10px 0;
        cursor: pointer;
        transition: all 0.3s;
    }
    .option-card:hover {
        border-color: #667eea;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }
    .selected {
        border-color: #667eea;
        background: rgba(102, 126, 234, 0.05);
    }
    .stats-box {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
    }
    .warning-box {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px;
        border-radius: 5px;
        margin: 10px 0;
    }
    .success-box {
        background: #d4edda;
        border-left: 4px solid #28a745;
        padding: 15px;
        border-radius: 5px;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)


class SetupWizard:
    """Interactive setup wizard for Q&A training"""
    
    def __init__(self):
        self.init_session_state()
    
    def init_session_state(self):
        """Initialize session state"""
        if "step" not in st.session_state:
            st.session_state.step = 0
        if "config" not in st.session_state:
            st.session_state.config = {}
    
    def step_welcome(self):
        """Welcome step"""
        st.markdown("""
        <div class="header-box">
            <h1>🚀 Q&A Training Setup Wizard</h1>
            <p>Configure and launch your Q&A model training on local, cloud, or Fargate infrastructure</p>
        </div>
        """, unsafe_allow_html=True)
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Datasets", "2", "SQuAD + C4")
        with col2:
            st.metric("Presets", "10+", "Hardware Configs")
        with col3:
            st.metric("Deployments", "3", "Local/Docker/Fargate")
        
        st.write("### Getting Started")
        st.write("""
        This wizard will guide you through:
        1. **Dataset Selection** - Choose SQuAD or C4
        2. **Hardware Configuration** - Select CPU/GPU setup
        3. **Storage & Requirements** - Verify resources
        4. **Deployment** - Choose where to run
        5. **Review & Launch** - Start training
        """)
        
        col1, col2 = st.columns([1, 1])
        with col1:
            if st.button("🚀 Start Setup", key="start", use_container_width=True):
                st.session_state.step = 1
                st.rerun()


    def step_dataset_selection(self):
        """Dataset selection step"""
        st.header("📊 Step 1: Select Dataset")
        
        dataset_type = st.radio(
            "Choose dataset",
            ["SQuAD", "C4"],
            horizontal=True,
            captions=[
                "87K Q&A pairs (~100MB) - Fast training",
                "750B+ tokens (~5TB) - Production scale"
            ]
        )
        
        if dataset_type == "SQuAD":
            st.info("✅ SQuAD v1.1 - 87,599 Q&A pairs from Wikipedia")
            
            col1, col2 = st.columns(2)
            with col1:
                squad_version = st.selectbox(
                    "SQuAD Version",
                    ["1.1", "2.0"],
                    help="1.1 is simpler, 2.0 has unanswerable questions"
                )
            with col2:
                qa_limit = st.number_input(
                    "Q&A pairs (leave 0 for all)",
                    min_value=0,
                    max_value=100000,
                    value=0,
                    step=1000
                )
            
            st.session_state.config["dataset"] = "squad"
            st.session_state.config["dataset_version"] = squad_version
            st.session_state.config["qa_limit"] = qa_limit
            
            st.markdown("""
            <div class="stats-box">
                <b>Resource Requirements:</b><br>
                💾 Storage: ~100MB<br>
                🎮 GPU VRAM: 4GB minimum<br>
                ⏱️ Training Time: Hours to Days
            </div>
            """, unsafe_allow_html=True)
        
        else:  # C4
            st.info("✅ C4 Dataset - 750B+ tokens, multiple languages")
            
            col1, col2 = st.columns(2)
            with col1:
                c4_version = st.selectbox(
                    "C4 Version",
                    ["en (English only)", "multilingual (101 languages)"],
                    key="c4_version"
                )
            with col2:
                c4_subset = st.selectbox(
                    "Dataset Size",
                    ["1% sample", "10% sample", "Full dataset"],
                    help="Start small for testing"
                )
            
            subset_map = {
                "1% sample": "1pct",
                "10% sample": "10pct",
                "Full dataset": "full"
            }
            
            version_map = {
                "en (English only)": "en",
                "multilingual (101 languages)": "multilingual"
            }
            
            st.session_state.config["dataset"] = "c4"
            st.session_state.config["c4_version"] = version_map[c4_version]
            st.session_state.config["c4_subset"] = subset_map[c4_subset]
            
            c4_sizes = {
                ("en", "1pct"): {"storage": "50GB", "uncompressed": "500GB", "tokens": "5B"},
                ("en", "10pct"): {"storage": "75GB", "uncompressed": "5TB", "tokens": "75B"},
                ("en", "full"): {"storage": "750GB", "uncompressed": "5TB", "tokens": "750B"},
                ("multilingual", "1pct"): {"storage": "50GB", "uncompressed": "400GB", "tokens": "60B"},
                ("multilingual", "10pct"): {"storage": "500GB", "uncompressed": "4TB", "tokens": "600B"},
                ("multilingual", "full"): {"storage": "5TB", "uncompressed": "40TB", "tokens": "6T"},
            }
            
            size_key = (version_map[c4_version], subset_map[c4_subset])
            size_info = c4_sizes[size_key]
            
            st.markdown(f"""
            <div class="stats-box">
                <b>Resource Requirements:</b><br>
                💾 Storage: {size_info['storage']} (compressed), {size_info['uncompressed']} (uncompressed)<br>
                🎮 GPU VRAM: 16GB+ recommended<br>
                ⏱️ Training Time: Weeks to Months<br>
                📊 Tokens: {size_info['tokens']}
            </div>
            """, unsafe_allow_html=True)
            
            st.warning("⚠️ C4 is a large dataset. Ensure sufficient disk space and download bandwidth.")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("← Back", key="back1", use_container_width=True):
                st.session_state.step = 0
                st.rerun()
        with col3:
            if st.button("Next: Hardware →", key="next1", use_container_width=True):
                st.session_state.step = 2
                st.rerun()
    
    
    def step_hardware_selection(self):
        """Hardware configuration selection"""
        st.header("🖥️ Step 2: Select Hardware Configuration")
        
        preset_groups = {
            "CPU Only": [
                "cpu_small",
                "cpu_medium",
                "cpu_large"
            ],
            "Single GPU": [
                "gpu_v100_single",
                "gpu_a100_single",
                "gpu_h100_single"
            ],
            "Multi-GPU": [
                "gpu_a100_quad",
                "gpu_h100_quad",
                "gpu_h100_8"
            ]
        }
        
        # Import hardware presets
        from src.data.c4_dataset import HardwarePresets
        presets = HardwarePresets.PRESETS
        
        selected_preset = None
        
        for group_name, preset_names in preset_groups.items():
            st.subheader(group_name)
            
            cols = st.columns(3)
            for idx, preset_name in enumerate(preset_names):
                preset = presets.get(preset_name)
                if not preset:
                    continue
                
                col = cols[idx % 3]
                with col:
                    st.markdown(f"""
                    <div class="option-card">
                        <b>{preset['name']}</b><br>
                        <small>
                        💾 VRAM: {preset.get('gpu_vram_gb', preset.get('memory_gb', 'N/A'))}GB<br>
                        ⚡ Throughput: {preset['estimated_tokens_per_hour']:,} tokens/hr<br>
                        💰 Cost: ${preset['cost_per_hour']:.2f}/hr<br>
                        📦 Batch Size: {preset['batch_size']}
                        </small>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    if st.button(f"Select {preset_name}", key=f"preset_{preset_name}", use_container_width=True):
                        st.session_state.config["hardware_preset"] = preset_name
                        st.session_state.config["hardware"] = preset
                        selected_preset = preset_name
                        st.rerun()
        
        if st.session_state.config.get("hardware"):
            st.success(f"✅ Selected: {st.session_state.config['hardware']['name']}")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("← Back", key="back2", use_container_width=True):
                st.session_state.step = 1
                st.rerun()
        with col3:
            if st.button("Next: Verify →", key="next2", use_container_width=True):
                if st.session_state.config.get("hardware"):
                    st.session_state.step = 3
                    st.rerun()
                else:
                    st.error("Please select a hardware configuration")
    
    
    def step_requirements_verification(self):
        """Verify resources"""
        st.header("✅ Step 3: Verify Resources")
        
        dataset_info = st.session_state.config
        hardware = dataset_info.get("hardware", {})
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Dataset Requirements")
            if dataset_info.get("dataset") == "squad":
                st.write("- Dataset: SQuAD v" + str(dataset_info.get("dataset_version", "1.1")))
                st.write("- Storage: ~100MB")
                st.write("- Download Time: ~1 minute")
            else:
                st.write("- Dataset: C4 (" + dataset_info.get("c4_version", "en") + ")")
                st.write("- Subset: " + dataset_info.get("c4_subset", "full"))
                st.write("- Storage: Check disk space")
        
        with col2:
            st.subheader("Hardware Specs")
            st.write(f"- Config: {hardware.get('name', 'N/A')}")
            st.write(f"- CPU Cores: {hardware.get('cpu_cores', 'N/A')}")
            st.write(f"- GPU Count: {hardware.get('gpu_count', 'N/A')}")
            st.write(f"- Memory: {hardware.get('memory_gb', 'N/A')}GB")
        
        # Check disk space
        import shutil
        stat = shutil.disk_usage("/")
        free_gb = stat.free / (1024**3)
        
        st.subheader("System Status")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Free Disk Space", f"{free_gb:.1f}GB", "✅" if free_gb > 100 else "⚠️")
        with col2:
            st.metric("Network", "Connected", "✅")
        with col3:
            est_training_time = hardware.get('estimated_tokens_per_hour', 1_000_000)
            st.metric("Throughput", f"{est_training_time:,} tokens/hr", "📊")
        
        if free_gb < 100:
            st.warning(f"⚠️ Low disk space ({free_gb:.1f}GB). C4 requires significant storage.")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("← Back", key="back3", use_container_width=True):
                st.session_state.step = 2
                st.rerun()
        with col3:
            if st.button("Next: Deployment →", key="next3", use_container_width=True):
                st.session_state.step = 4
                st.rerun()
    
    
    def step_deployment(self):
        """Deployment selection"""
        st.header("🚀 Step 4: Select Deployment")
        
        deployment_options = {
            "local": {
                "name": "Local (Docker)",
                "description": "Run on your machine with Docker Compose",
                "pros": ["Full control", "Free", "Good for testing"],
                "cons": ["Limited by local hardware"],
                "setup_time": "5 minutes",
                "cost": "Your hardware"
            },
            "docker_swarm": {
                "name": "Docker Swarm",
                "description": "Multi-node cluster with Docker",
                "pros": ["Horizontal scaling", "Simple setup"],
                "cons": ["Manual management"],
                "setup_time": "30 minutes",
                "cost": "Your infrastructure"
            },
            "fargate": {
                "name": "AWS Fargate",
                "description": "Serverless container orchestration",
                "pros": ["Managed service", "Auto-scaling", "Pay per use"],
                "cons": ["AWS costs", "Account required"],
                "setup_time": "15 minutes",
                "cost": "$0.03-0.40/hour"
            },
            "custom": {
                "name": "Custom Cloud",
                "description": "GCP, Azure, or other cloud provider",
                "pros": ["Maximum flexibility"],
                "cons": ["Complex setup"],
                "setup_time": "1-2 hours",
                "cost": "Varies"
            }
        }
        
        cols = st.columns(2)
        for idx, (key, opt) in enumerate(deployment_options.items()):
            col = cols[idx % 2]
            with col:
                st.markdown(f"""
                <div class="option-card">
                    <b>{opt['name']}</b><br>
                    <small>{opt['description']}</small><br><br>
                    <b>✅ Pros:</b> {', '.join(opt['pros'])}<br>
                    <b>❌ Cons:</b> {', '.join(opt['cons'])}<br>
                    <b>⏱️ Setup:</b> {opt['setup_time']}<br>
                    <b>💰 Cost:</b> {opt['cost']}
                </div>
                """, unsafe_allow_html=True)
                
                if st.button(f"Select {opt['name']}", key=f"deploy_{key}", use_container_width=True):
                    st.session_state.config["deployment"] = key
                    st.rerun()
        
        if st.session_state.config.get("deployment"):
            st.success(f"✅ Selected: {deployment_options[st.session_state.config['deployment']]['name']}")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("← Back", key="back4", use_container_width=True):
                st.session_state.step = 3
                st.rerun()
        with col3:
            if st.button("Next: Review →", key="next4", use_container_width=True):
                if st.session_state.config.get("deployment"):
                    st.session_state.step = 5
                    st.rerun()
                else:
                    st.error("Please select a deployment option")
    
    
    def step_review_and_launch(self):
        """Final review and launch"""
        st.header("📋 Step 5: Review & Launch")
        
        config = st.session_state.config
        
        # Summary
        st.subheader("Configuration Summary")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Dataset**")
            if config.get("dataset") == "squad":
                st.write(f"- Type: SQuAD v{config.get('dataset_version')}")
                st.write(f"- Q&A Pairs: {config.get('qa_limit', 'All')}")
            else:
                st.write(f"- Type: C4 ({config.get('c4_version')})")
                st.write(f"- Subset: {config.get('c4_subset')}")
        
        with col2:
            st.markdown("**Hardware**")
            hw = config.get("hardware", {})
            st.write(f"- Preset: {hw.get('name')}")
            st.write(f"- Throughput: {hw.get('estimated_tokens_per_hour', 'N/A')} tokens/hr")
        
        st.divider()
        
        # Advanced options
        with st.expander("⚙️ Advanced Options"):
            col1, col2 = st.columns(2)
            with col1:
                auto_download = st.checkbox("Auto-download dataset", value=True)
                auto_train = st.checkbox("Auto-start training", value=False)
            with col2:
                model_type = st.selectbox("Model Type", ["mock", "transformers", "wikipedia"])
                training_mode = st.selectbox("Training Mode", ["sequential", "parallel", "async"])
            
            config["auto_download"] = auto_download
            config["auto_train"] = auto_train
            config["model_type"] = model_type
            config["training_mode"] = training_mode
        
        st.divider()
        
        # Launch buttons
        col1, col2, col3 = st.columns([1, 1, 2])
        
        with col1:
            if st.button("← Back", key="back5", use_container_width=True):
                st.session_state.step = 4
                st.rerun()
        
        with col3:
            if st.button("🚀 Launch Training", key="launch", use_container_width=True):
                st.success("✅ Setup complete! Launching training...")
                st.json(config)
                st.info("📊 Configuration has been sent to the API. Check the dashboard for updates.")
                
                # Save config
                config_file = Path("setup_config.json")
                with open(config_file, "w") as f:
                    json.dump(config, f, indent=2)
                
                st.success(f"Configuration saved to {config_file}")
    
    
    def run(self):
        """Run wizard"""
        self.init_session_state()
        
        step_methods = {
            0: self.step_welcome,
            1: self.step_dataset_selection,
            2: self.step_hardware_selection,
            3: self.step_requirements_verification,
            4: self.step_deployment,
            5: self.step_review_and_launch
        }
        
        # Progress bar
        steps = ["Welcome", "Dataset", "Hardware", "Resources", "Deployment", "Review"]
        progress = (st.session_state.step + 1) / len(steps)
        st.progress(progress, text=f"Step {st.session_state.step + 1} of {len(steps)}: {steps[st.session_state.step]}")
        
        # Run current step
        step_method = step_methods.get(st.session_state.step)
        if step_method:
            step_method()


# Run wizard
if __name__ == "__main__":
    wizard = SetupWizard()
    wizard.run()
