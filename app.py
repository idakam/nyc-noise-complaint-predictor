import streamlit as st
import pandas as pd
import numpy as np
from streamlit_folium import st_folium
from datetime import datetime, timedelta

import folium
from backend.src.prediction_utils import (
    load_models, 
    load_clean_data,
    get_season,
    predict_from_date,
    generate_weekly_pattern,
    create_hotspot_map,
    get_risk_level
)

# Page config
st.set_page_config(page_title="NYC 311 Noise Predictor", layout="wide")

# Load model and data
@st.cache_resource
def load_all_models():
    return load_models()

@st.cache_data
def load_all_data():
    return load_clean_data()

volume_model, feature_columns = load_all_models()
df = load_all_data()

# Sidebar
st.sidebar.title("NYC 311 Noise Complaint Predictor")
st.sidebar.markdown("**Predict complaint patterns based on historical data**")

tool = st.sidebar.radio("Select Tool:", ["Hotspot Map", "Weekly Pattern", "Date-Based Prediction"])

# Main content

if tool == "Hotspot Map":
    st.title("Noise Complaint Hotspot Map")
    st.markdown("Visualize expected high-complaint areas for a specific date and time.")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        target_date = st.date_input(
            "Select Date",
            value=datetime.now() + timedelta(days=7),
            min_value=datetime.now().date(),
            key="map_date"
        )
        target_date = datetime.combine(target_date, datetime.min.time())

    with col2:
        boroughs = sorted([b for b in df['Borough'].unique() if pd.notna(b) and b != 'UNKNOWN'])
        borough = st.selectbox("Borough", boroughs, key="map_borough")

    with col3:
        time_bucket = st.selectbox("Time of Day",
                                   ['morning', 'afternoon', 'evening', 'night', 'overnight'],
                                   key="map_time")

    with col4:
        season = get_season(target_date)
        day_name = target_date.strftime('%A')
        st.info(f"""
        **{day_name}**
        {season}
        """)

    if st.button("Generate Map", type="primary"):
        with st.spinner('Generating map...'):
            try:
                map_obj, predictions = create_hotspot_map(
                    borough, target_date, time_bucket, df,
                    volume_model, feature_columns
                )
                # Save HTML and predictions to session state
                st.session_state.map_html = map_obj._repr_html_()
                st.session_state.map_predictions = predictions
            except ValueError as e:
                st.error(str(e))
                st.session_state.pop('map_html', None)
                st.session_state.pop('map_predictions', None)

    # Render html hotspot map from session state 
    if 'map_html' in st.session_state:
        st.markdown("---")
        st.components.v1.html(st.session_state.map_html, width=1200, height=600, scrolling=False)

        st.subheader("Top 10 Expected High-Complaint Areas")
        top_predictions = sorted(st.session_state.map_predictions, key=lambda x: x['volume'], reverse=True)[:10]

        for i, p in enumerate(top_predictions, 1):
            col1, col2, col3 = st.columns([1, 3, 2])
            with col1:
                st.write(f"**#{i}**")
            with col2:
                st.write(p['location'])
            with col3:
                st.write(f"{p['volume']:.1f} complaints/week")

