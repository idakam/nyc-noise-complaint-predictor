"""
Prediction utilities for NYC 311 Noise Complaint system
Shared functions used by both Streamlit app and Jupyter notebooks
"""

import pandas as pd
import numpy as np
import pickle
import folium
from folium.plugins import HeatMap
from datetime import datetime

def load_models(volume_path='models/complaint_volume_model.pkl', 
                features_path='models/feature_columns.pkl'):
    """
    Load trained models and feature columns
    
    Returns:
        volume_model: Trained Random Forest Regressor
        feature_columns: List of feature column names
    """
    with open(volume_path, 'rb') as f:
        volume_model = pickle.load(f)
    with open(features_path, 'rb') as f:
        feature_columns = pickle.load(f)
    
    return volume_model, feature_columns

def load_clean_data(path='data/processed/neighborhood_coordinates.csv'):
    """
    Load neighborhood coordinate lookup
    
    Returns:
        df: DataFrame with Borough, Neighborhood, Latitude, Longitude
    """
    df = pd.read_csv(path)
    # Clean borough column
    df['Borough'] = df['Borough'].fillna('UNKNOWN').astype(str).str.strip()
    df = df[df['Borough'] != 'UNKNOWN']
    return df

def get_season(date):
    """
    Get season from a date
    
    Args:
        date: datetime object or date object
        
    Returns:
        str: Season name (Winter, Spring, Summer, Fall)
    """
    month = date.month
    season_map = {
        12: 'Winter', 1: 'Winter', 2: 'Winter',
        3: 'Spring', 4: 'Spring', 5: 'Spring',
        6: 'Summer', 7: 'Summer', 8: 'Summer',
        9: 'Fall', 10: 'Fall', 11: 'Fall'
    }
    return season_map[month]

def predict_volume(borough, neighborhood, season, day_of_week, time_bucket,
                   volume_model, feature_columns):
    """
    Predict complaint volume for given parameters
    
    Args:
        borough: str (e.g., 'BROOKLYN')
        neighborhood: str (e.g., 'Williamsburg')
        season: str (Winter, Spring, Summer, Fall)
        day_of_week: int (0=Monday, 6=Sunday)
        time_bucket: str (morning, afternoon, evening, night, overnight)
        volume_model: Trained volume prediction model
        feature_columns: List of feature column names
        
    Returns:
        float: Predicted complaint volume
    """
    input_dict = {
        'Borough': borough,
        'Neighborhood': neighborhood,
        'Season': season,
        'Day_of_Week': day_of_week,
        'Time_Bucket': time_bucket
    }
    input_data = pd.DataFrame([input_dict])
    X = pd.get_dummies(input_data, drop_first=False)
    
    # Align features
    for col in feature_columns:
        if col not in X.columns:
            X[col] = 0
    X = X[feature_columns]
    
    # Predict volume
    volume = volume_model.predict(X)[0]
    
    return volume

def predict_from_date(borough, neighborhood, target_date, time_bucket,
                     volume_model, feature_columns):
    """
    Predict complaints for a specific date
    
    Args:
        borough: str
        neighborhood: str
        target_date: datetime object
        time_bucket: str
        volume_model: Trained model
        feature_columns: List of features
        
    Returns:
        float: Predicted complaint volume
    """
    season = get_season(target_date)
    day_of_week = target_date.weekday()
    
    return predict_volume(borough, neighborhood, season, day_of_week, 
                         time_bucket, volume_model, feature_columns)

def generate_weekly_pattern(borough, neighborhood, season, 
                           volume_model, feature_columns):
    """
    Generate weekly complaint pattern for a neighborhood
    
    Args:
        borough: str
        neighborhood: str
        season: str
        volume_model: Trained model
        feature_columns: List of features
        
    Returns:
        DataFrame: Weekly pattern with Day, Time, Volume columns
    """
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    times = ['morning', 'afternoon', 'evening', 'night', 'overnight']
    
    data = []
    for day_idx, day in enumerate(days):
        for time in times:
            volume = predict_volume(
                borough, neighborhood, season, day_idx, time,
                volume_model, feature_columns
            )
            data.append({
                'Day': day,
                'Time': time,
                'Volume': volume
            })
    
    return pd.DataFrame(data)

