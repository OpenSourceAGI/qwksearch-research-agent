"""
Web Dashboard for Real-time Metrics Visualization
Streamlit-based UI for monitoring Q&A training
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json
import requests
from pathlib import Path
from datetime import datetime, timedelta
import time

st.set_page_config(
    page_title="Q&A Training Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API endpoint
API_URL = "http://localhost:8080"

def fetch_metrics():
    """Fetch metrics from API"""
    try:
        response = requests.get(f"{API_URL}/metrics", timeout=5)
        if response.status_code == 200:
            return response.json().get('metrics', [])
    except:
        pass
    return []

def fetch_health():
    """Fetch health status"""
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return {}

def fetch_config():
    """Fetch configuration"""
    try:
        response = requests.get(f"{API_URL}/config", timeout=5)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return {}

def fetch_checkpoints():
    """Fetch checkpoints list"""
    try:
        response = requests.get(f"{API_URL}/checkpoints", timeout=5)
        if response.status_code == 200:
            return response.json().get('checkpoints', [])
    except:
        pass
    return []

# Header
st.title("🚀 Q&A Training Dashboard")
st.markdown("Real-time monitoring of SQuAD Q&A model training on AWS Fargate")

# Sidebar
with st.sidebar:
    st.header("Configuration")
    
    refresh_interval = st.slider("Refresh interval (seconds)", 5, 60, 10)
    
    config = fetch_config()
    if config:
        st.subheader("Current Settings")
        st.json(config)

# Auto-refresh
placeholder = st.empty()

while True:
    # Fetch data
    health = fetch_health()
    metrics = fetch_metrics()
    checkpoints = fetch_checkpoints()
    
    with placeholder.container():
        # Health Status
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Status", health.get('status', 'Unknown'))
        
        with col2:
            st.metric("Training Active", "Yes" if health.get('training_active') else "No")
        
        with col3:
            st.metric("Model Version", health.get('model_version', 'N/A'))
        
        with col4:
            st.metric("Last Updated", datetime.now().strftime("%H:%M:%S"))
        
        # Metrics section
        if metrics:
            st.subheader("📈 Training Metrics")
            
            # Convert to DataFrame
            df = pd.DataFrame(metrics)
            
            # Create tabs
            tab1, tab2, tab3, tab4 = st.tabs(["Score Progression", "Improvement", "Sample Quality", "Statistics"])
            
            with tab1:
                # Score over time
                fig = px.line(
                    df,
                    x=df.index,
                    y=['batch_score', 'best_score'],
                    title='Score Progression',
                    labels={'value': 'Score', 'index': 'Iteration'},
                    markers=True
                )
                st.plotly_chart(fig, use_container_width=True)
            
            with tab2:
                # Improvement trend
                fig = px.bar(
                    df,
                    x=df.index,
                    y='improvement',
                    title='Iteration Improvement',
                    labels={'improvement': 'Improvement', 'index': 'Iteration'},
                    color='improvement',
                    color_continuous_scale='RdYlGn'
                )
                st.plotly_chart(fig, use_container_width=True)
            
            with tab3:
                # Sample quality distribution
                fig = go.Figure()
                
                for idx in df.index[-5:]:  # Last 5 iterations
                    row = df.loc[idx]
                    fig.add_trace(go.Bar(
                        x=['High (>0.8)', 'Medium (0.5-0.8)', 'Low (<0.5)'],
                        y=[row.get('high_score_count', 0), 
                           row.get('medium_score_count', 0),
                           row.get('low_score_count', 0)],
                        name=f"Iter {idx}"
                    ))
                
                fig.update_layout(
                    title='Sample Quality Distribution (Last 5 Iterations)',
                    barmode='group',
                    xaxis_title='Score Range',
                    yaxis_title='Count'
                )
                st.plotly_chart(fig, use_container_width=True)
            
            with tab4:
                # Statistics
                stats = {
                    'Total Iterations': len(df),
                    'Latest Score': f"{df.iloc[-1].get('batch_score', 0):.4f}",
                    'Best Score': f"{df.iloc[-1].get('best_score', 0):.4f}",
                    'Avg Improvement': f"{df['improvement'].mean():.6f}",
                    'Max Improvement': f"{df['improvement'].max():.6f}",
                    'Min Improvement': f"{df['improvement'].min():.6f}",
                }
                
                for key, value in stats.items():
                    st.metric(key, value)
        
        # Checkpoints
        st.subheader("💾 Checkpoints")
        
        if checkpoints:
            checkpoint_df = pd.DataFrame(checkpoints)
            checkpoint_df['Size (MB)'] = checkpoint_df['size_mb'].apply(lambda x: f"{x:.2f}")
            st.dataframe(
                checkpoint_df[['name', 'Size (MB)', 'modified']],
                use_container_width=True,
                hide_index=True
            )
        else:
            st.info("No checkpoints available")
        
        # Dataset info
        st.subheader("📚 Dataset Information")
        
        dataset_info = health.get('dataset_info', {})
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric("Training Q&A Pairs", dataset_info.get('train_count', 'N/A'))
        
        with col2:
            st.metric("Evaluation Q&A Pairs", dataset_info.get('dev_count', 'N/A'))
        
        # Refresh indicator
        st.write(f"Last refresh: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Wait before refresh
    time.sleep(refresh_interval)
