"""
Prediction utilities for NYC 311 Noise Complaint system
"""

import pandas as pd
import numpy as np
import pickle
from datetime import datetime


def load_models(volume_path='models/complaint_volume_model.pkl',
                features_path='models/feature_columns.pkl'):
    with open(volume_path, 'rb') as f:
        volume_model = pickle.load(f)
    with open(features_path, 'rb') as f:
        feature_columns = pickle.load(f)
    return volume_model, feature_columns


def load_clean_data(path='data/processed/neighborhood_coordinates.csv'):
    df = pd.read_csv(path)
    df['Borough'] = df['Borough'].fillna('UNKNOWN').astype(str).str.strip()
    df = df[df['Borough'] != 'UNKNOWN']
    return df


def get_season(date):
    month = date.month
    return {
        12: 'Winter', 1: 'Winter', 2: 'Winter',
        3: 'Spring', 4: 'Spring', 5: 'Spring',
        6: 'Summer', 7: 'Summer', 8: 'Summer',
        9: 'Fall', 10: 'Fall', 11: 'Fall'
    }[month]


def predict_volume(borough, neighborhood, season, month, day_of_week, time_bucket,
                   volume_model, feature_columns):
    """
    Predict complaint volume for given parameters.
    Month should be an int (1-12), will be cast to string for one-hot encoding.
    """
    input_dict = {
        'Borough': borough,
        'Neighborhood': neighborhood,
        'Season': season,
        'Month': str(month),          # cast to str so get_dummies one-hot encodes it
        'Day_of_Week': day_of_week,
        'Time_Bucket': time_bucket,
    }
    input_data = pd.DataFrame([input_dict])
    X = pd.get_dummies(input_data, drop_first=False)

    for col in feature_columns:
        if col not in X.columns:
            X[col] = 0
    X = X[feature_columns]

    return float(volume_model.predict(X)[0])


def predict_from_date(borough, neighborhood, target_date, time_bucket,
                      volume_model, feature_columns):
    season = get_season(target_date)
    day_of_week = target_date.weekday()
    month = target_date.month

    return predict_volume(
        borough, neighborhood, season, month, day_of_week,
        time_bucket, volume_model, feature_columns
    )


def generate_weekly_pattern(borough, neighborhood, season, month,
                            volume_model, feature_columns):
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    times = ['morning', 'afternoon', 'evening', 'night', 'overnight']

    data = []
    for day_idx, day in enumerate(days):
        for time in times:
            volume = predict_volume(
                borough, neighborhood, season, month, day_idx, time,
                volume_model, feature_columns
            )
            data.append({'Day': day, 'Time': time, 'Volume': volume})

    return pd.DataFrame(data)


def get_risk_level(volume, threshold_high=20, threshold_medium=10):
    if volume > threshold_high:
        return "High"
    elif volume > threshold_medium:
        return "Medium"
    return "Low"