def create_hotspot_map(borough, target_date, time_bucket, df,
                      volume_model, feature_columns,
                      save_path=None):
    """
    Create interactive hotspot map for a borough
    
    Args:
        borough: str
        target_date: datetime object
        time_bucket: str
        df: DataFrame with complaint data
        volume_model: Trained model
        feature_columns: List of features
        save_path: Optional path to save HTML map
        
    Returns:
        folium.Map: Interactive map object
        list: Predictions for each neighborhood
    """
    season = get_season(target_date)
    day_of_week = target_date.weekday()
    day_name = target_date.strftime('%A')
    
    # Get predictions for all neighborhoods
    borough_data = df[df['Borough'] == borough.upper()].copy()
    locations = borough_data['Neighborhood'].dropna().unique()
    locations = [l for l in locations if pd.notna(l)]
    
    predictions = []
    for location in locations:
        volume = predict_volume(
            borough.upper(), location, season, day_of_week, time_bucket,
            volume_model, feature_columns
        )
        
        locs = borough_data[borough_data['Neighborhood'] == location][['Latitude', 'Longitude']].dropna()
        if len(locs) > 0:
            predictions.append({
                'lat': locs['Latitude'].mean(),
                'lon': locs['Longitude'].mean(),
                'volume': volume,
                'location': location
            })
    
    if not predictions:
        raise ValueError(f"No data available for {borough}")
    
    # Create map
    center_lat = np.mean([p['lat'] for p in predictions])
    center_lon = np.mean([p['lon'] for p in predictions])
    
    m = folium.Map(location=[center_lat, center_lon], zoom_start=11)
    
    # Add heatmap
    heat_data = [[p['lat'], p['lon'], p['volume']] for p in predictions]
    HeatMap(heat_data, radius=15, blur=25, max_zoom=13).add_to(m)
    
    # Add markers
    max_volume = max([p['volume'] for p in predictions])
    for p in predictions:
        risk = 'High' if p['volume'] > max_volume * 0.7 else 'Medium' if p['volume'] > max_volume * 0.4 else 'Low'
        color = 'red' if risk == 'High' else 'orange' if risk == 'Medium' else 'green'
        
        popup_html = f"""
        <div style="font-family: Arial; font-size: 12px; min-width: 200px;">
            <b style="font-size: 14px;">{p['location']}</b><br>
            <hr style="margin: 5px 0;">
            <b>📅 Date:</b> {target_date.strftime('%B %d, %Y')}<br>
            <b>📊 Expected:</b> {p['volume']:.1f} complaints/week<br>
            <b>🔴 Risk:</b> <span style="color: {color};">{risk}</span><br>
            <b>⏰ Time:</b> {day_name}, {time_bucket}
        </div>
        """
        
        folium.CircleMarker(
            location=[p['lat'], p['lon']],
            radius=max(5, min(p['volume'] / 2, 20)),
            popup=folium.Popup(popup_html, max_width=300),
            color=color,
            fill=True,
            fillColor=color,
            fillOpacity=0.7
        ).add_to(m)
    
    # Add title overlay
    title_html = f'''
    <div style="position: fixed; 
                top: 10px; left: 50px; width: 500px; 
                background-color: white; border:2px solid grey; z-index:9999; 
                font-size:14px; padding: 15px; border-radius: 5px;">
    <h3 style="margin:0; color: #333;">🗺️ {borough} - {day_name}, {season}</h3>
    <p style="margin:5px 0; color: #666;">
        <b>Date:</b> {target_date.strftime('%B %d, %Y')}<br>
        <b>Time:</b> {time_bucket.capitalize()}<br>
   
    </p>
    </div>
    '''
    m.get_root().html.add_child(folium.Element(title_html))
    
    # Save if path provided
    if save_path:
        m.save(save_path)
        print(f"✓ Map saved to {save_path}")
    
    return m, predictions

def get_risk_level(volume, threshold_high=20, threshold_medium=10):
    """
    Determine risk level from complaint volume
    
    Args:
        volume: float, predicted complaint volume
        threshold_high: float, threshold for high risk
        threshold_medium: float, threshold for medium risk
        
    Returns:
        str: Risk level (High, Medium, Low)
    """
    if volume > threshold_high:
        return "High"
    elif volume > threshold_medium:
        return "Medium"
    else:
        return "Low"