# Weekly Pattern  
elif tool == "Weekly Pattern":
    st.title("Weekly Complaint Pattern")
    
    st.markdown("View expected complaint patterns throughout a week for a specific neighborhood.")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        target_date = st.date_input(
            "Select Week Starting",
            value=datetime.now() + timedelta(days=7),
            min_value=datetime.now().date()
        )
        target_date = datetime.combine(target_date, datetime.min.time())
        target_date = target_date - timedelta(days=target_date.weekday())
    
    with col2:
        boroughs = sorted([b for b in df['Borough'].unique() if pd.notna(b) and b != 'UNKNOWN'])
        borough = st.selectbox("Borough", boroughs, key="weekly_borough")
        
        neighborhoods = df[df['Borough'] == borough]['Neighborhood'].dropna().unique()
        neighborhoods = sorted([n for n in neighborhoods if pd.notna(n)])
        
        if len(neighborhoods) == 0:
            st.error("No neighborhoods found for this borough")
            st.stop()
            
        neighborhood = st.selectbox("Neighborhood", neighborhoods, key="weekly_neighborhood")
    
    with col3:
        season = get_season(target_date)
        st.info(f"""
        **Week Info:**
        - Week of: {target_date.strftime('%B %d, %Y')}
        - Season: {season}
        """)
    
    if st.button("Generate Pattern", type="primary"):
        result = generate_weekly_pattern(
            borough, neighborhood, season,
            volume_model, feature_columns
        )
        
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        pivot = result.pivot(index='Time', columns='Day', values='Volume')
        pivot = pivot[days]
        
        week_total = result['Volume'].sum()
        
        st.markdown("---")
        
        st.metric("Total Expected Weekly Complaints", f"{week_total:.1f}")
        
        st.subheader("Hourly Pattern Throughout the Week")
        st.dataframe(
            pivot.style.background_gradient(cmap='YlOrRd', axis=None).format("{:.1f}"), 
            use_container_width=True
        )
        
        st.subheader("🔥 Top 5 Peak Times")
        result_sorted = result.sort_values('Volume', ascending=False).head(5)
        
        for idx, row in result_sorted.iterrows():
            col1, col2 = st.columns([3, 1])
            with col1:
                st.write(f"**{row['Day']} {row['Time'].capitalize()}**")
            with col2:
                st.write(f"{row['Volume']:.1f} complaints")

else:  # Date-Based Prediction
    st.title("Predict Noise Complaints for a Specific Date")
    
    st.markdown("Select a future date and time to see expected complaint volumes based on historical patterns.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        target_date = st.date_input(
            "Select Date",
            value=datetime.now() + timedelta(days=7),
            min_value=datetime.now().date()
        )
        target_date = datetime.combine(target_date, datetime.min.time())
        
        boroughs = sorted([b for b in df['Borough'].unique() if pd.notna(b) and b != 'UNKNOWN'])
        borough = st.selectbox("Borough", boroughs)
        
        neighborhoods = df[df['Borough'] == borough]['Neighborhood'].dropna().unique()
        neighborhoods = sorted([n for n in neighborhoods if pd.notna(n)])
        
        if len(neighborhoods) == 0:
            st.error("No neighborhoods found for this borough")
            st.stop()
        
        neighborhood = st.selectbox("Neighborhood", neighborhoods)
    
    with col2:
        time_bucket = st.selectbox("Time of Day", 
                                   ['morning', 'afternoon', 'evening', 'night', 'overnight'])
        
        season = get_season(target_date)
        day_name = target_date.strftime('%A')
        
        st.info(f"""
        **Date Info:**
        - Day: {day_name}
        - Season: {season}
        - Week of: {target_date.strftime('%B %d, %Y')}
        """)
    
    if st.button("Predict", type="primary"):
        volume = predict_from_date(
            borough, neighborhood, target_date, time_bucket,
            volume_model, feature_columns
        )
        
        st.markdown("---")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Predicted Complaints", f"{volume:.1f}")
        
        with col2:
            risk = get_risk_level(volume)
            emoji = "🔴" if risk == "High" else "🟡" if risk == "Medium" else "🟢"
            st.metric("Risk Level", f"{emoji} {risk}")
        
        with col3:
            lower = max(0, volume - 2.88)
            upper = volume + 2.88
            st.metric("Expected Range", f"{lower:.1f} - {upper:.1f}")
        
        st.markdown("---")
        st.info(f"""
        **Interpretation:** Based on historical patterns, we expect approximately **{volume:.1f} complaints** 
        in {neighborhood} during {time_bucket} hours on {day_name}s in {season}. 
        The typical range is {lower:.1f} to {upper:.1f} complaints for this time bucket.
        
        *Note: This prediction is based on historical patterns, with an average accuracy of ±2.9 complaints.*
        """)

# Footer
st.sidebar.markdown("---")
st.sidebar.markdown("""
**About this tool:**
- Based on 6+ years of historical NYC 311 data
- ML model accuracy: ±2.9 complaints/week
- Predictions based on neighborhood, day, season, and time patterns

""")